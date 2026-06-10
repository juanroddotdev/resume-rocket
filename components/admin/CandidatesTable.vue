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
  'open-parse-qa': [candidate: CandidateRow]
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

function candidateDisplayName(c: CandidateRow) {
  const name = `${c.first_name || ''} ${c.last_name || ''}`.trim()
  return name || 'Unnamed candidate'
}

function parseOutcomeChips(c: CandidateRow) {
  const outcome = c.parse_outcome
  if (!outcome) return []
  const chips: Array<{ label: string; className: string }> = []
  if (outcome.document_scan) {
    chips.push({ label: 'Vision', className: 'bg-brand-100 text-brand-800' })
  }
  if (outcome.partial_parse) {
    chips.push({ label: 'Partial', className: 'bg-amber-100 text-amber-900' })
  } else if (!outcome.parse_failed) {
    chips.push({ label: 'OK', className: 'bg-emerald-100 text-emerald-800' })
  }
  if (outcome.parse_failed) {
    chips.push({ label: 'Failed', className: 'bg-red-100 text-red-800' })
  }
  return chips
}
</script>

<template>
  <div class="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:overflow-visible">
    <table class="min-w-full text-left text-sm">
      <thead class="border-b bg-slate-50 text-slate-600">
        <tr>
          <th class="px-4 py-3 font-medium">Name</th>
          <th class="px-4 py-3 font-medium">Status</th>
          <th class="hidden px-4 py-3 font-medium lg:table-cell">Parse</th>
          <th class="px-4 py-3 font-medium">Submitted</th>
          <th class="px-4 py-3 font-medium">Facility</th>
          <th class="hidden px-4 py-3 font-medium md:table-cell">EMR</th>
          <th class="px-4 py-3 font-medium">Actions</th>
        </tr>
      </thead>
      <tbody>
        <template v-if="loading">
          <tr v-for="n in 4" :key="n" class="border-b last:border-0">
            <td v-for="col in 7" :key="col" class="px-4 py-3">
              <div class="h-4 animate-pulse rounded bg-slate-200" :class="col === 1 ? 'w-32' : col === 7 ? 'w-24' : 'w-20'" />
            </td>
          </tr>
        </template>
        <template v-else>
          <tr v-for="c in filtered" :key="c.id" class="border-b last:border-0 hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-900">{{ candidateDisplayName(c) }}</td>
            <td class="px-4 py-3">
              <span class="inline-flex flex-wrap items-center gap-1.5 capitalize">
                {{ c.status }}
                <span
                  v-if="c.parse_error"
                  class="text-amber-600"
                  title="Resume parse had issues — candidate may have entered details manually"
                >⚠</span>
                <span
                  v-for="chip in parseOutcomeChips(c)"
                  :key="`${c.id}-${chip.label}`"
                  class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide lg:hidden"
                  :class="chip.className"
                >
                  {{ chip.label }}
                </span>
              </span>
            </td>
            <td class="hidden px-4 py-3 lg:table-cell">
              <div v-if="parseOutcomeChips(c).length" class="flex flex-wrap gap-1">
                <span
                  v-for="chip in parseOutcomeChips(c)"
                  :key="`${c.id}-lg-${chip.label}`"
                  class="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  :class="chip.className"
                >
                  {{ chip.label }}
                </span>
              </div>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="whitespace-nowrap px-4 py-3 text-slate-600">{{ formatSubmittedAt(c.updated_at) }}</td>
            <td class="max-w-xs px-4 py-3 text-slate-700">{{ primaryFacility(c) }}</td>
            <td class="hidden px-4 py-3 md:table-cell">{{ c.emr_system || '—' }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  title="Review parse outcome and employer evidence"
                  @click="emit('open-parse-qa', c)"
                >
                  Parse QA
                </button>
                <button
                  type="button"
                  class="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                  title="Download VMS-ready resume (DOCX)"
                  @click="emit('download', c)"
                >
                  Download DOCX
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="7" class="px-4 py-8 text-center text-slate-500">
              {{ emptyMessage }}
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
