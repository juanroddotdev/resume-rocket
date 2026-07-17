<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'
import { displayCandidateEmr } from '~/utils/emrSystem'

export type CandidateListFilter = 'all' | 'draft' | 'submitted'

const props = defineProps<{
  candidates: CandidateRow[]
  search: string
  listFilter: CandidateListFilter
  loading?: boolean
  selectedId?: string | null
}>()

const emit = defineEmits<{
  select: [candidate: CandidateRow]
}>()

const submittedStatuses = new Set(['submitted', 'confirmed'])

const filtered = computed(() => {
  let list = props.candidates
  if (props.listFilter === 'draft') {
    list = list.filter(c => c.status === 'draft')
  } else if (props.listFilter === 'submitted') {
    list = list.filter(c => submittedStatuses.has(c.status))
  }
  const q = props.search.toLowerCase().trim()
  if (!q) return list
  return list.filter((c) => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    const emr = displayCandidateEmr(c).toLowerCase()
    const facility = (c.employers?.[0]?.name || '').toLowerCase()
    return name.includes(q) || emr.includes(q) || facility.includes(q)
  })
})

function candidateDisplayName(c: CandidateRow) {
  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()
  return name || 'Unnamed candidate'
}
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-2">
      <div v-for="n in 4" :key="n" class="h-10 animate-pulse rounded-lg bg-slate-200/60" />
    </div>
    <ul v-else-if="filtered.length" class="space-y-0.5">
      <li v-for="c in filtered" :key="c.id">
        <button
          type="button"
          class="flex w-full flex-col items-start rounded-md px-2.5 py-2 text-left text-sm transition hover:bg-white/70"
          :class="selectedId === c.id ? 'bg-white shadow-sm ring-1 ring-inset ring-brand-200' : ''"
          @click="emit('select', c)"
        >
          <span class="font-medium text-slate-900">{{ candidateDisplayName(c) }}</span>
          <span class="mt-0.5 text-xs capitalize text-slate-500">{{ c.status }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="px-2.5 py-6 text-center text-sm text-slate-500">
      No candidates yet. Create a packet to get started.
    </p>
  </div>
</template>
