<script setup lang="ts">
const yearsNursingExperience = defineModel<string>('yearsNursingExperience', { default: '' })
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
