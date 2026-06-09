<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import type { HospitalRow } from '~/types/hospital'
import { isDuplicateEmployer, linkEmployerFromHospital, createManualEmployer, isDuplicateEmployerEntry } from '~/utils/employerLink'
import {
  EMR_OTHER_OPTION,
  EMR_PRESET_OPTIONS,
  emrSystemFromFields,
  resolveEmrFields,
} from '~/utils/emrSystem'

const props = defineProps<{
  employers: EmployerEntry[]
}>()

const emit = defineEmits<{
  'update:employers': [value: EmployerEntry[]]
}>()

const { query, results, searching, searchError, showNoResults, clearSearch } = useHospitalSearch()
const { markEmployerDbMetrics } = useIntakePrefillHighlight()
const emr = defineModel<string>('emr', { default: '' })
const emrSelection = ref('')
const emrCustom = ref('')

watch(
  emr,
  (value) => {
    const resolved = resolveEmrFields(value)
    emrSelection.value = resolved.selection
    emrCustom.value = resolved.custom
  },
  { immediate: true },
)

function syncEmrModel() {
  emr.value = emrSystemFromFields(emrSelection.value, emrCustom.value)
}

function onEmrSelectionChange(event: Event) {
  emrSelection.value = (event.target as HTMLSelectElement).value
  if (emrSelection.value !== EMR_OTHER_OPTION) {
    emrCustom.value = ''
  }
  syncEmrModel()
}

function onEmrCustomInput(event: Event) {
  emrCustom.value = (event.target as HTMLInputElement).value
  syncEmrModel()
}

const duplicateMessage = ref<string | null>(null)
const activeCardIndex = ref(0)
const linkSearchRequested = ref<number | null>(null)
const showManualForm = ref(false)
const manualName = ref('')
const manualCity = ref('')
const manualState = ref('')
const manualError = ref<string | null>(null)

watch(
  () => props.employers.length,
  async (len, prevLen) => {
    if (len > prevLen) {
      activeCardIndex.value = len - 1
      await scrollCardToTop(len - 1)
    } else if (activeCardIndex.value >= len) {
      activeCardIndex.value = Math.max(0, len - 1)
    }
  },
)

function addHospital(h: HospitalRow) {
  duplicateMessage.value = null
  manualError.value = null
  if (isDuplicateEmployer(props.employers, h)) {
    duplicateMessage.value = 'This facility is already on your list.'
    return
  }
  emit('update:employers', [...props.employers, linkEmployerFromHospital({ name: h.name }, h)])
  markEmployerDbMetrics(props.employers.length)
  clearSearch()
  showManualForm.value = false
}

function addManualEmployer() {
  duplicateMessage.value = null
  manualError.value = null
  const entry = createManualEmployer({
    name: manualName.value,
    city: manualCity.value,
    state: manualState.value,
  })
  if (!entry.name) {
    manualError.value = 'Enter a hospital name to continue.'
    return
  }
  if (isDuplicateEmployerEntry(props.employers, entry)) {
    manualError.value = 'This hospital is already on your list.'
    return
  }
  emit('update:employers', [...props.employers, entry])
  manualName.value = ''
  manualCity.value = ''
  manualState.value = ''
  showManualForm.value = false
  clearSearch()
}

function patchEmployer(index: number, employer: EmployerEntry) {
  const next = [...props.employers]
  next[index] = employer
  emit('update:employers', next)
}

function removeEmployer(index: number) {
  const next = [...props.employers]
  next.splice(index, 1)
  emit('update:employers', next)
  if (activeCardIndex.value >= next.length) {
    activeCardIndex.value = Math.max(0, next.length - 1)
  } else if (activeCardIndex.value > index) {
    activeCardIndex.value -= 1
  }
}

function moveEmployer(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= props.employers.length) return
  const next = [...props.employers]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item!)
  emit('update:employers', next)
  if (activeCardIndex.value === index) {
    activeCardIndex.value = target
  } else if (activeCardIndex.value === target) {
    activeCardIndex.value = index
  }
}

