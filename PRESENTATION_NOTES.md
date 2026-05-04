# Presentation Notes — Data Cleaning Pipeline

---

## Opening (30 seconds)

"This is a **data quality pipeline** built for cleaning and validating identity records — specifically demographic profiles like names, NINs, phone numbers, dates of birth, emails, and addresses. The problem it solves is simple: real-world datasets are messy. Records have typos, duplicates, missing fields, and formatting inconsistencies. This tool automates the detection, scoring, and correction of those issues."

---

## The Problem (1 minute)

"When organizations collect identity data — during enrollment, registration, or onboarding — the data comes in dirty. A single dataset might have:

- Names with invalid characters or wrong casing
- NINs that are too short or all zeros (placeholders)
- Phone numbers in 5 different formats
- Duplicate records for the same person
- Future dates of birth, or people listed as 150 years old

Manually reviewing thousands of records is expensive and error-prone. This pipeline automates that work."

---

## How It Works (2 minutes)

"When you upload a file — CSV, Excel, PDF, JSON, or plain text — it runs through **8 validation stages** automatically:

1. **Name validation** — strips titles, enforces title case, blocks placeholder values
2. **NIN validation** — must be exactly 11 digits, no repeating placeholders
3. **Phone normalization** — converts to Nigerian standard format, detects duplicates
4. **Date of birth** — normalizes formats, checks for future dates, validates age range
5. **Email validation** — fixes typos, blocks disposable domains, detects duplicates
6. **Deduplication** — exact match and fuzzy/near-match duplicate detection
7. **Address quality** — checks for minimum detail, Nigerian state coherence
8. **Cross-field checks** — gender vocabulary, email-name consistency, nationality-country match

Every rule generates a **violation** tagged with a severity: CRITICAL, ERROR, WARNING, or INFO."

---

## Scoring System

"Each record gets a **quality score from 0 to 100**. Violations deduct points:

- CRITICAL: −30 points
- ERROR: −10 points
- WARNING: −5 points
- INFO: −1 point

The score maps to a status:

| Score | Status      |
|-------|-------------|
| 90+   | CLEAN       |
| 70–89 | ACCEPTABLE  |
| 50–69 | REVIEW      |
| <50   | QUARANTINE  |

This lets analysts triage which records need immediate attention."

---

## Key Features

- **Auto-corrections** — many violations come with a suggested fix; analysts can accept or reject each one
- **Audit trail** — every change is logged with timestamp, old/new value, and which rule triggered it
- **Dashboard** — charts showing score distribution, violations by rule, severity breakdown, and a stage heatmap
- **Rules panel** — analysts can enable/disable any built-in rule or create custom rules with no code changes
- **Duplicate management** — side-by-side merge view for resolving duplicate records
- **Export** — PDF and Excel reports of results
- **OpenBQ integration** — optionally submits biometric files (fingerprints, face, iris, voice) to an ISO-standard quality assessment engine

---

## Tech Stack

"Frontend: **React + TypeScript**, styled with **Tailwind CSS**. Backend: lightweight **Express.js** API server that bridges to the OpenBQ CLI biometric tool. Bundled with **Vite** for fast development."

---

## Likely Questions & Answers

---

**Q: Why not just clean the data in Excel or with a Python script?**

This provides a repeatable, auditable pipeline with a UI. Non-technical analysts can use it without writing code, every decision is logged, and the rules are configurable without touching source files.

---

**Q: What is a NIN?**

National Identification Number — an 11-digit identifier used in Nigeria for citizen registration. The rules are specifically tailored to Nigerian identity record standards.

---

**Q: Can it handle large datasets?**

The pipeline runs client-side in the browser for parsing and rule evaluation, so performance scales with the user's device. For enterprise volumes, the architecture would move processing to the backend.

---

**Q: What's OpenBQ and why is it integrated?**

OpenBQ is an open-source biometric quality framework aligned with ISO/IEC 29794 standards. It assesses the quality of fingerprint, face, iris, and voice samples. The integration means you can check not just whether a record's text fields are valid, but also whether the associated biometric is of sufficient quality for matching.

---

**Q: How are duplicates detected?**

Two methods: exact match (identical field combinations) and fuzzy matching, which catches near-duplicates like slight name misspellings or transposed digits. Detected duplicates are flagged and surfaced in a dedicated merge view.

---

**Q: Can we add our own rules?**

Yes. The Rules page has a custom rule builder — you pick a target field, an operator (required, regex, min length, etc.), and a severity. It generates and registers the rule entirely from the UI without any backend changes.

---

**Q: What file formats does it accept?**

CSV, XLSX/XLS, PDF, JSON, plain text, and TSV.

---

**Q: How is the audit trail used?**

Every auto-correction, manual acceptance/rejection, merge, and biometric assessment is logged per record with a timestamp and the triggering rule ID. This supports compliance requirements and lets supervisors review analyst decisions.
