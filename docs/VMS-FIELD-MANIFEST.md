# VMS field manifest

Authoritative inventory of **contract** `server/assets/template.docx` tags (tracked in git).  
Reconciled with July 2026 template (Professional Snapshot) on 2026-07-11. Re-run after template edits:

```bash
node scripts/inventory-template-tags.mjs
```

**Counts:** 34 scalar tags, 4 loop regions (`licenses_list`, `certifications_list`, `education`, `professional_experiences`).  
Previous layout archived at [`server/assets/archive/template-pre-july-2026.docx`](../server/assets/archive/template-pre-july-2026.docx).

Mapping code: `server/utils/docxBuilder.ts` → `mapCandidateToTemplateData()`.  
Summary registry: [`VMS-TEMPLATE-REGISTRY.md`](VMS-TEMPLATE-REGISTRY.md) (may lag manifest — manifest wins for contract tags).

**Legend — fill status today**

| Status | Meaning |
|--------|---------|
| **Live** | Populated from intake or parse when data exists |
| **Derived** | Computed in docxBuilder from other fields |
| **Placeholder** | Builder key exists; value empty or stub until a later phase |
| **Parse-only** | Stored on row via parse; no wizard edit UI yet |
| **Template-removed** | Still collected in DB/wizard/parse; **not** rendered in current contract (supplemental bucket — Phase 4) |

**Legend — required at submit (target)**

| | Meaning |
|---|---------|
| **Yes** | Must be filled before VMS download (parse or wizard) |
| **No** | Optional in template or derived |
| **TBD** | Gap review rules pending snapshot / template-narrowing work |

---

## Canonical JSONB shapes (#11)

Server normalizes on parse write, PATCH ingress, and DOCX read via `server/utils/normalizeCandidate.ts`:

| Field | Canonical shape |
|-------|-----------------|
| `employers[]` | camelCase keys: `traumaLevel`, `teachingStatus`, `startDate`, `hospitalId`, … |
| `credentials` | `{ "BLS": { "active": true, "expiry?": "YYYY-MM-DD" } }` (booleans coerced on ingress) |
| `education[]` | `{ degree?, school?, graduationMonth?, graduationYear? }` — column `candidates.education` JSONB |
| `licenses[]` | `{ state?, number?, expiry? }` — column `candidates.licenses` JSONB; legacy scalar fallback |
| `years_nursing_experience` | `candidates.years_nursing_experience` TEXT — **template-removed**; feeds snapshot (Phase 2) |
| `compact_license_status` | `candidates.compact_license_status` TEXT — **template-removed** |
| `average_patient_ratios` | `candidates.average_patient_ratios` TEXT — **template-removed**; feeds snapshot (Phase 2) |
| `specialized_medical_equipment` | `candidates.specialized_medical_equipment` TEXT — **template-removed**; feeds snapshot (Phase 2) |
| `professional_snapshot` | `{ [snapshot_*]: { value, included, source?, sourceSnippet? } }` — column `candidates.professional_snapshot` JSONB |
| Extended `employers[]` | `employmentType`, `emrSystem`, `prnSchedule`, `unitBedCount`, `patientScope`, `floatedUnits[]`, `equipmentProcedures[]`, `avgDailyPatients`, `patientAcuity`, `highlights[]` — several **template-removed** at employer level |

Verify: `node scripts/test-normalize-candidate.mjs`

---

## Candidate identity

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `candidate_first_name` | `candidates.first_name` | Yes | 1 — Identity | Yes | Live |
| `candidate_last_name` | `candidates.last_name` | Yes | 1 — Identity | Yes | Live |
| `candidate_email` | `candidates.email` | Yes | 1 — Identity | Yes | Live |
| `candidate_phone` | `candidates.phone` | Yes | 1 — Identity | Yes | Live |
| `candidate_home_address` | `candidates.home_address` | Yes | 1 — Identity | No | Live |
| `candidate_city` | `candidates.home_city` | Yes | 1 — Identity | Yes | Live |
| `candidate_state` | `license_state` → else `home_state` | Partial | 1 / 3 | Yes | Live |

---

## License & credentials

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `{#licenses_list}...{/licenses_list}` | `licenses[]` → `rn_license_state_and_expiry` per row (`CA · RN-123 · 06/2027`) | Yes | 3 — Credentials | Yes | Live |
| `rn_license_state_and_expiry` | Inside `licenses_list` loop — formatted state · number · expiry | Yes | 3 — Credentials | Yes | Live |
| `{#certifications_list}...{/certifications_list}` | Active `credentials` keys → `certification_name`, `certification_expiration_date` | Yes | 3 — Credentials | Yes | Live |
| `certification_name` | Active credential key (loop) | Yes | 3 — Credentials | Yes | Live |
| `certification_expiration_date` | `credentials[key].expiry` or `Current` (loop) | Yes | 3 — Credentials | No | Live |

---

## Professional Snapshot

