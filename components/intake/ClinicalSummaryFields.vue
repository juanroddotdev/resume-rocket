<script setup lang="ts">
const yearsNursingExperience = defineModel<string>('yearsNursingExperience', { default: '' })
const averagePatientRatios = defineModel<string>('averagePatientRatios', { default: '' })
const specializedMedicalEquipment = defineModel<string>('specializedMedicalEquipment', { default: '' })

const { fieldClasses, clearParseHighlight } = useIntakePrefillHighlight()
</script>

<template>
  <div class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <p class="text-sm font-medium text-slate-800">Clinical summary</p>
    <label class="block">
      <span class="field-label-compact">Years of nursing experience</span>
      <input
        id="intake-field-years_nursing_experience"
        v-model="yearsNursingExperience"
        type="text"
        inputmode="numeric"
        placeholder="e.g. 8"
        :class="fieldClasses('years_nursing_experience')"
        @input="clearParseHighlight('years_nursing_experience')"
      >
    </label>
    <label class="block">
      <span class="field-label-compact">Average patient ratios (career-wide)</span>
      <input
        id="intake-field-average_patient_ratios"
        v-model="averagePatientRatios"
        type="text"
        placeholder="e.g. 1:4"
        :class="fieldClasses('average_patient_ratios')"
        @input="clearParseHighlight('average_patient_ratios')"
      >
      <span class="mt-1 block text-xs text-slate-500">
        Your typical nurse-to-patient ratio across roles — not per-hospital stats on Step 2.
      </span>
    </label>
    <label class="block">
      <span class="field-label-compact">Specialized medical equipment</span>
      <input
        id="intake-field-specialized_medical_equipment"
        v-model="specializedMedicalEquipment"
        type="text"
        placeholder="ECMO, CRRT…"
        :class="fieldClasses('specialized_medical_equipment')"
        @input="clearParseHighlight('specialized_medical_equipment')"
      >
    </label>
  </div>
</template>
