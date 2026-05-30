# VMS template tag registry (Phase A complete)

Source template: `server/assets/template.docx` (local, gitignored).  
Mapping code: `server/utils/docxBuilder.ts` → `mapCandidateToTemplateData()`.

**Field manifest (contract inventory):** [`VMS-FIELD-MANIFEST.md`](VMS-FIELD-MANIFEST.md) — one row per tag with parse/wizard/required columns.

All contract tags are mapped from intake data collected in the wizard (Steps 2–4) or prefilled by Gemini parse (Step 3). Cert expiration tags use the stored expiry date when provided; otherwise they render empty (not `"Current"`).

---

## Mapped from intake

| Template tag | Source |
|--------------|--------|
| `candidate_first_name` | `candidates.first_name` |
| `candidate_last_name` | `candidates.last_name` |
| `candidate_email` | `candidates.email` |
| `candidate_phone` | `candidates.phone` |
| `candidate_city` | First employer `city` |
| `candidate_state` | `license_state`, else first employer `state` |
| `active_licenses_list` | `{#active_licenses_list}` — license state + number |
| `rn_license_state_and_expiry` | License state + number (formatted) |
| `compact_license_status` | `candidates.compact_license_status` |
| `total_years_nursing_experience` | `candidates.years_nursing_experience` |
| `average_patient_ratios` | `candidates.average_patient_ratios` |
| `specialized_medical_equipment` | `candidates.specialized_medical_equipment` |
| `primary_specialty_unit` | First entry in `specialties[]` |
| `core_clinical_competencies` | `specialties[]` joined |
| `clinical_specialties_list` | `{#clinical_specialties_list}{.}` — `specialties[]` |
| `emr_software_proficiencies` | `emr_system` |
| `core_life_support_certifications` | Active keys in `credentials` (BLS, ACLS, PALS, etc.) |
| `BLS_certification_expiration_date` | `credentials.BLS.expiry` when set |
| `ACLS_certification_expiration_date` | `credentials.ACLS.expiry` when set |
| `PALS_certification_expiration_date` | `credentials.PALS.expiry` when set |
| `facility_types_trauma_levels` | Derived from employer trauma levels |
| `{#education}...` | `education[]` — degree, school, graduation year |
| `{#professional_experiences}...` | Each employer in `employers` JSONB |

### Inside `{#education}`

| Tag | Source |
|-----|--------|
| `education_degree` | `education[].degree` |
| `education_school_name` | `education[].school` |
| `education_graduation_year` | `education[].graduationYear` |

### Inside `{#professional_experiences}`

| Tag | Source |
|-----|--------|
| `experience_hospital_name` | Employer `name` |
| `experience_facility_location` | Employer `city`, `state` |
| `experience_hospital_total_beds` | Employer `beds` |
| `experience_trauma_level` | Employer `traumaLevel` |
| `experience_facility_type` | Derived trauma label |
| `experience_unit_specialty` | Employer `role`, else first specialty |
| `experience_role_details` | Employer `role` |
| `experience_employment_dates` | `startDate` / `endDate` |
| `experience_employment_type` | Employer `employmentType` |
| `experience_unit_bed_count` | Employer `unitBedCount` |
| `experience_emr_system` | Candidate `emr_system` |
| `experience_is_teaching_facility` | `Yes`/`No` from hospital search |
| `experience_patient_scope` | Employer `patientScope` |
| `experience_average_daily_patients` | Employer `avgDailyPatients` |
| `experience_patient_acuity_level` | Employer `patientAcuity` |
| `{#experience_floated_units_list}` | Employer `floatedUnits[]` |
| `{#experience_equipment_procedures_list}` | Employer `equipmentProcedures[]` |
| `{#experience_highlights}` | Employer `highlights[]` |

Certifications **NIHSS**, **TNCC**, **CCRN** appear in `core_life_support_certifications` when checked, but have no separate expiration tags in the template (only BLS/ACLS/PALS).

---

## Verify locally

```bash
node scripts/inventory-template-tags.mjs
node scripts/test-docx-mapping.mjs
node scripts/test-normalize-candidate.mjs
```

`inventory-template-tags.mjs` scans the contract template and diffs tags vs `mapCandidateToTemplateData()`. Exit 0 = all tags have builder keys.

`test-docx-mapping.mjs` asserts a fully completed fixture populates all required manifest fields and writes `/tmp/resume-rocket-test.docx`. Open the DOCX to confirm layout.

After intake changes, re-run with a real submitted candidate via admin **Download DOCX**.
