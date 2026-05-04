# Data Cleaning Rules List

This file lists all active built-in data quality rules currently used by the pipeline.

## Stage 1: Name validation
- NAME-001: Strip title prefixes
- NAME-002: Block invalid characters
- NAME-003: Title case enforcement
- NAME-004: Required non-placeholder values

## Stage 2: NIN validation
- NIN-001: NIN must be exactly 11 digits
- NIN-002: NIN must be numeric only
- NIN-003: Block placeholder NIN values

## Stage 3: Phone validation
- PHONE-001: Normalize and validate Nigerian format
- PHONE-002: Block repeated digit placeholders
- PHONE-003: Cross-record duplicate phone detection

## Stage 4: DOB normalization
- DOB-001: Normalize DOB formats
- DOB-002: Future date check
- DOB-003: Age bounds validation

## Stage 5: Email validation
- EMAIL-001: Email formatting and typo fixes
- EMAIL-002: Disposable email domains
- EMAIL-003: Cross-record duplicate email

## Stage 6: Deduplication
- DEDUP-001: Exact duplicate detection
- DEDUP-003: Fuzzy duplicate detection

## Stage 7: Address quality
- ADDR-001: Address required
- ADDR-002: State required
- ADDR-003: Country must be Nigeria
- ADDR-004: Address minimum detail check
- ADDR-005: Nationality required
- ADDR-006: State and address coherence check

## Stage 8: Cross-field checks
- CROSS-001: Gender vocabulary validation
- CROSS-002: Email-name consistency
- CROSS-003: NIN must exist for adult records
- CROSS-004: Nationality-country coherence

## Notes
- Rules can now be configured from the frontend Rules page.
- Analysts can add custom rules directly from the UI without backend code changes.
