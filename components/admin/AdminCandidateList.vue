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
  delete: [candidate: CandidateRow]
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

function onDeleteClick(event: MouseEvent, c: CandidateRow) {
  event.stopPropagation()
  emit('delete', c)
}
</script>

<template>
  <div>
    <div v-if="loading" class="space-y-2">
      <div v-for="n in 4" :key="n" class="h-10 animate-pulse rounded-lg bg-slate-200/60" />
    </div>
    <ul v-else-if="filtered.length" class="space-y-0.5">
      <li v-for="c in filtered" :key="c.id" class="group relative">
        <button
          type="button"
          class="flex w-full flex-col items-start rounded-md px-2.5 py-2 pr-8 text-left text-sm transition hover:bg-white/70"
          :class="selectedId === c.id ? 'bg-white shadow-sm ring-1 ring-inset ring-brand-200' : ''"
          @click="emit('select', c)"
        >
          <span class="font-medium text-slate-900">{{ candidateDisplayName(c) }}</span>
          <span class="mt-0.5 text-xs capitalize text-slate-500">{{ c.status }}</span>
        </button>
        <button
          v-if="c.status === 'draft'"
          type="button"
          class="absolute right-1 top-1.5 rounded p-1 text-slate-400 opacity-0 transition hover:bg-red-50 hover:text-red-700 group-hover:opacity-100 focus:opacity-100"
          title="Delete draft"
          aria-label="Delete draft"
          @click="onDeleteClick($event, c)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4 w-4" aria-hidden="true">
            <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193v-.443A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
          </svg>
        </button>
      </li>
    </ul>
    <p v-else class="px-2.5 py-6 text-center text-sm text-slate-500">
      No candidates yet. Create a packet to get started.
    </p>
  </div>
</template>
