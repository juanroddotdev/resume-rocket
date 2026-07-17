<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import type { HospitalRow } from '~/types/hospital'
import { isDuplicateEmployer, linkEmployerFromHospital, createManualEmployer, isDuplicateEmployerEntry } from '~/utils/employerLink'

const props = defineProps<{
  employers: EmployerEntry[]
  deckMode?: 'single' | 'multi'
  persistImmediate?: () => void | Promise<void>
  /** Candidate-level EMR fallback for metrics stamp when a job row has none. */
  legacyEmrSystem?: string
  /**
   * Sticky top offset for expanded card headers (admin canvas: 0; intake under layout header: 56).
   */
  stickyChromeOffsetPx?: number
  /** Show a "View employers" control that opens the jump drawer (intake). Admin wires its own link. */
  showEmployersJumpLink?: boolean
}>()

const emit = defineEmits<{
  'update:employers': [value: EmployerEntry[]]
  'active-change': [index: number]
}>()

const { query, results, searching, searchError, showNoResults, clearSearch } = useHospitalSearch()
const { markEmployerDbMetrics } = useIntakePrefillHighlight()
const duplicateMessage = ref<string | null>(null)
const activeCardIndex = ref(0)
const linkSearchRequested = ref<number | null>(null)
const showManualForm = ref(false)
const manualName = ref('')
const manualCity = ref('')
const manualState = ref('')
const manualError = ref<string | null>(null)
const employersJumpOpen = ref(false)
const isMultiDeck = computed(() => props.deckMode === 'multi')
const cardStickyTopPx = computed(() => props.stickyChromeOffsetPx ?? 0)
const showJumpLink = computed(
  () => props.showEmployersJumpLink === true && props.employers.length >= 1,
)

watch(
  () => props.employers.length,
  async (len, prevLen) => {
    if (len > prevLen) {
      activeCardIndex.value = len - 1
      emit('active-change', activeCardIndex.value)
      if (len - prevLen === 1) {
        await scrollCardToTop(len - 1)
      }
    } else if (activeCardIndex.value >= len) {
      activeCardIndex.value = Math.max(0, len - 1)
      emit('active-change', activeCardIndex.value)
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
  if (next.length === 0) {
    employersJumpOpen.value = false
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
    document.getElementById(`employer-deck-row-${index}`)?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  })
}

async function openCard(index: number, options?: { scroll?: boolean }) {
  if (!isMultiDeck.value && activeCardIndex.value === index) {
    emit('active-change', index)
    if (options?.scroll) await scrollCardToTop(index)
    return
  }
  linkSearchRequested.value = null
  activeCardIndex.value = index
  emit('active-change', index)
  // Jump drawer / gap review opt into scroll. Header toggles expand in place (accordion only).
  if (options?.scroll) await scrollCardToTop(index)
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

function deckCollapseStyle(index: number): 'none' | 'overlap' | 'gap' {
  if (index === activeCardIndex.value) return 'none'
  if (index === activeCardIndex.value + 1) return 'gap'
  if (index > 0) return 'overlap'
  return 'none'
}

defineExpose({
  openEmployerField,
  openCard,
  activeCardIndex,
})
</script>

<template>
  <div class="relative space-y-4">
    <div>
      <div class="flex flex-wrap items-end justify-between gap-2">
        <label class="field-label mb-0" for="intake-field-employers">Search facilities</label>
        <button
          v-if="showJumpLink"
          type="button"
          class="text-sm font-medium text-brand-700 hover:underline"
          @click="employersJumpOpen = true"
        >
          View employers ({{ employers.length }})
        </button>
      </div>
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
          class="w-full rounded-lg bg-accent-500 py-2.5 text-sm font-medium text-brand-900 hover:bg-accent-600"
          @click="addManualEmployer"
        >
          Add to list
        </button>
      </div>
    </div>

    <ul v-if="employers.length" class="employer-deck" :class="isMultiDeck ? 'space-y-3' : ''">
      <EmployerCard
        v-for="(employer, index) in employers"
        :key="`${employer.hospitalId || employer.name}-${index}`"
        :employer="employer"
        :index="index"
        :layout="isMultiDeck ? 'panel' : 'deck'"
        :expanded="isMultiDeck ? true : activeCardIndex === index"
        :deck-collapse-style="isMultiDeck ? 'none' : deckCollapseStyle(index)"
        :request-link-search="linkSearchRequested === index"
        :persist-immediate="persistImmediate"
        :legacy-emr-system="legacyEmrSystem"
        :sticky-top-offset-px="cardStickyTopPx"
        @update="patchEmployer(index, $event)"
        @toggle="openCard(index)"
      />
    </ul>
    <p v-else class="text-xs text-amber-800">
      Add at least one hospital where you worked — search above or add manually.
    </p>

    <EmployersJumpDrawer
      v-if="showEmployersJumpLink"
      :open="employersJumpOpen"
      :employers="employers"
      :active-index="activeCardIndex"
      :legacy-emr-system="legacyEmrSystem"
      panel-class="fixed bottom-3 right-3 top-16 z-40"
      @close="employersJumpOpen = false"
      @select="(index) => openCard(index, { scroll: true })"
      @remove="removeEmployer"
      @move-up="(index) => moveEmployer(index, -1)"
      @move-down="(index) => moveEmployer(index, 1)"
    />
  </div>
</template>
