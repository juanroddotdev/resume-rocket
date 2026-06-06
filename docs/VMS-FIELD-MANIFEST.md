# VMS field manifest

Authoritative inventory of **contract** `server/assets/template.docx` tags (tracked in git).  
Generated from template scan on 2026-05-30; re-run after template edits:

```bash
node scripts/inventory-template-tags.mjs
```

**Counts:** 37 scalar tags, 7 loop regions (3 nested inside `{#professional_experiences}`).

Mapping code: `server/utils/docxBuilder.ts` → `mapCandidateToTemplateData()`.  
Summary registry: [`VMS-TEMPLATE-REGISTRY.md`](VMS-TEMPLATE-REGISTRY.md).

**Legend — fill status today**

| Status | Meaning |
|--------|---------|
| **Live** | Populated from intake or parse when data exists |
| **Derived** | Computed in docxBuilder from other fields |
| **Placeholder** | Builder key exists; value always empty or stub (`Current`) until Phase B/C |
| **Parse-only** | Stored on row via parse; no wizard edit UI yet |

**Legend — required at submit (target)**

| | Meaning |
|---|---------|
| **Yes** | Must be filled before VMS download (parse or wizard) once expansion ships |
| **No** | Optional in template or derived |

---

## Canonical JSONB shapes (#11)

Server normalizes on parse write, PATCH ingress, and DOCX read via `server/utils/normalizeCandidate.ts`:

| Field | Canonical shape |
|-------|-----------------|
| `employers[]` | camelCase keys: `traumaLevel`, `teachingStatus`, `startDate`, `hospitalId`, … |
| `credentials` | `{ "BLS": { "active": true, "expiry?": "YYYY-MM-DD" } }` (booleans coerced on ingress) |
| `education[]` | `{ degree?, school?, graduationYear? }` — column `candidates.education` JSONB |
| `years_nursing_experience` | `candidates.years_nursing_experience` TEXT |
| `compact_license_status` | `candidates.compact_license_status` TEXT |
| `average_patient_ratios` | `candidates.average_patient_ratios` TEXT |
| `specialized_medical_equipment` | `candidates.specialized_medical_equipment` TEXT |
| Extended `employers[]` | `employmentType`, `unitBedCount`, `patientScope`, `floatedUnits[]`, `equipmentProcedures[]`, `avgDailyPatients`, `patientAcuity`, `highlights[]` |

Verify: `node scripts/test-normalize-candidate.mjs`

---

## Candidate identity

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `candidate_first_name` | `candidates.first_name` | Yes | 1 — Identity | Yes | Live |
| `candidate_last_name` | `candidates.last_name` | Yes | 1 — Identity | Yes | Live |
| `candidate_email` | `candidates.email` | Yes | 1 — Identity | Yes | Live |
| `candidate_phone` | `candidates.phone` | Yes | 1 — Identity | Yes | Live |
| `candidate_city` | `employers[0].city` | Partial (employers) | 2 — Employment | Yes | Live |
| `candidate_state` | `license_state` → else `employers[0].state` | Partial | 2 / 3 | Yes | Live |

---

## License & credentials

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `{#active_licenses_list}{.}{/active_licenses_list}` | `license_state` + `license_number` | Yes | 3 — Credentials | Yes | Live |
| `rn_license_state_and_expiry` | Same (formatted) | Yes | 3 — Credentials | Yes | Live |
| `compact_license_status` | `candidates.compact_license_status` | Yes | 3 — Summary | Yes | Live |
| `core_life_support_certifications` | `credentials` active keys | Partial | 3 — Credentials | Yes | Live |
| `BLS_certification_expiration_date` | `credentials.BLS.expiry` | Yes | 3 — Credentials | Yes | Live |
| `ACLS_certification_expiration_date` | `credentials.ACLS.expiry` | Yes | 3 — Credentials | Yes | Live |
| `PALS_certification_expiration_date` | `credentials.PALS.expiry` | Yes | 3 — Credentials | No | Live |

NIHSS, TNCC, CCRN contribute to `core_life_support_certifications` only; no separate expiration tags in contract template.

---

