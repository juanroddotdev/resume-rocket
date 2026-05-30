<script setup lang="ts">
const yearsNursingExperience = defineModel<string>('yearsNursingExperience', { default: '' })
const compactLicenseStatus = defineModel<string>('compactLicenseStatus', { default: '' })
const averagePatientRatios = defineModel<string>('averagePatientRatios', { default: '' })
const specializedMedicalEquipment = defineModel<string>('specializedMedicalEquipment', { default: '' })
</script>

<template>
  <div class="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
    <p class="text-sm font-medium text-slate-800">Clinical summary</p>
    <input
      v-model="yearsNursingExperience"
      type="text"
      inputmode="numeric"
      placeholder="Total years of nursing experience"
      class="field"
    >
    <select v-model="compactLicenseStatus" class="field">
      <option value="">Compact license status…</option>
      <option value="Yes">Yes — compact/multistate</option>
      <option value="No">No</option>
      <option value="N/A">N/A</option>
    </select>
    <input
      v-model="averagePatientRatios"
      type="text"
      placeholder="Average patient ratios (e.g. 1:4)"
      class="field"
    >
    <input
      v-model="specializedMedicalEquipment"
      type="text"
      placeholder="Specialized equipment (ECMO, CRRT…)"
      class="field"
    >
  </div>
</template>

<style scoped>
.field {
  @apply w-full rounded-lg border border-slate-300 px-3 py-3 text-base bg-white;
}
</style>
