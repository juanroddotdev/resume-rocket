# VMS template tag registry (Phase A)

Source template: `server/assets/template.docx` (local, gitignored).  
Mapping code: `server/utils/docxBuilder.ts` → `mapCandidateToTemplateData()`.

Phase A maps **existing intake data only**. Tags listed under “Deferred” need Phase B (new intake fields) or Phase C (parse enrichment).

---

## Mapped from intake today

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
| `primary_specialty_unit` | First entry in `specialties[]` |
| `core_clinical_competencies` | `specialties[]` joined |
| `clinical_specialties_list` | `{#clinical_specialties_list}{.}` — `specialties[]` |
| `emr_software_proficiencies` | `emr_system` |
| `core_life_support_certifications` | Active keys in `credentials` (BLS, ACLS, PALS, etc.) |
| `BLS_certification_expiration_date` | `Current` if BLS checked (no expiry date collected) |
| `ACLS_certification_expiration_date` | `Current` if ACLS checked |
| `PALS_certification_expiration_date` | `Current` if PALS checked |
| `facility_types_trauma_levels` | Derived from employer trauma levels |
| `{#professional_experiences}...` | Each employer in `employers` JSONB |

### Inside `{#professional_experiences}`

| Tag | Source |
|-----|--------|
| `experience_hospital_name` | Employer `name` |
| `experience_facility_location` | Employer `city`, `state` |
| `experience_hospital_total_beds` | Employer `beds` |
| `experience_trauma_level` | Employer `traumaLevel` / `trauma_level` |
| `experience_facility_type` | Derived trauma label |
| `experience_unit_specialty` | Employer `role`, else first specialty |
| `experience_role_details` | Employer `role` |
| `experience_employment_dates` | `startDate` / `endDate` when present (parse prefill) |
| `experience_emr_system` | Candidate `emr_system` |
| `experience_is_teaching_facility` | `Yes`/`No` when employer linked from hospital search |

---

## Intentionally blank (Phase B / C)

| Template tag | Why blank |
|--------------|-----------|
| `total_years_nursing_experience` | Not collected in wizard |
| `compact_license_status` | Not collected |
| `average_patient_ratios` | Not collected |
| `specialized_medical_equipment` | Not collected |
| `{#education}...` | Education block not in intake |
| `experience_employment_type` | Not collected |
| `experience_unit_bed_count` | Not collected (unit-level beds) |
| `experience_patient_scope` | Not collected |
| `{#experience_floated_units_list}` | Not collected |
| `{#experience_equipment_procedures_list}` | Not collected |
| `experience_average_daily_patients` | Not collected |
| `experience_patient_acuity_level` | Not collected |
| `{#experience_highlights}` | Not collected |

Certifications **NIHSS**, **TNCC**, **CCRN** appear in `core_life_support_certifications` when checked, but have no separate expiration tags in the template (only BLS/ACLS/PALS).

---

## Verify locally

```bash
node scripts/test-docx-mapping.mjs
```

Writes `/tmp/resume-rocket-test.docx` and prints non-empty mapped fields. Open the DOCX to confirm layout.

After intake changes, re-run with a real submitted candidate via admin **Download DOCX**.
