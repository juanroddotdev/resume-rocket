<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import type { HospitalRow, HospitalSuggestion } from '~/types/hospital'
import { linkEmployerFromHospital, unlinkEmployerFacility } from '~/utils/employerLink'
import { EMPLOYMENT_TYPE_OPTIONS, normalizeEmploymentType } from '~/utils/employmentType'
import { facilityGoogleSearchUrl } from '~/utils/facilityGoogleSearch'
import { triStateBoolFromSelect, triStateBoolValue } from '~/utils/employerClinicalFlags'
import { arrayToLines, linesToArray } from '~/utils/employerLineList'
import { TRAUMA_LEVEL_OPTIONS, normalizeTraumaLevel } from '~/utils/traumaLevel'
import { formatEmployerMetricsLine } from '~/utils/employerMetricsLine'

const props = defineProps<{
  employer: EmployerEntry
  index: number
  expanded: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
  requestLinkSearch?: boolean
  layout?: 'deck' | 'panel'
  /** Deck list spacing: gap below expanded card, overlap among other collapsed headers. */
  deckCollapseStyle?: 'none' | 'overlap' | 'gap'
  persistImmediate?: () => void | Promise<void>
  /** Legacy candidate-level EMR when employer row has none (matches DOCX fallback). */
  legacyEmrSystem?: string
  /** Sticky header offset in px (accounts for layout chrome + employer jump list). */
  stickyTopOffsetPx?: number
}>()

const isPanel = computed(() => props.layout === 'panel')
const isExpanded = computed(() => isPanel.value || props.expanded)
const stickyTopStyle = computed(() => {
  if (!isExpanded.value) return undefined
  const top = props.stickyTopOffsetPx ?? (isPanel.value ? 0 : 56)
  return { top: `${top}px` }
})

const deckRowMarginClass = computed(() => {
  if (isPanel.value || props.expanded) return 'mt-0'
  if (props.deckCollapseStyle === 'gap') return 'mt-3'
  if (props.deckCollapseStyle === 'overlap') return '-mt-2'
  return 'mt-0'
})

const emit = defineEmits<{
  update: [value: EmployerEntry]
  remove: []
  'move-up': []
  'move-down': []
  toggle: []
}>()

const showClinical = ref(false)

function employerHasOptionalDetails(employer: EmployerEntry) {
  return Boolean(
    employer.unitBedCount?.trim()
    || employer.avgDailyPatients?.trim()
    || employer.floatedUnits?.length
    || employer.equipmentProcedures?.length
  )
}

watch(
  () => props.employer,
  (employer) => {
    if (employerHasOptionalDetails(employer)) showClinical.value = true
  },
  { immediate: true, deep: true },
)
const showLinkSearch = ref(false)
const { query, results, searching, searchError, showNoResults, clearSearch } = useHospitalSearch()
const {
  fieldClasses,
  clearParseHighlight,
  markEmployerDbMetrics,
  clearEmployerDbMetrics,
  isEmployerDbMetricsHighlighted,
  isParseHighlighted,
} = useIntakePrefillHighlight()

const isLinked = computed(() => Boolean(props.employer.hospitalId))

const displayName = computed(() => props.employer.name?.trim() || 'Hospital name not set')
const nameIsMissing = computed(() => !props.employer.name?.trim())

const roleSummary = computed(() => props.employer.role?.trim() || 'Role not set')

const dateSummary = computed(() => {
  const start = props.employer.startDate?.trim()
  const end = props.employer.endDate?.trim()
  if (!start && !end) return 'Dates not set'
  return `${start || '—'} – ${end || 'Present'}`
})

/** Live DOCX-style metrics stamp (unit beds • hospital beds • trauma • teaching • EMR • scope). */
const metricsLine = computed(() =>
  formatEmployerMetricsLine(props.employer, {
    legacyEmrSystem: props.legacyEmrSystem,
  }),
)

watch(
  () => props.requestLinkSearch,
  (open) => {
    if (open) showLinkSearch.value = true
  },
)

function patch(partial: Partial<EmployerEntry>) {
  emit('update', { ...props.employer, ...partial })
}

function employerFieldId(suffix: string) {
  return `employer-${props.index}-${suffix}`
}

function patchField(suffix: string, partial: Partial<EmployerEntry>) {
  clearParseHighlight(employerFieldId(suffix))
  patch(partial)
}

function linkFromHospital(hospital: HospitalRow | HospitalSuggestion) {
  emit('update', linkEmployerFromHospital(props.employer, hospital))
  markEmployerDbMetrics(props.index)
  showLinkSearch.value = false
  clearSearch()
}

