<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import type { HospitalRow, HospitalSuggestion } from '~/types/hospital'
import { linkEmployerFromHospital, unlinkEmployerFacility } from '~/utils/employerLink'

const props = defineProps<{
  employer: EmployerEntry
  index: number
  canMoveUp?: boolean
  canMoveDown?: boolean
}>()

const emit = defineEmits<{
  update: [value: EmployerEntry]
  remove: []
  'move-up': []
  'move-down': []
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
      <div class="min-w-0 flex-1">
        <p class="font-medium text-slate-900">{{ employer.name }}</p>
        <p v-if="employer.city || employer.state" class="text-xs text-slate-500">
          {{ [employer.city, employer.state].filter(Boolean).join(', ') }}
        </p>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button
          v-if="canMoveUp"
          type="button"
          class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          aria-label="Move employer up"
          @click="emit('move-up')"
        >
          ↑
        </button>
        <button
          v-if="canMoveDown"
          type="button"
          class="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
          aria-label="Move employer down"
          @click="emit('move-down')"
        >
          ↓
        </button>
        <button type="button" class="text-sm text-red-600" @click="emit('remove')">Remove</button>
      </div>
    </div>

    <div v-if="isLinked" class="flex flex-wrap items-end gap-2">
      <MetricTile
        v-if="employer.beds != null"
        label="Hospital beds"
        :value="employer.beds"
      />
      <MetricTile
        v-if="employer.traumaLevel"
        label="Trauma level"
        :value="employer.traumaLevel"
      />
      <MetricTile
        v-if="employer.teachingStatus"
        label="Teaching hospital"
        value="Yes"
      />
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
          :id="`intake-field-employer-${index}-link`"
          type="button"
          class="text-sm text-brand-700"
          @click="showLinkSearch = true"
          @focus="showLinkSearch = true"
        >
          Search to link facility
        </button>
        <div v-else class="space-y-1">
          <label class="block" :for="`intake-field-employer-${index}-link`">
            <span class="field-label-compact">Link to facility database</span>
          </label>
          <input
            :id="`intake-field-employer-${index}-link`"
            v-model="query"
            type="search"
            placeholder="Search hospital name…"
            class="field"
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

    <label class="block" :for="`intake-field-employer-${index}-role`">
      <span class="field-label-compact">Role / unit</span>
      <input
        :id="`intake-field-employer-${index}-role`"
        :value="employer.role || ''"
        placeholder="e.g. ICU Staff RN"
        class="field"
        @input="patch({ role: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <div class="grid grid-cols-2 gap-2">
      <label class="block" :for="`intake-field-employer-${index}-start`">
        <span class="field-label-compact">Start date</span>
        <input
          :id="`intake-field-employer-${index}-start`"
          :value="employer.startDate || ''"
          placeholder="YYYY-MM"
          class="field"
          @input="patch({ startDate: ($event.target as HTMLInputElement).value })"
        >
      </label>
      <label class="block" :for="`intake-field-employer-${index}-end`">
        <span class="field-label-compact">End date</span>
        <input
          :id="`intake-field-employer-${index}-end`"
          :value="employer.endDate || ''"
          placeholder="YYYY-MM or Present"
          class="field"
          @input="patch({ endDate: ($event.target as HTMLInputElement).value })"
        >
      </label>
    </div>

    <label class="block" :for="`intake-field-employer-${index}-type`">
      <span class="field-label-compact">Employment type</span>
      <input
        :id="`intake-field-employer-${index}-type`"
        :value="employer.employmentType || ''"
        placeholder="Travel, Staff, PRN…"
        class="field"
        @input="patch({ employmentType: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label class="block" :for="`intake-field-employer-${index}-scope`">
      <span class="field-label-compact">Patient scope</span>
      <input
        :id="`intake-field-employer-${index}-scope`"
        :value="employer.patientScope || ''"
        placeholder="e.g. adult ICU, pediatrics"
        class="field"
        @input="patch({ patientScope: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label class="block" :for="`intake-field-employer-${index}-acuity`">
      <span class="field-label-compact">Patient acuity</span>
      <input
        :id="`intake-field-employer-${index}-acuity`"
        :value="employer.patientAcuity || ''"
        placeholder="e.g. high acuity, level III NICU"
        class="field"
        @input="patch({ patientAcuity: ($event.target as HTMLInputElement).value })"
      >
    </label>

    <label class="block" :for="`intake-field-employer-${index}-highlights`">
      <span class="field-label-compact">Highlights</span>
      <textarea
        :id="`intake-field-employer-${index}-highlights`"
        :value="arrayToLines(employer.highlights)"
        placeholder="One achievement per line"
        rows="3"
        class="field"
        @input="patch({ highlights: linesToArray(($event.target as HTMLTextAreaElement).value) })"
      />
    </label>

    <button
      type="button"
      class="text-sm text-brand-700"
      @click="showClinical = !showClinical"
    >
      {{ showClinical ? 'Hide' : 'Add' }} optional unit details
    </button>

    <div v-if="showClinical" class="space-y-2 border-t border-slate-100 pt-2">
      <p class="text-xs font-medium text-slate-700">Unit details (your unit — not hospital-wide)</p>
      <label class="block" :for="`intake-field-employer-${index}-unit-beds`">
        <span class="field-label-compact">Unit beds</span>
        <input
          :id="`intake-field-employer-${index}-unit-beds`"
          :value="employer.unitBedCount || ''"
          placeholder="e.g. 24-bed ICU"
          class="field"
          @input="patch({ unitBedCount: ($event.target as HTMLInputElement).value })"
        >
      </label>
      <label class="block" :for="`intake-field-employer-${index}-avg-patients`">
        <span class="field-label-compact">Average daily patients</span>
        <input
          :id="`intake-field-employer-${index}-avg-patients`"
          :value="employer.avgDailyPatients || ''"
          placeholder="e.g. 4–5 couplets"
          class="field"
          @input="patch({ avgDailyPatients: ($event.target as HTMLInputElement).value })"
        >
      </label>
      <label class="block" :for="`intake-field-employer-${index}-floated`">
        <span class="field-label-compact">Floated units</span>
        <textarea
          :id="`intake-field-employer-${index}-floated`"
          :value="arrayToLines(employer.floatedUnits)"
          placeholder="One unit per line"
          rows="2"
          class="field"
          @input="patch({ floatedUnits: linesToArray(($event.target as HTMLTextAreaElement).value) })"
        />
      </label>
      <label class="block" :for="`intake-field-employer-${index}-equipment`">
        <span class="field-label-compact">Equipment / procedures</span>
        <textarea
          :id="`intake-field-employer-${index}-equipment`"
          :value="arrayToLines(employer.equipmentProcedures)"
          placeholder="One item per line"
          rows="2"
          class="field"
          @input="patch({ equipmentProcedures: linesToArray(($event.target as HTMLTextAreaElement).value) })"
        />
      </label>
    </div>
  </li>
</template>