Static labels in Word; values from `snapshot_*` tags. **Phase 1:** docxBuilder stubs (empty). **Phase 2:** `professional_snapshot` JSONB + `buildProfessionalSnapshotFromCandidate()`. **Phase 4:** Gemini propose + admin include/edit.

| Template tag | Planned source | Parse (Gemini) | Wizard / admin | Required | Status |
|--------------|----------------|----------------|----------------|----------|--------|
| `snapshot_specialty` | `specialties[0]` | Partial | **Admin Snapshot section** (+ Reset from wizard) | TBD | Derived / Live |
| `snapshot_years_experience` | `years_nursing_experience` | Yes | Admin Snapshot | TBD | Derived / Live |
| `snapshot_travel_experience` | Travel contracts from `employers[]` | Partial | Admin Snapshot | TBD | Derived / Live |
| `snapshot_trauma_experience` | Union of `employers[].traumaLevel` | Partial | Admin Snapshot | TBD | Derived / Live |
| `snapshot_teaching_facility_experience` | Any `employers[].teachingStatus === true` | No (hospital DB) | Admin Snapshot | TBD | Derived / Live |
| `snapshot_magnet_facility_experience` | Resume / facility metadata | Yes (admin propose) | Admin Snapshot + Regenerate from resume | TBD | Live (propose) |
| `snapshot_charge_nurse_experience` | Any employer charge-nurse flag | Partial | Admin Snapshot | TBD | Derived / Live |
| `snapshot_preceptor_experience` | Any employer preceptor flag | Partial | Admin Snapshot | TBD | Derived / Live |
| `snapshot_float_experience` | Union of `employers[].floatedUnits[]` | Partial | Admin Snapshot | TBD | Derived / Live |
| `snapshot_emr_systems` | Union of `employers[].emrSystem` (fallback: `emr_system`) | No | Admin Snapshot | TBD | Derived / Live |
| `snapshot_patient_ratios_managed` | `average_patient_ratios` + per-employer scope | Partial | Admin Snapshot | TBD | Derived / Live |
| `snapshot_equipment_skills` | `specialized_medical_equipment` + equipment procedures | Partial | Admin Snapshot | TBD | Derived / Live |

Derivation: [`utils/professionalSnapshot.ts`](../utils/professionalSnapshot.ts) → `buildProfessionalSnapshotFromCandidate()`. Seeded on parse write; admin edits PATCH `professional_snapshot` (suppresses server auto-refresh while that field is sent). **Reset from wizard** re-derives. **Regenerate from resume** calls `POST /api/admin/candidates/:id/propose-snapshot` (Gemini proposals + `sourceSnippet`; never auto-include). DOCX uses stored snapshot when populated, else live derive. Only `included: true` lines render. Mismatch helpers: `computeSnapshotMismatches()`. Extra profile details: [`buildSupplementalBucket()`](../utils/supplementalBucket.ts) via admin non-modal right panel [`AdminExtraDetailsDrawer.vue`](../components/admin/AdminExtraDetailsDrawer.vue).

---

## Education (`{#education}...{/education}`)

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `education_degree` | `education[].degree` | Yes | 3 — Education | Yes | Live |
| `education_school_name` | `education[].school` | Yes | 3 — Education | Yes | Live |
| `education_graduation_year` | `education[].graduationMonth` + `graduationYear` (DOCX: MM/YYYY when month known, else YYYY) | Yes | 3 — Education | Yes | Live |

---

## Professional experience (`{#professional_experiences}...{/professional_experiences}`)

Slimmer than pre–July 2026 template. Per-job EMR, trauma, teaching, beds, and scope remain; employment type, role details, acuity, highlights, and float/equipment loops are **template-removed** (still collected — see below).

| Template tag | DB / JSON path | Parse (Gemini) | Wizard step | Required | Status |
|--------------|----------------|----------------|-------------|----------|--------|
| `experience_hospital_name` | `employers[].name` | Yes | 2 — Employment | Yes | Live |
| `experience_facility_location` | `employers[].city`, `state` | Partial | 2 — Employment | Yes | Live |
| `experience_hospital_total_beds` | `employers[].beds` | No (hospital DB) | 2 — Employment | No | Live |
| `experience_trauma_level` | `employers[].traumaLevel` | No (hospital DB) | 2 — Employment | No | Live |
| `experience_facility_type` | Derived trauma label (stub — empty in output) | — | — | No | Derived |
| `experience_unit_bed_count` | `employers[].unitBedCount` | Yes | 2 — Employer detail | No | Live |
| `experience_employment_dates` | `employers[].startDate`, `endDate` | Yes | 2 | Yes | Live |
| `experience_emr_system` | `employers[].emrSystem` (fallback: `candidates.emr_system`) | No | 2 — Employer card | Yes | Live |
| `experience_is_teaching_facility` | `employers[].teachingStatus` | No (hospital DB) | 2 — Employment | No | Live |
| `experience_patient_scope` | `employers[].patientScope` | Yes | 2 — Employer detail | Yes | Live |