function startChangeFacility() {
  clearEmployerDbMetrics(props.index)
  emit('update', unlinkEmployerFacility(props.employer))
  showLinkSearch.value = true
}

type LineField = 'highlights' | 'floatedUnits' | 'equipmentProcedures'

const lineDrafts = reactive<Record<LineField, string>>({
  highlights: '',
  floatedUnits: '',
  equipmentProcedures: '',
})

const focusedLineField = ref<LineField | null>(null)

function syncLineDraft(field: LineField, values?: string[]) {
  if (focusedLineField.value === field) return
  lineDrafts[field] = arrayToLines(values)
}

watch(
  () => props.employer.highlights,
  value => syncLineDraft('highlights', value),
  { immediate: true },
)
watch(
  () => props.employer.floatedUnits,
  value => syncLineDraft('floatedUnits', value),
  { immediate: true },
)
watch(
  () => props.employer.equipmentProcedures,
  value => syncLineDraft('equipmentProcedures', value),
  { immediate: true },
)

function onLineDraftInput(field: LineField, event: Event) {
  lineDrafts[field] = (event.target as HTMLTextAreaElement).value
}

function commitLineDraft(
  field: LineField,
  suffix: string,
  key: 'highlights' | 'floatedUnits' | 'equipmentProcedures',
) {
  focusedLineField.value = null
  patchField(suffix, { [key]: linesToArray(lineDrafts[field]) })
}

function onBedsInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value.trim()
  if (!raw) {
    patchField('beds', { beds: undefined })
    return
  }
  const beds = Number.parseInt(raw, 10)
  patchField('beds', { beds: Number.isFinite(beds) ? beds : undefined })
}

const employmentTypeValue = computed(() => {
  return normalizeEmploymentType(props.employer.employmentType) || ''
})

function onEmrSystemChange(value: string) {
  patchField('emr', { emrSystem: value })
}

function onEmploymentTypeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const next: Partial<EmployerEntry> = { employmentType: value }
  if (normalizeEmploymentType(value) !== 'PRN') {
    next.prnSchedule = undefined
  }
  patchField('type', next)
}

function openFacilityGoogleSearch() {
  if (!import.meta.client) return
  window.open(facilityGoogleSearchUrl(props.employer), '_blank', 'noopener,noreferrer')
}

function onClinicalFlagChange(
  suffix: string,
  key: 'chargeNurseExperience' | 'preceptorExperience',
  event: Event,
) {
  clearParseHighlight(employerFieldId(suffix))
  const value = triStateBoolFromSelect((event.target as HTMLSelectElement).value)
  const next = { ...props.employer }
  if (value === undefined) {
    delete next[key]
  } else {
    next[key] = value
  }
  emit('update', next)
  void props.persistImmediate?.()
}

function onTeachingStatusChange(event: Event) {
  clearParseHighlight(employerFieldId('teaching'))
  const value = triStateBoolFromSelect((event.target as HTMLSelectElement).value)
  const next = { ...props.employer }
  if (value === undefined) {
    delete next.teachingStatus
  } else {
    next.teachingStatus = value
  }
  emit('update', next)
}

function onTraumaLevelChange(event: Event) {
  clearParseHighlight(employerFieldId('trauma'))
  const raw = (event.target as HTMLSelectElement).value
  const next = { ...props.employer }
  if (!raw) {
    delete next.traumaLevel
  } else {
    next.traumaLevel = normalizeTraumaLevel(raw)
  }
  emit('update', next)
}
</script>

