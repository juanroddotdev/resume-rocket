<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'

const props = defineProps<{
  employer: EmployerEntry
  index: number
}>()

const emit = defineEmits<{
  update: [value: EmployerEntry]
  remove: []
}>()

const showClinical = ref(false)

function patch(partial: Partial<EmployerEntry>) {
  emit('update', { ...props.employer, ...partial })
}

function linesToArray(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
}

function arrayToLines(values?: string[]) {
  return values?.join('\n') || ''
}
</script>

<template>
  <li class="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
    <div class="flex items-start justify-between gap-2">
      <div>
        <p class="font-medium text-slate-900">{{ employer.name }}</p>
        <p v-if="employer.city || employer.state" class="text-xs text-slate-500">
          {{ [employer.city, employer.state].filter(Boolean).join(', ') }}
        </p>
      </div>
      <button type="button" class="text-sm text-red-600 shrink-0" @click="emit('remove')">Remove</button>
    </div>

    <input
      :value="employer.role || ''"
      placeholder="Role / unit (e.g. ICU Staff RN)"
      class="field"
      @input="patch({ role: ($event.target as HTMLInputElement).value })"
    >

    <div class="grid grid-cols-2 gap-2">
      <input
        :value="employer.startDate || ''"
        placeholder="Start (YYYY-MM)"
        class="field"
        @input="patch({ startDate: ($event.target as HTMLInputElement).value })"
      >
      <input
        :value="employer.endDate || ''"
        placeholder="End (YYYY-MM or Present)"
        class="field"
        @input="patch({ endDate: ($event.target as HTMLInputElement).value })"
      >
    </div>

    <input
      :value="employer.employmentType || ''"
      placeholder="Employment type (Travel, Staff, PRN…)"
      class="field"
      @input="patch({ employmentType: ($event.target as HTMLInputElement).value })"
    >

    <input
      :value="employer.patientScope || ''"
      placeholder="Patient scope (e.g. adult ICU, pediatrics)"
      class="field"
      @input="patch({ patientScope: ($event.target as HTMLInputElement).value })"
    >
    <input
      :value="employer.patientAcuity || ''"
      placeholder="Patient acuity level"
      class="field"
      @input="patch({ patientAcuity: ($event.target as HTMLInputElement).value })"
    >
    <textarea
      :value="arrayToLines(employer.highlights)"
      placeholder="Highlights (one per line)"
      rows="3"
      class="field"
      @input="patch({ highlights: linesToArray(($event.target as HTMLTextAreaElement).value) })"
    />

    <button
      type="button"
      class="text-sm text-brand-700"
      @click="showClinical = !showClinical"
    >
      {{ showClinical ? 'Hide' : 'Add' }} optional unit details
    </button>

    <div v-if="showClinical" class="space-y-2 border-t border-slate-100 pt-2">
      <input
        :value="employer.unitBedCount || ''"
        placeholder="Unit bed count"
        class="field"
        @input="patch({ unitBedCount: ($event.target as HTMLInputElement).value })"
      >
      <input
        :value="employer.avgDailyPatients || ''"
        placeholder="Average daily patients"
        class="field"
        @input="patch({ avgDailyPatients: ($event.target as HTMLInputElement).value })"
      >
      <textarea
        :value="arrayToLines(employer.floatedUnits)"
        placeholder="Floated units (one per line)"
        rows="2"
        class="field"
        @input="patch({ floatedUnits: linesToArray(($event.target as HTMLTextAreaElement).value) })"
      />
      <textarea
        :value="arrayToLines(employer.equipmentProcedures)"
        placeholder="Equipment / procedures (one per line)"
        rows="2"
        class="field"
        @input="patch({ equipmentProcedures: linesToArray(($event.target as HTMLTextAreaElement).value) })"
      />
    </div>
  </li>
</template>

<style scoped>
.field {
  @apply w-full rounded-lg border border-slate-300 px-3 py-2 text-base;
}
</style>
