<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'

const props = defineProps<{
  candidates: CandidateRow[]
  search: string
  showAll: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  download: [candidate: CandidateRow]
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

const emptyMessage = computed(() => {
  if (!props.candidates.length) {
    return 'No candidates yet. Create an intake link above, then open it to start the wizard.'
  }
  const q = props.search.trim()
  if (q) {
    return `No candidates match “${q}”. Try a different name, facility, or EMR.`
  }
  if (!props.showAll) {
    const hasDrafts = props.candidates.some(c => c.status === 'draft')
    const hasSubmitted = props.candidates.some(c => submittedStatuses.has(c.status))
    if (hasDrafts && !hasSubmitted) {
      return 'Only drafts so far — turn on Show drafts to see in-progress candidates.'
    }
  }
  return 'No candidates match your filters.'
})

function formatSubmittedAt(value: string) {
  const date = new Date(value)
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function primaryFacility(c: CandidateRow) {
  const e = c.employers?.[0]
  if (!e) return '—'
  const beds = e.beds != null ? `${e.beds} beds` : ''
  const trauma = e.traumaLevel || e.trauma_level
  return [e.name, beds, trauma ? `Trauma ${trauma}` : ''].filter(Boolean).join(' · ')
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b bg-slate-50 text-slate-600">
        <tr>
          <th class="px-4 py-3 font-medium">Name</th>
          <th class="px-4 py-3 font-medium">Status</th>
          <th class="px-4 py-3 font-medium">Submitted</th>
          <th class="px-4 py-3 font-medium">Facility</th>
          <th class="px-4 py-3 font-medium">EMR</th>
          <th class="px-4 py-3 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="n in 4" :key="n" class="border-b last:border-0">
            <td v-for="col in 6" :key="col" class="px-4 py-3">
              <div class="h-4 animate-pulse rounded bg-slate-200" :class="col === 1 ? 'w-32' : col === 6 ? 'w-16' : 'w-24'" />
            </td>
          </tr>
        </template>
        <template v-else>
          <tr v-for="c in filtered" :key="c.id" class="border-b last:border-0 hover:bg-slate-50">
            <td class="px-4 py-3">{{ c.first_name }} {{ c.last_name }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-1 capitalize">
                {{ c.status }}
                <span
                  v-if="c.parse_error"
                  class="text-amber-600"
                  title="Resume parse had issues — candidate may have entered details manually"
                >⚠</span>
              </span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-600">{{ formatSubmittedAt(c.updated_at) }}</td>
            <td class="px-4 py-3">{{ primaryFacility(c) }}</td>
            <td class="px-4 py-3">{{ c.emr_system || '—' }}</td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                title="Download VMS-ready resume (DOCX)"
                @click="emit('download', c)"
              >
                Download DOCX
              </button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="6" class="px-4 py-8 text-center text-slate-500">
              {{ emptyMessage }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