<template>
  <li
    :id="`employer-deck-row-${index}`"
    class="employer-deck-row relative"
    :class="[
      isPanel ? 'py-3' : expanded ? 'z-30 py-8' : 'z-10 py-0',
      !isPanel && deckRowMarginClass,
    ]"
    :style="stickyTopOffsetPx != null ? { scrollMarginTop: `${stickyTopOffsetPx + 8}px` } : undefined"
  >
    <div
      :id="`employer-card-${index}`"
      class="employer-card-surface rounded-lg border bg-white"
      :class="[
        isExpanded
          ? 'border-brand-200 border-l-4 border-l-brand-600 shadow-md'
          : 'border-slate-200 shadow-sm',
      ]"
    >
    <!--
      Sticky only while expanded: pin name + metrics while scrolling fields.
      Drops with this card when the next employer enters — no JS handoff.
      overflow-hidden removed from surface so sticky is not clipped.
    -->
    <div
      class="flex items-start gap-1"
      :class="isExpanded
        ? 'sticky z-20 border-b border-brand-100 bg-brand-50 shadow-sm'
        : 'rounded-t-lg bg-white'"
      :style="stickyTopStyle"
    >
      <component
        :is="isPanel ? 'div' : 'button'"
        :id="`employer-card-header-${index}`"
        :type="isPanel ? undefined : 'button'"
        class="min-w-0 flex-1 rounded-lg p-3 text-left"
        :aria-expanded="isPanel ? undefined : isExpanded"
        :aria-controls="isPanel ? undefined : `employer-panel-${index}`"
        @click="!isPanel && emit('toggle')"
      >
        <p class="font-medium" :class="nameIsMissing ? 'text-slate-500 italic' : 'text-slate-900'">
          {{ displayName }}
        </p>
        <p class="mt-0.5 text-xs text-slate-500">
          {{ roleSummary }} · {{ dateSummary }}
        </p>
        <p v-if="employer.city || employer.state" class="mt-0.5 text-xs text-slate-400">
          {{ [employer.city, employer.state].filter(Boolean).join(', ') }}
        </p>
        <p
          v-if="metricsLine"
          class="mt-1.5 text-xs font-medium text-slate-700"
          :aria-label="`Packet metrics line: ${metricsLine}`"
        >
          {{ metricsLine }}
        </p>
        <p
          v-else-if="isExpanded"
          class="mt-1.5 text-xs text-slate-400"
        >
          Packet metrics appear here as beds, trauma, teaching, EMR, and scope are filled
        </p>
      </component>
      <div class="flex shrink-0 items-center gap-1 self-center pr-2">
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

    <div
      class="employer-card-panel grid"
      :class="isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
    >
      <div
        :id="`employer-panel-${index}`"
        class="min-h-0 overflow-hidden"
        :aria-hidden="!isExpanded"
        :class="!isExpanded && 'pointer-events-none'"
      >
        <div class="space-y-3 border-t border-slate-100 px-3 pb-3 pt-2">
          <template v-if="!isLinked">
            <label class="block" :for="`intake-field-${employerFieldId('name')}`">
              <span class="field-label-compact">Hospital name</span>
              <input
                :id="`intake-field-${employerFieldId('name')}`"
                :value="employer.name || ''"
                placeholder="Hospital name"
                :class="fieldClasses(employerFieldId('name'))"
                @input="patchField('name', { name: ($event.target as HTMLInputElement).value })"
              >
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="block" :for="`intake-field-${employerFieldId('city')}`">
                <span class="field-label-compact">City</span>
                <input
                  :id="`intake-field-${employerFieldId('city')}`"
                  :value="employer.city || ''"
                  placeholder="City"
                  :class="fieldClasses(employerFieldId('city'))"
                  @input="patchField('city', { city: ($event.target as HTMLInputElement).value })"
                >
              </label>
              <label class="block" :for="`intake-field-${employerFieldId('state')}`">
                <span class="field-label-compact">State</span>
                <input
                  :id="`intake-field-${employerFieldId('state')}`"
                  :value="employer.state || ''"
                  placeholder="ST"
                  maxlength="2"
                  :class="fieldClasses(employerFieldId('state'))"
                  @input="patchField('state', { state: ($event.target as HTMLInputElement).value.toUpperCase() })"
                >
              </label>
            </div>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label class="block" :for="`intake-field-${employerFieldId('trauma')}`">
                <span class="field-label-compact">Trauma level</span>
                <select
                  :id="`intake-field-${employerFieldId('trauma')}`"
                  :value="employer.traumaLevel || ''"
                  :class="fieldClasses(employerFieldId('trauma'))"
                  @change="onTraumaLevelChange"
                >
                  <option value="">Select…</option>
                  <option v-for="level in TRAUMA_LEVEL_OPTIONS" :key="level" :value="level">
                    Level {{ level }}
                  </option>
                </select>
              </label>
              <label class="block" :for="`intake-field-${employerFieldId('teaching')}`">
                <span class="field-label-compact">Teaching hospital</span>
                <select
                  :id="`intake-field-${employerFieldId('teaching')}`"
                  :value="triStateBoolValue(employer.teachingStatus)"
                  :class="fieldClasses(employerFieldId('teaching'))"
                  @change="onTeachingStatusChange"
                >
                  <option value="">Select…</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </label>
            </div>
            <p class="text-xs text-slate-500">
              For manual hospitals — link the facility below to pull trauma and teaching from the database instead.
            </p>
          </template>

          <div v-if="isLinked" class="flex flex-wrap items-end gap-2">
            <MetricTile
              v-if="employer.beds != null"
              label="Hospital beds"
              :value="employer.beds"
              :from-database="isEmployerDbMetricsHighlighted(index)"
            />
            <MetricTile
              v-if="employer.traumaLevel"
              label="Trauma level"
              :value="employer.traumaLevel"
              :from-database="isEmployerDbMetricsHighlighted(index)"
            />
            <MetricTile
              v-if="employer.teachingStatus"
              label="Teaching hospital"
              value="Yes"
              :from-database="isEmployerDbMetricsHighlighted(index)"
            />
            <button type="button" class="text-xs text-brand-700 underline" @click="startChangeFacility">
              Change facility
            </button>
          </div>

          <template v-else>
            <p class="text-xs text-slate-600">
              Link facility for bed count &amp; trauma (recommended)
            </p>
            <button
              type="button"
              class="text-xs text-slate-600 underline hover:text-brand-700"
              @click="openFacilityGoogleSearch"
            >
              Search hospital info on Google
            </button>

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

          <fieldset class="space-y-3 border-0 p-0">
            <legend class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Role &amp; dates
            </legend>

          <label class="block" :for="`intake-field-employer-${index}-role`">
            <span class="field-label-compact">Role / unit</span>
            <input
              :id="`intake-field-${employerFieldId('role')}`"
              :value="employer.role || ''"
              placeholder="e.g. ICU Staff RN"
              :class="fieldClasses(employerFieldId('role'))"
              @input="patchField('role', { role: ($event.target as HTMLInputElement).value })"
            >
          </label>

          <div class="grid grid-cols-2 gap-2">
            <label class="block" :for="`intake-field-employer-${index}-start`">
              <span class="field-label-compact">Start date</span>
              <input
                :id="`intake-field-${employerFieldId('start')}`"
                :value="employer.startDate || ''"
                placeholder="YYYY-MM"
                :class="fieldClasses(employerFieldId('start'))"
                @input="patchField('start', { startDate: ($event.target as HTMLInputElement).value })"
              >
            </label>
            <label class="block" :for="`intake-field-employer-${index}-end`">
              <span class="field-label-compact">End date</span>
              <input
                :id="`intake-field-${employerFieldId('end')}`"
                :value="employer.endDate || ''"
                placeholder="YYYY-MM or Present"
                :class="fieldClasses(employerFieldId('end'))"
                @input="patchField('end', { endDate: ($event.target as HTMLInputElement).value })"
              >
            </label>
          </div>

          <label class="block" :for="`intake-field-employer-${index}-type`">
            <span class="field-label-compact">Employment type</span>
            <select
              :id="`intake-field-${employerFieldId('type')}`"
              :value="employmentTypeValue"
              :class="fieldClasses(employerFieldId('type'))"
              @change="onEmploymentTypeChange"
            >
              <option value="">Select…</option>
              <option v-for="option in EMPLOYMENT_TYPE_OPTIONS" :key="option" :value="option">
                {{ option }}
              </option>
            </select>
          </label>

          <label
            v-if="employmentTypeValue === 'PRN'"
            class="block"
            :for="`intake-field-${employerFieldId('prn-schedule')}`"
          >
            <span class="field-label-compact">Typical schedule</span>
            <input
              :id="`intake-field-${employerFieldId('prn-schedule')}`"
              :value="employer.prnSchedule || ''"
              type="text"
              placeholder="e.g. 2 shifts/month, 24 hrs/week"
              :class="fieldClasses(employerFieldId('prn-schedule'))"
              @input="patchField('prn-schedule', { prnSchedule: ($event.target as HTMLInputElement).value })"
            >
            <span class="mt-1 block text-xs text-slate-500">
              How often you typically work at this PRN assignment.
            </span>
          </label>
          </fieldset>

          <fieldset class="space-y-3 border-0 border-t border-slate-100 p-0 pt-3">
            <legend class="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Clinical
            </legend>

          <label class="block" :for="`intake-field-${employerFieldId('emr')}`">
            <span class="field-label-compact">EMR / charting system</span>
            <EmrSystemCombobox
              :input-id="`intake-field-${employerFieldId('emr')}`"
              :model-value="employer.emrSystem || ''"
              :input-class="fieldClasses(employerFieldId('emr'))"
              :parse-highlighted="isParseHighlighted(employerFieldId('emr'))"
              @update:model-value="onEmrSystemChange"
            />
          </label>

          <label class="block" :for="`intake-field-employer-${index}-scope`">
            <span class="field-label-compact">Patient scope</span>
            <input
              :id="`intake-field-${employerFieldId('scope')}`"
              :value="employer.patientScope || ''"
              placeholder="e.g. adult ICU, pediatrics"
              :class="fieldClasses(employerFieldId('scope'))"
              @input="patchField('scope', { patientScope: ($event.target as HTMLInputElement).value })"
            >
          </label>

          <label v-if="!isLinked" class="block" :for="`intake-field-${employerFieldId('beds')}`">
            <span class="field-label-compact">Hospital total beds</span>
            <input
              :id="`intake-field-${employerFieldId('beds')}`"
              :value="employer.beds != null ? String(employer.beds) : ''"
              inputmode="numeric"
              placeholder="e.g. 450"
              :class="fieldClasses(employerFieldId('beds'))"
              @input="onBedsInput"
            >
          </label>

          <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label class="block" :for="`intake-field-${employerFieldId('charge-nurse')}`">
              <span class="field-label-compact">Charge nurse experience</span>
              <select
                :id="`intake-field-${employerFieldId('charge-nurse')}`"
                :value="triStateBoolValue(employer.chargeNurseExperience)"
                :class="fieldClasses(employerFieldId('charge-nurse'))"
                @change="onClinicalFlagChange('charge-nurse', 'chargeNurseExperience', $event)"
              >
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
            <label class="block" :for="`intake-field-${employerFieldId('preceptor')}`">
              <span class="field-label-compact">Preceptor experience</span>
              <select
                :id="`intake-field-${employerFieldId('preceptor')}`"
                :value="triStateBoolValue(employer.preceptorExperience)"
                :class="fieldClasses(employerFieldId('preceptor'))"
                @change="onClinicalFlagChange('preceptor', 'preceptorExperience', $event)"
              >
                <option value="">Select…</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            class="text-sm text-brand-700"
            @click="showClinical = !showClinical"
          >
            {{ showClinical ? 'Hide' : 'Add' }} optional unit details
          </button>

          <div v-if="showClinical" class="space-y-2 border-t border-slate-100 pt-2">
            <p class="text-xs font-medium text-slate-700">Unit details (your unit — not hospital-wide)</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <MetricTile
                editable
                label="Unit beds"
                :model-value="employer.unitBedCount || ''"
                placeholder="e.g. 24"
                :input-id="`intake-field-${employerFieldId('unit-beds')}`"
                :input-class="fieldClasses(employerFieldId('unit-beds'))"
                @update:model-value="patchField('unit-beds', { unitBedCount: $event })"
              />
              <MetricTile
                editable
                label="Patient ratio"
                :model-value="employer.avgDailyPatients || ''"
                placeholder="e.g. 1:2 or 1:4"
                :input-id="`intake-field-${employerFieldId('avg-patients')}`"
                :input-class="fieldClasses(employerFieldId('avg-patients'))"
                @update:model-value="patchField('avg-patients', { avgDailyPatients: $event })"
              />
            </div>
            <p class="text-xs text-slate-500">
              Patients you cared for at this hospital — separate from career-wide ratios on Step 3.
            </p>
            <label class="block" :for="`intake-field-employer-${index}-floated`">
              <span class="field-label-compact">Floated units</span>
              <textarea
                :id="`intake-field-employer-${index}-floated`"
                :value="lineDrafts.floatedUnits"
                placeholder="One unit per line"
                rows="2"
                class="field"
                @focus="focusedLineField = 'floatedUnits'"
                @input="onLineDraftInput('floatedUnits', $event)"
                @blur="commitLineDraft('floatedUnits', 'floated', 'floatedUnits')"
              />
            </label>
            <label class="block" :for="`intake-field-employer-${index}-equipment`">
              <span class="field-label-compact">Equipment / procedures</span>
              <textarea
                :id="`intake-field-employer-${index}-equipment`"
                :value="lineDrafts.equipmentProcedures"
                placeholder="One item per line"
                rows="2"
                class="field"
                @focus="focusedLineField = 'equipmentProcedures'"
                @input="onLineDraftInput('equipmentProcedures', $event)"
                @blur="commitLineDraft('equipmentProcedures', 'equipment', 'equipmentProcedures')"
              />
            </label>
          </div>

          <label class="block" :for="`intake-field-employer-${index}-highlights`">
            <span class="field-label-compact">Highlights</span>
            <textarea
              :id="`intake-field-${employerFieldId('highlights')}`"
              :value="lineDrafts.highlights"
              placeholder="One achievement per line"
              rows="3"
              :class="fieldClasses(employerFieldId('highlights'))"
              @focus="focusedLineField = 'highlights'"
              @input="onLineDraftInput('highlights', $event)"
              @blur="commitLineDraft('highlights', 'highlights', 'highlights')"
            />
          </label>
          </fieldset>
        </div>
      </div>
    </div>
    </div>
  </li>
</template>
