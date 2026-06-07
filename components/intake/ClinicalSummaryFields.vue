<script setup lang="ts">
const yearsNursingExperience = defineModel<string>('yearsNursingExperience', { default: '' })
const compactLicenseStatus = defineModel<string>('compactLicenseStatus', { default: '' })
const averagePatientRatios = defineModel<string>('averagePatientRatios', { default: '' })
const specializedMedicalEquipment = defineModel<string>('specializedMedicalEquipment', { default: '' })
</script>

<template>
  <div class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <p class="text-sm font-medium text-slate-800">Clinical summary</p>
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-slate-600">Years of nursing experience</span>
      <input
        id="intake-field-years_nursing_experience"
        v-model="yearsNursingExperience"
        type="text"
        inputmode="numeric"
        placeholder="e.g. 8"
        class="field"
      >
    </label>
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-slate-600">Compact license status</span>
      <select id="intake-field-compact_license_status" v-model="compactLicenseStatus" class="field">
        <option value="">Select…</option>
        <option value="Yes">Yes — compact/multistate</option>
        <option value="No">No</option>
        <option value="N/A">N/A</option>
      </select>
    </label>
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-slate-600">Average patient ratios</span>
      <input
        id="intake-field-average_patient_ratios"
        v-model="averagePatientRatios"
        type="text"
        placeholder="e.g. 1:4"
        class="field"
      >
    </label>
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-slate-600">Specialized medical equipment</span>
      <input
        id="intake-field-specialized_medical_equipment"
        v-model="specializedMedicalEquipment"
        type="text"
        placeholder="ECMO, CRRT…"
        class="field"
      >
    </label>
  </div>
</template>

<style scoped>
.field {
  @apply w-full rounded-lg border border-slate-300 px-3 py-3 text-base bg-white;
}
</style>