function prefersReducedMotion() {
  return import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

async function scrollCardToTop(index: number) {
  if (!import.meta.client) return
  await nextTick()
  requestAnimationFrame(() => {
    document.getElementById(`employer-card-${index}`)?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  })
}

async function openCard(index: number) {
  if (activeCardIndex.value === index) return
  linkSearchRequested.value = null
  await scrollCardToTop(index)
  activeCardIndex.value = index
}

async function openEmployerField(fieldId: string): boolean {
  const match = fieldId.match(/^employer-(\d+)-/)
  if (!match) return false
  const index = Number(match[1])
  if (index < 0 || index >= props.employers.length) return false
  activeCardIndex.value = index
  if (fieldId.endsWith('-link')) {
    linkSearchRequested.value = index
  } else {
    linkSearchRequested.value = null
  }
  await scrollCardToTop(index)
  return true
}

defineExpose({ openEmployerField })
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="field-label">Search facilities</label>
      <input
        id="intake-field-employers"
        v-model="query"
        type="search"
        placeholder="Hospital name…"
        class="field"
      >
      <ul v-if="results.length" class="mt-1 max-h-40 overflow-auto rounded-lg border border-slate-200 bg-white shadow">
        <li
          v-for="h in results"
          :key="h.id"
          class="cursor-pointer px-3 py-2 text-sm hover:bg-brand-50"
          @click="addHospital(h)"
        >
          {{ h.name }}
          <span v-if="h.city" class="text-slate-500"> — {{ h.city }}, {{ h.state }}</span>
        </li>
      </ul>
      <p v-if="searching" class="mt-1 text-xs text-slate-500">Searching…</p>
      <p v-else-if="showNoResults" class="mt-1 text-xs text-slate-500">
        No facilities found — add your hospital manually below.
      </p>
      <p v-if="duplicateMessage" class="mt-1 text-xs text-amber-800">{{ duplicateMessage }}</p>
      <p v-if="searchError" class="mt-1 text-xs text-red-600">{{ searchError }}</p>
      <button
        type="button"
        class="mt-2 text-sm text-brand-700 underline"
        @click="showManualForm = !showManualForm; manualError = null"
      >
        {{ showManualForm ? 'Hide manual entry' : '+ Add hospital manually' }}
      </button>
      <div
        v-if="showManualForm"
        class="mt-2 space-y-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3"
      >
        <p class="text-xs text-slate-600">
          Not in our database? Enter the hospital as it should appear on your packet.
        </p>
        <label class="block">
          <span class="field-label-compact">Hospital name</span>
          <input
            id="intake-field-employers-manual-name"
            v-model="manualName"
            type="text"
            placeholder="e.g. St. Mary's Medical Center"
            class="field"
          >
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="block">
            <span class="field-label-compact">City</span>
            <input
              v-model="manualCity"
              type="text"
              placeholder="City"
              class="field"
            >
          </label>
          <label class="block">
            <span class="field-label-compact">State</span>
            <input
              v-model="manualState"
              type="text"
              placeholder="ST"
              maxlength="2"
              class="field"
            >
          </label>
        </div>
        <p v-if="manualError" class="text-xs text-amber-800">{{ manualError }}</p>
        <button
          type="button"
          class="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white"
          @click="addManualEmployer"
        >
          Add to list
        </button>
      </div>
    </div>

    <ul v-if="employers.length" class="employer-deck">
      <EmployerCard
        v-for="(employer, index) in employers"
        :key="`${employer.hospitalId || employer.name}-${index}`"
        :employer="employer"
        :index="index"
        :expanded="activeCardIndex === index"
        :can-move-up="index > 0"
        :can-move-down="index < employers.length - 1"
        :request-link-search="linkSearchRequested === index"
        @update="patchEmployer(index, $event)"
        @remove="removeEmployer(index)"
        @move-up="moveEmployer(index, -1)"
        @move-down="moveEmployer(index, 1)"
        @toggle="openCard(index)"
      />
    </ul>
    <p v-else class="text-xs text-amber-800">
      Add at least one hospital where you worked — search above or add manually.
    </p>

    <div class="space-y-2">
      <label class="field-label" for="intake-field-emr_system">EMR platform</label>
      <select
        id="intake-field-emr_system"
        :value="emrSelection"
        class="field"
        @change="onEmrSelectionChange"
      >
        <option value="">Select…</option>
        <option v-for="option in EMR_PRESET_OPTIONS" :key="option" :value="option">
          {{ option }}
        </option>
        <option :value="EMR_OTHER_OPTION">Other</option>
      </select>
      <label
        v-if="emrSelection === EMR_OTHER_OPTION"
        class="block"
        for="intake-field-emr_system-other"
      >
        <span class="field-label-compact">Other EMR platform</span>
        <input
          id="intake-field-emr_system-other"
          :value="emrCustom"
          type="text"
          placeholder="e.g. Allscripts, Athena, Medhost"
          class="field"
          @input="onEmrCustomInput"
        >
      </label>
      <p
        v-if="emrSelection === EMR_OTHER_OPTION && !emrCustom.trim()"
        class="text-xs text-slate-500"
      >
        Enter the EMR name used at your facilities.
      </p>
    </div>
  </div>
</template>
