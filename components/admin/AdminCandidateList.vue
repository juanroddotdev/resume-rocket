<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'

const props = defineProps<{
  candidates: CandidateRow[]
  search: string
  showAll: boolean
  loading?: boolean
  selectedId?: string | null
}>()

const emit = defineEmits<{
  select: [candidate: CandidateRow]
}>()

const submittedStatuses = new Set(['submitted', 'confirmed'])

const filtered = computed(() => {
  let list = props.candidates
  if (!props.showAll) {
    list = list.filter(c => submittedStatuses.has(c.status))
  }
  const q = props.search.toLowerCase().trim()
  if (!q) return list
  return list.filter((c) => {
    const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase()
    const emr = (c.emr_system || '').toLowerCase()
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
  <div class="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div v-if="loading" class="space-y-2 p-3">
      <div v-for="n in 4" :key="n" class="h-10 animate-pulse rounded-lg bg-slate-100" />
    </div>
    <ul v-else-if="filtered.length" class="max-h-80 divide-y divide-slate-100 overflow-y-auto">
      <li v-for="c in filtered" :key="c.id">
        <button
          type="button"
          class="flex w-full flex-col items-start px-3 py-2.5 text-left text-sm transition hover:bg-slate-50"
          :class="selectedId === c.id ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : ''"
          @click="emit('select', c)"
        >
          <span class="font-medium text-slate-900">{{ candidateDisplayName(c) }}</span>
          <span class="mt-0.5 text-xs capitalize text-slate-500">{{ c.status }}</span>
        </button>
      </li>
    </ul>
    <p v-else class="px-3 py-6 text-center text-sm text-slate-500">
      No candidates yet. Create a link, then upload a resume in the builder.
    </p>
  </div>
</template>
