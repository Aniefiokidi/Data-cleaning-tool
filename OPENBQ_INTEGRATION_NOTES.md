# OpenBQ Integration Notes

Date: 2026-04-14

## What OpenBQ / bqConnect-CLI is
- `openbq` (bqConnect CLI) is a command-line entry point for the Open Biometric Quality Framework.
- It provides biometric quality assessment across multiple modalities.
- Supported modalities include face, fingerprint, iris, and voice.
- It is standards-oriented (ISO/IEC 29794 and related quality algorithms).

## Quick usage examples (from project docs)
- Install: `pip install openbq`
- Validate install: `openbq --benchmark`
- Run quality check: `openbq --mode face --input data/face`
- Generate report: `openbq --mode fingerprint --input data/fingerprint --report`

## Why it matters for this data-cleaning app
- Your current app validates textual/demographic records.
- OpenBQ adds biometric quality scoring (fingerprint and other biometrics), which is a separate but complementary quality signal.
- This can be integrated as an additional stage after record parsing.

## Suggested integration architecture
1. Frontend upload accepts biometric packages (images/audio/templates) and metadata.
2. Backend worker invokes `openbq` CLI per modality.
3. Store OpenBQ output (quality scores, flags, diagnostics) per record.
4. Merge biometric quality into the existing score engine as extra weighted penalties.
5. Display biometric quality widgets in dashboard and record detail modal.

## Proposed new pipeline stages
- Stage 10: Biometric quality ingestion
- Stage 11: OpenBQ evaluation
- Stage 12: Biometric-to-profile consistency checks

## Important implementation notes
- `openbq` requires Docker in documented prerequisites.
- Running CLI directly in browser is not possible; use a backend service/worker.
- Fingerprint/biometric file standards must be normalized before submission.
- Add audit entries for every biometric score and manual override.

## Minimum deliverables for first integration
- API endpoint: submit biometric files and receive OpenBQ results.
- Data model update: biometricQuality object per record.
- UI update: show modality-level score + pass/warn/fail badge.
- Rule engine update: include biometric penalties in final quality score.