## Clinical summary

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `primary_specialty_unit` | `specialties[0]` | Yes | 2 — Employment | Yes | Live |
| `core_clinical_competencies` | `specialties[]` joined | Yes | 2 | Yes | Live |
| `{#clinical_specialties_list}{.}{/clinical_specialties_list}` | `specialties[]` | Yes | 2 | Yes | Live |
| `total_years_nursing_experience` | `candidates.years_nursing_experience` | Yes | 3 — Summary | Yes | Live |
| `average_patient_ratios` | `candidates.average_patient_ratios` | Yes | 3 — Summary | Yes | Live |
| `specialized_medical_equipment` | `candidates.specialized_medical_equipment` | Yes | 3 — Summary | Yes | Live |
| `facility_types_trauma_levels` | Derived from `employers[].traumaLevel` | Partial | 2 — Employment | No | Derived |
| `emr_software_proficiencies` | `candidates.emr_system` | No | 2 — Employment | Yes | Live |

---

## Education (`{#education}...{/education}`)

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `education_degree` | `education[].degree` | Yes | 3 — Education | Yes | Live |
| `education_school_name` | `education[].school` | Yes | 3 — Education | Yes | Live |
| `education_graduation_year` | `education[].graduationYear` | Yes | 3 — Education | Yes | Live |

---

## Professional experience (`{#professional_experiences}...{/professional_experiences}`)

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `experience_hospital_name` | `employers[].name` | Yes | 2 — Employment | Yes | Live |
| `experience_facility_location` | `employers[].city`, `state` | Partial | 2 — Employment | Yes | Live |
| `experience_hospital_total_beds` | `employers[].beds` | No (hospital DB) | 2 — Employment | No | Live |
| `experience_trauma_level` | `employers[].traumaLevel` | No (hospital DB) | 2 — Employment | No | Live |
| `experience_facility_type` | Derived trauma label | — | — | No | Derived |
| `experience_unit_specialty` | `employers[].role` → else `specialties[0]` | Partial | 2 | Yes | Live |
| `experience_role_details` | `employers[].role` | Partial | 2 | Yes | Live |
| `experience_employment_dates` | `employers[].startDate`, `endDate` | Yes | 2 | Yes | Live |
| `experience_employment_type` | `employers[].employmentType` | Yes | 2 — Employer card | Yes | Live |
| `experience_unit_bed_count` | `employers[].unitBedCount` | Yes | 2 — Employer detail | No | Live |
| `experience_emr_system` | `candidates.emr_system` | No | 2 — Employment | Yes | Live |
| `experience_is_teaching_facility` | `employers[].teachingStatus` | No (hospital DB) | 2 — Employment | No | Live |
| `experience_patient_scope` | `employers[].patientScope` | Yes | 2 — Employer detail | Yes | Live |
| `experience_average_daily_patients` | `employers[].avgDailyPatients` | Yes | 2 — Employer detail | No | Live |
| `experience_patient_acuity_level` | `employers[].patientAcuity` | Yes | 2 — Employer detail | Yes | Live |
| `{#experience_floated_units_list}{.}{/experience_floated_units_list}` | `employers[].floatedUnits[]` | Yes | 2 — Employer detail | No | Live |
| `{#experience_equipment_procedures_list}{.}{/experience_equipment_procedures_list}` | `employers[].equipmentProcedures[]` | Yes | 2 — Employer detail | No | Live |
| `{#experience_highlights}{.}{/experience_highlights}` | `employers[].highlights[]` | Yes | 2 — Employer detail | Yes | Live |

---

## Inventory diff (Step 0)

| Check | Result |
|-------|--------|
| All contract scalar tags in docxBuilder | Yes (37/37) |
| All contract loop tags in docxBuilder | Yes (7/7) |
| Tags in docxBuilder not in contract | None |
| DOCX smoke test (`test-docx-mapping.mjs`) | Pass — full fixture asserts required fields populated |

**Blank in output:** Only when the candidate left a field empty at submit (gap review blocks required gaps). Cert expiries render empty when no date was entered.

---

## Next implementation steps

1. ~~**Step 1** — JSONB normalization (`#11`)~~
2. ~~**Step 2** — DB columns + `education` JSONB + extended `employers` shape~~
3. ~~**Step 3** — Gemini schema for all parse rows~~
4. ~~**Step 4** — Wizard UI + gap review for Required rows~~
5. ~~**Step 5** — Replace placeholders with real values in docxBuilder~~
6. **Step 6** — Hardening sprint (#12–#15) — parse logging, rate limits, CI, release checklist

See [`VMS-FULL-COVERAGE-PLAN.md`](VMS-FULL-COVERAGE-PLAN.md).