---

## Collected but not in contract (supplemental bucket)

These tags remain in **parse**, **wizard**, and **`docxBuilder`** for now but do **not** appear in the July 2026 `template.docx`. Admin **Extra details** non-modal right panel: Copy / Apply-to-snapshot. Gap review no longer blocks submit on template-removed employment/clinical summary fields (see [TODO — New template](./TODO.md#new-template--professional-snapshot)).

| Former template tag | DB / JSON path | Still collected | Notes |
|---------------------|----------------|-----------------|-------|
| `{#active_licenses_list}{.}{/active_licenses_list}` | `licenses[]` | Yes | Superseded by `licenses_list` loop in July 2026 template |
| `compact_license_status` | `candidates.compact_license_status` | Yes | Supplemental / snapshot input |
| `core_life_support_certifications` | `credentials` active keys joined | Yes | Replaced by `certifications_list` loop in contract |
| `BLS_certification_expiration_date` | `credentials.BLS.expiry` | Yes | In `certifications_list` when BLS active |
| `ACLS_certification_expiration_date` | `credentials.ACLS.expiry` | Yes | In `certifications_list` when ACLS active |
| `PALS_certification_expiration_date` | `credentials.PALS.expiry` | Yes | In `certifications_list` when PALS active |
| `primary_specialty_unit` | `specialties[0]` | Yes | Feeds `snapshot_specialty` (Phase 2) |
| `core_clinical_competencies` | `specialties[]` joined | Yes | Supplemental |
| `{#clinical_specialties_list}{.}{/clinical_specialties_list}` | `specialties[]` | Yes | Supplemental |
| `total_years_nursing_experience` | `candidates.years_nursing_experience` | Yes | Feeds `snapshot_years_experience` |
| `average_patient_ratios` | `candidates.average_patient_ratios` | Yes | Feeds `snapshot_patient_ratios_managed` |
| `specialized_medical_equipment` | `candidates.specialized_medical_equipment` | Yes | Feeds `snapshot_equipment_skills` |
| `facility_types_trauma_levels` | Derived from `employers[].traumaLevel` | Yes | Trauma per employer + snapshot |
| `emr_software_proficiencies` | Union of `employers[].emrSystem` | Yes | Feeds `snapshot_emr_systems` |
| `experience_unit_specialty` | `employers[].role` → else `specialties[0]` | Yes | Supplemental |
| `experience_role_details` | `employers[].role` | Yes | Supplemental |
| `experience_employment_type` | `employers[].employmentType` | Yes | Supplemental |
| `experience_average_daily_patients` | `employers[].avgDailyPatients` | Yes | Supplemental |
| `experience_patient_acuity_level` | `employers[].patientAcuity` | Yes | Supplemental |
| `{#experience_floated_units_list}{.}{/experience_floated_units_list}` | `employers[].floatedUnits[]` | Yes | Feeds `snapshot_float_experience` |
| `{#experience_equipment_procedures_list}{.}{/experience_equipment_procedures_list}` | `employers[].equipmentProcedures[]` | Yes | Feeds `snapshot_equipment_skills` |
| `{#experience_highlights}{.}{/experience_highlights}` | `employers[].highlights[]` | Yes | Supplemental |

---

## Inventory diff

| Check | Result (2026-07-11) |
|-------|------------------------|
| All contract scalar tags in docxBuilder | Yes (35/35) |
| All contract loop tags in docxBuilder | Yes (3/3) |
| Builder keys not in contract | 22 (documented above — intentional until supplemental bucket) |
| DOCX smoke test (`test-docx-mapping.mjs`) | Pass — snapshot stubs in `OPTIONAL_EMPTY` until Phase 2 |
| DOCX template smoke (`smoke-docx-template.mjs`) | Pass — no `undefined`, no leftover `{tags}`; visual pass in Pages/LibreOffice per [`MANUAL-TEST-CHECKLIST.md`](./MANUAL-TEST-CHECKLIST.md) § I |

**Blank in output:** Snapshot lines empty until Phase 2. Other fields blank only when the candidate left data empty at submit. Cert expiries in loop render `Current` when no date entered.

---

## Next implementation steps

Phases 1–4 for Professional Snapshot are **shipped**. Remaining optional backlog:

1. **Parse QA snapshot evidence** (optional) — surface propose snippets in Parse QA tables
2. **Custom snapshot lines** — deferred until UAT demand
3. Packet layout presets — separate epic if needed

Status summary: [`VMS-FULL-COVERAGE-PLAN.md`](VMS-FULL-COVERAGE-PLAN.md). Historical build plan: [`archive/VMS-FULL-COVERAGE-PLAN-2026-05-EXECUTION.md`](./archive/VMS-FULL-COVERAGE-PLAN-2026-05-EXECUTION.md).
