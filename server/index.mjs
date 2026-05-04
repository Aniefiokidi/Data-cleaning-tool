import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import cors from 'cors';
import express from 'express';
import multer from 'multer';

const app = express();
const PORT = Number(process.env.OPENBQ_PORT || 5050);
const OPENBQ_MODE = (process.env.OPENBQ_MODE || 'live').toLowerCase();
const OPENBQ_DOCKER_IMAGE =
  process.env.OPENBQ_DOCKER_IMAGE || 'ghcr.io/open-source-biometric-quality-framework/bqcore-service:latest';
const OPENBQ_DOCKER_SHM = process.env.OPENBQ_DOCKER_SHM || '8192MB';

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(os.tmpdir(), 'openbq-uploads')),
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`),
  }),
  limits: { fileSize: 25 * 1024 * 1024, files: 200 },
});

app.use(cors());
app.use(express.json({ limit: '25mb' }));

const statusFromScore = (score) => {
  if (score >= 75) return 'PASS';
  if (score >= 55) return 'WARN';
  return 'FAIL';
};

const normalizeModality = (value, fallback = 'fingerprint') => {
  const lowered = String(value || '').toLowerCase();
  if (['fingerprint', 'face', 'iris', 'voice'].includes(lowered)) return lowered;
  return fallback;
};

const modalityFromFileName = (name, fallback = 'fingerprint') => {
  const lowered = name.toLowerCase();
  if (lowered.includes('fingerprint') || lowered.includes('fp')) return 'fingerprint';
  if (lowered.includes('face')) return 'face';
  if (lowered.includes('iris')) return 'iris';
  if (lowered.includes('voice') || lowered.endsWith('.wav') || lowered.endsWith('.mp3')) return 'voice';
  return fallback;
};

const extractNumericScore = (stdout) => {
  const candidates = [
    /nfiq2?_score[^\d]{0,20}(\d{1,3}(?:\.\d+)?)/i,
    /quality\s*score[^\d]{0,20}(\d{1,3}(?:\.\d+)?)/i,
    /"score"\s*:\s*(\d{1,3}(?:\.\d+)?)/i,
  ];

  for (const regex of candidates) {
    const match = stdout.match(regex);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value)) return Math.max(0, Math.min(100, Math.round(value)));
  }

  return undefined;
};

const extractNumericFromObject = (value, keyHint = '') => {
  if (value == null) return undefined;
  const normalizedHint = keyHint.toLowerCase();
  const scoreLikeKey = /score|quality|nfiq|value/.test(normalizedHint);

  if (typeof value === 'number') {
    if (!scoreLikeKey) return undefined;
    if (Number.isFinite(value)) {
      if (/nfiq/.test(normalizedHint) && value >= 1 && value <= 5) {
        return Math.round(((6 - value) / 5) * 100);
      }
      return Math.max(0, Math.min(100, Math.round(value)));
    }
    return undefined;
  }

  if (typeof value === 'string') {
    if (!scoreLikeKey) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const percentMatch = trimmed.match(/(\d{1,3}(?:\.\d+)?)\s*%/);
    if (percentMatch) {
      const parsed = Number(percentMatch[1]);
      if (Number.isFinite(parsed)) return Math.max(0, Math.min(100, Math.round(parsed)));
    }

    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      if (parsed >= 0 && parsed <= 100) return Math.round(parsed);
      // Common biometric class scale (e.g., NFIQ 1-5): map to 0-100 for UI consistency.
      if (parsed >= 1 && parsed <= 5) return Math.round(((6 - parsed) / 5) * 100);
    }
    return undefined;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const extracted = extractNumericFromObject(item, keyHint);
      if (extracted !== undefined) return extracted;
    }
    return undefined;
  }

  if (typeof value === 'object') {
    const obj = value;
    const priorityKeys = ['score', 'quality', 'quality_score', 'nfiq2_score', 'nfiq', 'value'];
    for (const key of priorityKeys) {
      if (!(key in obj)) continue;
      const extracted = extractNumericFromObject(obj[key], key);
      if (extracted !== undefined) return extracted;
    }

    for (const [key, nested] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      if (/score|quality|nfiq|value/.test(keyLower)) {
        const extracted = extractNumericFromObject(nested, keyLower);
        if (extracted !== undefined) return extracted;
      }
    }

    // Continue traversing nested objects/arrays, but do not treat non-score primitive keys as score values.
    for (const [key, nested] of Object.entries(obj)) {
      if (nested && (Array.isArray(nested) || typeof nested === 'object')) {
        const extracted = extractNumericFromObject(nested, key);
        if (extracted !== undefined) return extracted;
      }
    }
  }

  return undefined;
};

const parseCsvLine = (line) => {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  out.push(current.trim());
  return out;
};

const toBoundedScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  return Math.max(0, Math.min(100, Math.round(parsed)));
};

const toBooleanLike = (value) => {
  if (value == null) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized || normalized === 'na' || normalized === 'n/a' || normalized === 'null') return undefined;
  if (['1', 'true', 'yes', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'n'].includes(normalized)) return false;
  return undefined;
};

const scoreFromOpenBqQualitySignals = (headers, cells) => {
  const row = Object.fromEntries(headers.map((header, idx) => [header, cells[idx] ?? '']));
  const hasSignalHeaders = [
    'quantized',
    'resampled',
    'uniform_image',
    'empty_image_or_contrast_too_low',
    'fingerprint_image_with_minutiae',
    'sufficient_fingerprint_foreground',
    'edge_std',
  ].some((header) => header in row);

  if (!hasSignalHeaders) return undefined;

  let score = 100;

  if (toBooleanLike(row.quantized) === true) score -= 20;
  if (toBooleanLike(row.resampled) === true) score -= 20;
  if (toBooleanLike(row.uniform_image) === true) score -= 30;
  if (toBooleanLike(row.empty_image_or_contrast_too_low) === true) score -= 40;
  if (toBooleanLike(row.fingerprint_image_with_minutiae) === false) score -= 30;
  if (toBooleanLike(row.sufficient_fingerprint_foreground) === false) score -= 30;

  const edgeStd = Number(row.edge_std);
  if (Number.isFinite(edgeStd)) {
    if (edgeStd < 1) score -= 20;
    else if (edgeStd < 3) score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

const extractScoreFromCsvText = (csvText) => {
  const lines = csvText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return { score: undefined, source: 'csv-empty' };

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const preferredHeader = headers.findIndex((header) => /score|quality|nfiq|value/.test(header));

  const extractFromPreferredHeader = (rawValue, headerName) => {
    const normalized = String(rawValue ?? '').trim().toLowerCase();
    if (!normalized || normalized === 'na' || normalized === 'n/a' || normalized === 'null') return undefined;

    if (/nfiq/.test(headerName)) {
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) {
        // NFIQ class 1..5 where 1 is best; convert to a 0..100 quality scale.
        if (parsed >= 1 && parsed <= 5) return Math.round(((6 - parsed) / 5) * 100);
      }
    }

    return toBoundedScore(normalized);
  };

  if (preferredHeader >= 0) {
    const preferredHeaderName = headers[preferredHeader];
    for (let i = 1; i < lines.length; i += 1) {
      const cells = parseCsvLine(lines[i]);
      const bounded = extractFromPreferredHeader(cells[preferredHeader], preferredHeaderName);
      if (bounded !== undefined) return { score: bounded, source: `csv:${preferredHeaderName}` };

      const derived = scoreFromOpenBqQualitySignals(headers, cells);
      if (derived !== undefined) return { score: derived, source: 'csv:derived-openbq-signals' };
    }
  }

  return { score: undefined, source: 'csv:no-score' };
};

const collectReportFiles = async (dir) => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectReportFiles(fullPath)));
      continue;
    }

    if (!entry.isFile()) continue;
    const lowered = fullPath.toLowerCase();
    if (lowered.endsWith('.csv') || lowered.endsWith('.json') || lowered.endsWith('.txt')) {
      files.push(fullPath);
    }
  }

  return files;
};

const extractScoreFromReportFiles = async (dir) => {
  const reportFiles = await collectReportFiles(dir);
  for (const filePath of reportFiles) {
    const lower = filePath.toLowerCase();
    const text = await fs.readFile(filePath, 'utf8');

    if (lower.endsWith('.csv')) {
      const csvResult = extractScoreFromCsvText(text);
      const score = csvResult.score;
      if (score !== undefined) {
        return {
          score,
          source: `${path.basename(filePath)} (${csvResult.source})`,
          fileCount: reportFiles.length,
        };
      }
      continue;
    }

    if (lower.endsWith('.json')) {
      try {
        const parsed = JSON.parse(text);
        const score = extractNumericFromObject(parsed);
        if (score !== undefined) {
          return { score, source: path.basename(filePath), fileCount: reportFiles.length };
        }
      } catch {
        // Ignore malformed JSON and continue scanning other files.
      }
      continue;
    }

    const score = extractNumericScore(text) ?? extractNumericFromObject(text);
    if (score !== undefined) {
      return { score, source: path.basename(filePath), fileCount: reportFiles.length };
    }
  }

  return { score: undefined, source: undefined, fileCount: reportFiles.length };
};

const runOpenBqDocker = ({ mode, inputPath, benchmark = false }) =>
  new Promise((resolve, reject) => {
    const args = ['run', '--rm', `--shm-size=${OPENBQ_DOCKER_SHM}`, '--entrypoint', 'python3'];

    if (!benchmark) {
      args.push('-v', `${inputPath}:/app/input`);
    }

    args.push(OPENBQ_DOCKER_IMAGE, '-m', 'openbq');
    if (benchmark) {
      args.push('--benchmark');
    } else {
      args.push('--input', 'input', '--output', 'input', '--mode', mode, '--report');
    }

    const proc = spawn('docker', args, { shell: false });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });
    proc.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      reject(new Error(stderr || `openbq exited with ${code}`));
    });
  });

const withTempInputDir = async (sourceFilePath, originalName) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openbq-file-'));
  const target = path.join(dir, originalName);
  await fs.copyFile(sourceFilePath, target);
  return { dir, target };
};

app.get('/api/biometrics/health', async (_req, res) => {
  if (OPENBQ_MODE !== 'live') {
    res.status(400).json({ ok: false, mode: OPENBQ_MODE, error: 'Set OPENBQ_MODE=live to run real OpenBQ.' });
    return;
  }

  try {
    await runOpenBqDocker({ benchmark: true });
    res.json({ ok: true, mode: OPENBQ_MODE, provider: 'openbq' });
  } catch (error) {
    res.status(500).json({ ok: false, mode: OPENBQ_MODE, provider: 'openbq', reason: String(error) });
  }
});

app.post('/api/biometrics/analyze', async (req, res) => {
  res.status(410).json({ error: 'Use /api/biometrics/analyze-files with real biometric files.' });
});

app.post('/api/biometrics/analyze-files', upload.array('files', 200), async (req, res) => {
  let records = [];
  try {
    records = JSON.parse(String(req.body?.records || '[]'));
  } catch {
    records = [];
  }

  if (!Array.isArray(records) || !records.length) {
    res.status(400).json({ error: 'records array is required in form field "records"' });
    return;
  }

  if (OPENBQ_MODE !== 'live') {
    res.status(400).json({ error: 'OPENBQ_MODE must be live for real biometric processing.' });
    return;
  }

  const files = Array.isArray(req.files) ? req.files : [];
  if (!files.length) {
    res.status(400).json({ error: 'At least one biometric file is required.' });
    return;
  }

  const defaultModality = normalizeModality(req.body?.modality, 'fingerprint');
  const now = new Date().toISOString();

  const byOriginalName = new Map(files.map((file) => [file.originalname, file]));
  const byRecordPrefix = new Map();
  const remainingFiles = [...files];

  files.forEach((file) => {
    const base = file.originalname.replace(/\.[^.]+$/, '');
    const [recordId] = base.split('__');
    if (!recordId) return;
    if (!byRecordPrefix.has(recordId)) byRecordPrefix.set(recordId, []);
    byRecordPrefix.get(recordId).push(file);
  });

  let explicitMapping = {};
  try {
    explicitMapping = JSON.parse(String(req.body?.mapping || '{}'));
  } catch {
    explicitMapping = {};
  }

  const assessments = [];
  for (const record of records) {
    const recordId = String(record?.id || '').trim();
    if (!recordId) continue;

    const mapping = explicitMapping[recordId];
    let file = null;
    let modality = defaultModality;

    if (mapping?.fileName && byOriginalName.has(mapping.fileName)) {
      file = byOriginalName.get(mapping.fileName);
      modality = normalizeModality(mapping.modality, modalityFromFileName(mapping.fileName, defaultModality));
    } else {
      const options = byRecordPrefix.get(recordId) || [];
      const byPrefix = options.find((candidate) => remainingFiles.includes(candidate));
      if (byPrefix) {
        file = byPrefix;
      } else {
        const byContains = remainingFiles.find((candidate) =>
          candidate.originalname.toLowerCase().includes(recordId.toLowerCase()),
        );
        file = byContains || remainingFiles[0] || null;
      }

      if (file) {
        modality = modalityFromFileName(file.originalname, defaultModality);
      }
    }

    if (!file) continue;
    const idx = remainingFiles.indexOf(file);
    if (idx >= 0) remainingFiles.splice(idx, 1);

    let score;
    let diagnostics;

    let tempDir;
    let openBqStdout;
    try {
      const wrapped = await withTempInputDir(file.path, file.originalname);
      tempDir = wrapped.dir;
      const { stdout, stderr } = await runOpenBqDocker({ mode: modality, inputPath: wrapped.dir });
      openBqStdout = stdout;
      score = extractNumericScore(stdout);

      let reportSource;
      if (score === undefined) {
        const reportResult = await extractScoreFromReportFiles(wrapped.dir);
        score = reportResult.score;
        reportSource = reportResult.source;
        if (score === undefined) {
          const errorDetails = [
            `report files scanned: ${reportResult.fileCount}`,
            stdout ? `stdout: ${stdout.slice(0, 250).replace(/\s+/g, ' ').trim()}` : '',
            stderr ? `stderr: ${stderr.slice(0, 250).replace(/\s+/g, ' ').trim()}` : '',
          ]
            .filter(Boolean)
            .join(' | ');
          throw new Error(`OpenBQ output did not include a parseable quality score. ${errorDetails}`);
        }
      }

      diagnostics = [
        `openbq evaluated ${file.originalname}`,
        ...(reportSource ? [`score parsed from ${reportSource}`] : []),
        ...(openBqStdout ? [openBqStdout.slice(0, 120)] : []),
      ];
    } catch (error) {
      await Promise.all(files.map((uploaded) => fs.unlink(uploaded.path).catch(() => undefined)));
      res.status(502).json({ error: `OpenBQ execution failed for ${file.originalname}: ${String(error)}` });
      return;
    } finally {
      if (tempDir) {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    }

    assessments.push({
      recordId,
      modality,
      score,
      status: statusFromScore(score),
      diagnostics,
      provider: 'openbq',
      assessedAt: now,
      sourceFile: file.originalname,
    });
  }

  await Promise.all(files.map((file) => fs.unlink(file.path).catch(() => undefined)));
  res.json({ provider: 'openbq', assessments });
});

await fs.mkdir(path.join(os.tmpdir(), 'openbq-uploads'), { recursive: true });

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`OpenBQ API listening on http://localhost:${PORT}`);
});
