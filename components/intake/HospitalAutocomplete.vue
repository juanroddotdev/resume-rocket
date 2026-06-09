<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import type { HospitalRow } from '~/types/hospital'
import { isDuplicateEmployer, linkEmployerFromHospital } from '~/utils/employerLink'

const props = defineProps<{
  employers: EmployerEntry[]
}>()

const emit = defineEmits<{
  'update:employers': [value: EmployerEntry[]]
}>()

const { query, results, searching, searchError, showNoResults, clearSearch } = useHospitalSearch()
const emr = defineModel<string>('emr', { default: '' })
const duplicateMessage = ref<string | null>(null)
const activeCardIndex = ref(0)
const linkSearchRequested = ref<number | null>(null)

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
  if (isDuplicateEmployer(props.employers, h)) {
    duplicateMessage.value = 'This facility is already on your list.'
    return
  }
  emit('update:employers', [...props.employers, linkEmployerFromHospital({ name: h.name }, h)])
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
        No facilities found — try a different name or add details manually later.
      </p>
      <p v-if="duplicateMessage" class="mt-1 text-xs text-amber-800">{{ duplicateMessage }}</p>
      <p v-if="searchError" class="mt-1 text-xs text-red-600">{{ searchError }}</p>
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
      Add at least one hospital where you worked — search above.
    </p>

    <div>
      <label class="field-label">EMR platform</label>
      <select
        id="intake-field-emr_system"
        v-model="emr"
        class="field"
      >
        <option value="">Select…</option>
        <option value="Epic">Epic</option>
        <option value="Cerner">Cerner</option>
        <option value="Meditech">Meditech</option>
        <option value="Other">Other</option>
      </select>
    </div>
  </div>
</template>
