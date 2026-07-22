# Hospital name combobox (eliminate duplicate facility entry)

**Status:** Planned  
**Related:** [Hospital parse UX](./TODO.md#hospital-parse-ux) (complete), PR #135 (link-strip Google UX)  
**Epic:** Part of #16  
**Phase:** B (intake UI) — reuses existing `hospitalMatch`, `/api/hospitals/search`, `linkEmployerFromHospital`

## Problem

Unlinked employer cards ask for the hospital name twice:

1. **Hospital name** (top of Facility & location)
2. **Link facility** search box (separate sub-card)

Recruiters and candidates already typed (or parse filled) the name. Re-typing to fetch beds/trauma/teaching is classic duplicate data entry. Mental model: “fill where they worked,” not “search a database.”

## Goal

**One source of truth:** `employer.name` (+ city/state).

- Typing or editing **Hospital name** drives DB autocomplete.
- Selecting a match links the facility and fills metrics (same as today’s link flow).
- Google verify uses name/city/state already on the card (no second search box).
- Remove the bulky **Link facility** sub-card.

Parse and manual paths use the same control (a string in the name field is a string).

## Non-goals

- Silent auto-link on every parse without confirmation (fuzzy wrong-links are worse than empty dropdowns).
- Changing list-level **add employer** search in `HospitalAutocomplete` (keep for *adding* jobs).
- New hospital DB fields or API shape (reuse search + match).
- Sticky-header / spacing work (shipped separately).

## Target UX

```
FACILITY & LOCATION

Hospital name                    City        State
┌─────────────────────────────┐  ┌────────┐  ┌────┐
│ Forest View Hospital        │  │ Grand… │  │ MI │
└─────────────────────────────┘  └────────┘  └────┘
  ▾ Forest View Hospital — Grand Rapids, MI (Trauma II · 108 beds)
    Mercy Health … 

Trauma level     Teaching     Magnet
[ Select… ▼ ]    [ Select… ]  [ Select… ]

💡 Missing facility stats?
   [ Verify "Forest View Hospital" on Google ↗ ]
```

### Behaviors

| State | Behavior |
| --- | --- |
| Unlinked, typing name (≥2 chars) | Debounced `/api/hospitals/search`; dropdown under name field |
| Select match | `linkEmployerFromHospital` → city/state/beds/trauma/teaching; clear suggestions; highlight DB metrics |
| Unlinked, free text (no select) | Name/city/state editable; trauma/teaching/magnet/beds manual; Google helper visible |
| Parse suggestions | Prefer chips/dropdown under name (reuse `hospitalSuggestions`); optional exact/high-score auto-link later |
| Linked | Metrics tiles + Magnet + **Change facility** (unlink → combobox again). Name not a free search until unlinked |
| Google | `facilityGoogleSearchUrl(employer)` from card fields; show helper when unlinked; emphasize when metrics empty or `showNoResults` equivalent |

## Implementation plan (stacked PRs)

### PR A — `FacilityNameCombobox` + wire into unlinked card

1. Extract/reuse `useHospitalSearch` into a combobox component (name input + results list + keyboard nav if cheap).
2. Replace plain Hospital name `<input>` on unlinked `EmployerCard` with combobox.
3. On select → existing `linkFromHospital`.
4. Keep **Link facility** card temporarily *or* remove in same PR if Google helper already moved under metadata (prefer remove in same PR to avoid two search UIs).

**Done when:** Typing in Hospital name shows DB matches; pick links; no second search box required.

### PR B — Google helper under metadata + remove link strip

1. Move Google CTA under trauma/teaching/magnet (quiet default; stronger when stats missing / no matches).
2. Delete Link facility sub-card and input-adjacent Google control from #135 path.
3. Update copy/tests for `facilityGoogleSearchUrl` (card fields only; drop live `searchQuery` if unused).

**Done when:** Vertical space reclaimed; Google still one click from card name/city/state.

### PR C — Parse / suggestions polish

1. Surface `hospitalSuggestions` under the name combobox (same list UI as live search).
2. Optional: auto-link only on exact (or scored) match; otherwise leave Select… + suggestions.
3. Manual test: parse-heavy vs manual-heavy profiles.

**Done when:** Parsed names never require re-typing to link; wrong-link risk stays low.

## Technical notes

- **Files:** `components/intake/EmployerCard.vue`, new `FacilityNameCombobox.vue` (or extend existing patterns), `utils/employerLink.ts`, `utils/facilityGoogleSearch.ts`, tests.
- **Linked edit:** Unlinking clears DB metrics via existing `unlinkEmployerFacility` / `clearEmployerDbMetrics`.
- **A11y:** Combobox `aria-expanded`, listbox, focus return after select; Google opens `noopener,noreferrer`.
- **Admin:** Same `EmployerCard` in admin builder — one implementation covers intake + admin.

## Test plan

- [ ] Manual add employer → type name in card → pick DB match → metrics fill; no second search box
- [ ] Free-text unknown facility → manual trauma/beds; Google verify uses name + city/state
- [ ] Parse with suggestions → pick suggestion under name; no re-type
- [ ] Linked → Change facility → combobox returns
- [ ] Admin builder employment section same behavior
- [ ] `node --test tests/facilityGoogleSearch.test.mjs` (and any new combobox unit tests)
- [ ] Core MVP: invite → employment → DOCX (`docs/MANUAL-TEST-CHECKLIST.md`)

## Out of scope / later

- `pg_trgm` tuning (TODO Hospital parse UX)
- Advanced Google query toggles (TODO)
- Merging list-level add search into the same combobox component (nice-to-have DRY after PR A)
