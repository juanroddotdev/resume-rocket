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
}

function moveEmployer(index: number, direction: -1 | 1) {
  const target = index + direction
  if (target < 0 || target >= props.employers.length) return
  const next = [...props.employers]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item!)
  emit('update:employers', next)
}
</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">Search facilities</label>
      <input
        id="intake-field-employers"
        v-model="query"
        type="search"
        placeholder="Hospital name…"
        class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
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

    <ul v-if="employers.length" class="space-y-3">
      <EmployerCard
        v-for="(employer, index) in employers"
        :key="`${employer.hospitalId || employer.name}-${index}`"
        :employer="employer"
        :index="index"
        :can-move-up="index > 0"
        :can-move-down="index < employers.length - 1"
        @update="patchEmployer(index, $event)"
        @remove="removeEmployer(index)"
        @move-up="moveEmployer(index, -1)"
        @move-down="moveEmployer(index, 1)"
      />
    </ul>
    <p v-else class="text-xs text-amber-800">
      Add at least one hospital where you worked — search above.
    </p>

    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">EMR platform</label>
      <select
        id="intake-field-emr_system"
        v-model="emr"
        class="w-full rounded-lg border border-slate-300 px-3 py-3 text-base"
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
