<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import type { HospitalRow, HospitalSuggestion } from '~/types/hospital'
import { linkEmployerFromHospital, unlinkEmployerFacility } from '~/utils/employerLink'

const props = defineProps<{
  employer: EmployerEntry
  index: number
}>()

const emit = defineEmits<{
  update: [value: EmployerEntry]
  remove: []
}>()

const showClinical = ref(false)
const showLinkSearch = ref(false)
const { query, results, searching, searchError, showNoResults, clearSearch } = useHospitalSearch()

const isLinked = computed(() => Boolean(props.employer.hospitalId))

function patch(partial: Partial<EmployerEntry>) {
  emit('update', { ...props.employer, ...partial })
}

function linkFromHospital(hospital: HospitalRow | HospitalSuggestion) {
  emit('update', linkEmployerFromHospital(props.employer, hospital))
  showLinkSearch.value = false
  clearSearch()
}

function startChangeFacility() {
  emit('update', unlinkEmployerFacility(props.employer))
  showLinkSearch.value = true
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

    <div v-if="isLinked" class="flex flex-wrap gap-1.5">
      <span
        v-if="employer.beds != null"
        class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
      >
        {{ employer.beds }} beds
      </span>
      <span
        v-if="employer.traumaLevel"
        class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
      >
        Trauma {{ employer.traumaLevel }}
      </span>
      <span
        v-if="employer.teachingStatus"
        class="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700"
      >
        Teaching
      </span>
      <button type="button" class="text-xs text-brand-700 underline" @click="startChangeFacility">
        Change facility
      </button>
    </div>

    <template v-else>
      <p class="text-xs text-slate-600">
        Link facility for bed count &amp; trauma (recommended)
      </p>

      <div v-if="employer.hospitalSuggestions?.length" class="space-y-1">
        <p class="text-xs font-medium text-slate-700">Suggested matches</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="suggestion in employer.hospitalSuggestions"
            :key="suggestion.id"
            type="button"
            class="rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-left text-xs text-brand-900 hover:bg-brand-100"
            @click="linkFromHospital(suggestion)"
          >
            {{ suggestion.name }}
            <span v-if="suggestion.city" class="text-slate-500"> — {{ suggestion.city }}, {{ suggestion.state }}</span>
          </button>
        </div>
      </div>

      <div>
        <button
          v-if="!showLinkSearch"
          type="button"
          class="text-sm text-brand-700"
          @click="showLinkSearch = true"
        >
          Search to link facility
        </button>
        <div v-else class="space-y-1">
          <input
            v-model="query"
            type="search"
            placeholder="Search hospital name…"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
          <ul v-if="results.length" class="max-h-32 overflow-auto rounded-lg border border-slate-200 bg-white shadow">
            <li
              v-for="h in results"
              :key="h.id"
              class="cursor-pointer px-3 py-2 text-sm hover:bg-brand-50"
              @click="linkFromHospital(h)"
            >
              {{ h.name }}
              <span v-if="h.city" class="text-slate-500"> — {{ h.city }}, {{ h.state }}</span>
            </li>
          </ul>
          <p v-if="searching" class="text-xs text-slate-500">Searching…</p>
          <p v-else-if="showNoResults" class="text-xs text-slate-500">
            No facilities found — try a different name.
          </p>
          <p v-if="searchError" class="text-xs text-red-600">{{ searchError }}</p>
          <button type="button" class="text-xs text-slate-500 underline" @click="showLinkSearch = false; clearSearch()">
            Cancel search
          </button>
        </div>
      </div>
    </template>

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
