🚀 Resume Rocket Pro — Client Feedback & Engineering Backlog

**GitHub epic:** [#97](https://github.com/juanroddotdev/resume-rocket/issues/97) · **Engineering backlog:** [TODO.md](./TODO.md)

This backlog contains the translation of client feedback clips (Clips 1-8) into structured, developer-ready implementation tickets. Tasks are prioritized by severity.
📊 Quick-View Progress Dashboard
* [ ] High Priority (0/2 Completed) — Core parsing errors and major keyboard interaction blocks.
* [ ] Medium Priority (0/5 Completed) — Input field expansions, logic swaps, and citation queries.
* [ ] Low Priority (0/4 Completed) — Styling touch-ups, label modifications, and redundant field removals.
🚨 HIGH SEVERITY ISSUES (Core Engine & Input Blockers)
🎫 FR-001: Charge Nurse & Preceptor Saving and Rendering Fix · GitHub [#98](https://github.com/juanroddotdev/resume-rocket/issues/98)
* Category: Data Parser & Payload Bug
* Severity: High (Blocks core compliance metrics)
* Client Clip Context: Clip 1"I didn't add any charge nurse experience or preceptor experience before, so I went back into his top job... and then I click, I had 'no' but I'll click 'yes', and I'll click 'yes' again... it's saying it's saving it, but it's not, or populating that."
* Technical Root Cause:
The frontend UI displays a standard transient "Saving..." notification on state toggle, but the database mutation hook or POST request payload serializer fails to register or map the updated boolean states (preceptorExperience / chargeNurseExperience). Because of this, the database row doesn't update, and the document compiler ignores these loops during final Word draft generations.
🛠️ Developer Checklist:
   * [ ] Audit the /api/candidates/save endpoint payload validator. Ensure charge_nurse_experience (boolean) and preceptor_experience (boolean) are explicitly typed and mapped in the database schema.
   * [ ] Inspect the client state management file (stores/candidate.js or equivalent) to confirm state variables bind correctly to the toggle input changes.
   * [ ] Verify that the document generator compiler loop parses these toggles to dynamically show or hide the "Charge Nurse Roles" and "Preceptor Actions" layout sub-blocks inside the .docx template.
🎫 FR-005: Fix Spacing & Keystroke Input Restraints in Form Fields · GitHub [#100](https://github.com/juanroddotdev/resume-rocket/issues/100)
   * Category: Form Interaction Bug
   * Severity: High (Blocks user input and slows down review)
   * Client Clip Context: Clip 2, 3, 8"it wasn't allowing me to add a space. Basically the functionality of this was a little off, so like 'ICU', space, it won't let me hit the space. I have to put a comma, I have to like type it in... as well as it won't let me go down and even hit enter."
   * Technical Root Cause:
Custom tags or multi-input components (e.g., "Floated Units" or "EMR Systems") use restrictive global keyboard event listeners (like .preventDefault() or custom keycode filtering). This event interception is leaking into textareas and standard text input fields, trapping the Spacebar (Space) and Enter keys.
🛠️ Developer Checklist:
      * [ ] Scan standard inputs and textareas for aggressive @keydown or @keypress prevent overrides.
      * [ ] Ensure that keycode filters (e.g., checking for Enter or Comma to append a tag chip) are restricted strictly to the dynamic tags component wrapper.
      * [ ] Ensure textarea components allow normal line-breaks (Enter) and spaces (Spacebar) without triggering layout submissions.
🟡 MEDIUM SEVERITY ISSUES (Workflow Improvements & Logic Swaps)
🎫 FR-002: EMR Platforms Selection Expansion & Custom 'Other' Input · GitHub [#102](https://github.com/juanroddotdev/resume-rocket/issues/102)
      * Category: Form Inputs & Extensibility
      * Severity: Medium (High usability impact)
      * Client Clip Context: Clip 2, 3"I just sent you an email to add a hell of a lot more EMR platforms... and then the bigger thing too, is to add 'other' because I'm thinking from a click-and-pick mode versus me just typing out... But on 'other', I need to be able to click 'other' and then type in what the other charting system is."
      * Technical Root Cause:
The current EMR select field is limited to basic defaults (Epic, Cerner, Meditech). Recruiters need a comprehensive selector option set, plus an "Other" option that toggles an input field for manual text entries.
🛠️ Developer Checklist:
         * [ ] Expand the default EMR option pool to include: Epic, Cerner / Millennium, Meditech, McKesson, Allscripts, CPSI, PointClickCare, AlayaCare, Homecare Homebase, MatrixCare.
         * [ ] Add an "Other" element to the dropdown dataset.
         * [ ] Implement a dynamic text box (v-if="selectedEmr === 'Other'") that renders underneath the select field, allowing manual input of custom software systems.
         * [ ] Ensure that when saving, the value of the custom input box is written to the candidate's EMR record array.
🎫 FR-007: Introduce 'Hospital Total Beds' Field in place of Patient Acuity · GitHub [#99](https://github.com/juanroddotdev/resume-rocket/issues/99) (bundled with FR-003)
         * Category: Form Inputs & Layout Revision
         * Severity: Medium (Changes structured data footprint)
         * Client Clip Context: Clip 5, 8"I had mentioned to get rid of patient acuity. Instead of there, what's missing is to have how many beds total at that facility... so that could be a place if it's easier to plug in for the patient acuity."
         * Technical Root Cause:
The data field "Patient Acuity" is being deprecated (see FR-003). To maintain layout balance without wasting space, this footprint must be replaced with "Hospital Total Beds" (which is crucial for VMS verification and tracking).
🛠️ Developer Checklist:
            * [ ] Add hospital_total_beds (integer/string) to the database schema.
            * [ ] Replace the "Patient Acuity" form input layout block with a new input field labeled "Hospital Total Beds".
            * [ ] Bind this new input field to the database parameter and ensure it is included in the .docx file rendering template mapping.
🎫 FR-009: Implement Profile Address Parsing and Remove Structural Header Labels · GitHub [#103](https://github.com/juanroddotdev/resume-rocket/issues/103)
            * Category: Data Parser Bug & Template Styling
            * Severity: Medium (Direct layout correctness)
            * Client Clip Context: Clip 7"Matthew had his home address on his resume and it did not pull on there... but for some reason it pulled in Naperville randomly. The other thing I noticed is I don't need it to say what it is on their title, so I don't need 'Name:', 'Email:', 'Phone number:', just as what it is."
            * Technical Root Cause:
            1. The Gemini parsing regex/prompt failed to extract the physical street address, falling back to a cached index location string (e.g., "Naperville").
            2. The Word template headers contain boilerplate labels (like Name: Jane Doe, Email: email@test.com). These labels look repetitive and clutter the unbranded resume aesthetic.
🛠️ Developer Checklist:
            * [ ] Refine the Gemini structural JSON extraction system prompt. Instruct the model to query, isolate, and output the physical home street address under candidate_address instead of falling back to default regions.
            * [ ] Open the master .docx template and delete hardcoded prefix labels like "Name:", "Email:", and "Phone:". Replace them with clean, direct curly bracket variables (e.g., {candidate_first_name} {candidate_last_name} and {candidate_email}).
🎫 FR-010: Fix Redundant Level 2 Trauma & Duplicate PICU RN Header Rendering · GitHub [#104](https://github.com/juanroddotdev/resume-rocket/issues/104) (bundled with FR-011)
            * Category: Draft Formatting & Rendering Bug
            * Severity: Medium (Direct visual defect in final document)
            * Client Clip Context: Clip 8"I noticed that level two trauma for some reason pulled up there, which it shouldn't... the other thing too, is like when if I'm... listing that he is a PICU RN... PICU, RN PICU... PICU in the details... that doesn't need to be twice."
            * Technical Root Cause:
Loops in the VMS resume builder compiler are mapping specific variables to incorrect heading slots. For example, the specific trauma level tag is rendering outside its target container, and redundant text strings (like "PICU") are double-rendering because the role title and specialty tags map to the same paragraph line.
🛠️ Developer Checklist:
               * [ ] Clean up the template compilation helper files. Ensure trauma_level points exclusively to the facility metrics block and is not leaked into global page headers.
               * [ ] Scrub role detail formatting. If the role title is "PICU RN", ensure the unit details line doesn't redundantly output "Unit: PICU" immediately below it (implement simple string matching deduplication).
🎫 FR-006: Refactor Google Search Optimization Query · GitHub [#101](https://github.com/juanroddotdev/resume-rocket/issues/101)
               * Category: Automated Integration
               * Severity: Medium (UX optimization)
               * Client Clip Context: Clip 4"I love this feature on the click in Google... but it just might need to be reformatted... whereas if when I went I just added trauma level, the hospital name, trauma level question mark, beds total question mark, teaching hospital question mark, it gave me all that."
               * Technical Root Cause:
The Google search helper helper function concatenates all search parameters into a flat, unbroken text query. This confuses search engine indexing, returning generic hospital landing pages instead of specific metrics.
🛠️ Developer Checklist:
                  * [ ] Update the search URL helper function in your UI component:
// Old implementation:
// `https://www.google.com/search?q=${hospitalName}+trauma+beds+teaching`

// New optimized structure:
const query = `${hospitalName} "trauma level" "total beds" "teaching hospital"`;
const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

                  * [ ] Test the link behavior on mobile and desktop viewports to ensure it opens a clean, target-focused search listing.
🟢 LOW SEVERITY ISSUES (Polishing & Content Refinements)
🎫 FR-003: Deprecate 'Patient Acuity' Field · GitHub [#99](https://github.com/juanroddotdev/resume-rocket/issues/99) (bundled with FR-007)
                     * Category: Form Inputs / Cleanup
                     * Severity: Low (Improves workspace space)
                     * Client Clip Context: Clip 2, 3"patient acuity, you could go ahead and delete this whole thing in its entirety, I don't really need that."
                     * Technical Root Cause:
This input field is redundant for recruiters and clutters the UI.
🛠️ Developer Checklist:
                        * [ ] Remove patient_acuity from form page fields in the template editor UI.
                        * [ ] Safely remove any reference variables to patient_acuity in the .docx document template to avoid compiler errors during exports.
🎫 FR-004: Rename 'Daily Average Patients' to 'Patient Ratio' · GitHub [#105](https://github.com/juanroddotdev/resume-rocket/issues/105)
                        * Category: Form Inputs / Label Revision
                        * Severity: Low (Clarifies form input intent)
                        * Client Clip Context: Clip 2, 3"daily average patients, instead of saying daily average patients, put patient ratio because daily average means how many did they see in its entirety versus patient ratio is how many patients did you have per, you know, who you watch on"
                        * Technical Root Cause:
The current label is confusing for clinical recruits. They interpret "Daily Average Patients" as total floor traffic instead of their direct nurse-to-patient ratio (e.g., 1:2 or 1:4).
🛠️ Developer Checklist:
                           * [ ] Locate the "Daily Average Patients" input label inside your form fields.
                           * [ ] Change the display text to "Patient Ratio".
                           * [ ] Update placeholder texts to show common examples (e.g., "e.g., 1:2 or 1:4" instead of numeric counts).
🎫 FR-008: Exclude 'Average Patient Ratios (Career-Wide)' from Clinical Summary · GitHub [#106](https://github.com/juanroddotdev/resume-rocket/issues/106)
                           * Category: Draft Formatting / Text Trim
                           * Severity: Low (Reduces clutter)
                           * Client Clip Context: Clip 6"Also for the clinical summary, at the end you can get rid of average patient ratios career-wide. I don't need that since they're going to be specific to the job and they're already going to be listed within each job that they worked."
                           * Technical Root Cause:
Displaying a career-wide average patient ratio in the introduction summary clutters the document header and is redundant since individual job cards already display precise ratios.
🛠️ Developer Checklist:
                              * [ ] Remove the global average patient ratio formula/rendering block from your resume's introductory profile summary block.
                              * [ ] Ensure the field remains active inside individual employment cards.
🎫 FR-011: Reorder 'Highlights' Placement below Unit Metrics blocks · GitHub [#104](https://github.com/juanroddotdev/resume-rocket/issues/104) (bundled with FR-010)
                              * Category: Draft Formatting / Layout Order
                              * Severity: Low (Improves visual hierarchy)
                              * Client Clip Context: Clip 8"And then highlights up here. If we could just move the highlights down to here so it's all in flow."
                              * Technical Root Cause:
The "Highlights" input text block prints before/above key unit metrics in the compiled document, breaking the standard reading flow of the work experience timeline.
🛠️ Developer Checklist:
                                 * [ ] Reorder the template's XML markup block. Shift the {experience_highlights} rendering parameter below the key numerical data points (Ratios, Beds, EMR).
                                 * [ ] Adjust the Vue editor UI so that the "Highlights" text area is positioned below these metrics fields, keeping the editor's visual flow matching the final printed layout.