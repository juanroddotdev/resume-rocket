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

const filtered = computed(() => {
  let list = props.candidates
  if (!props.showAll) {
    list = list.filter(c => c.status === 'submitted' || c.status === 'confirmed')
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
          <tr v-for="c in filtered" :key="c.id" class="border-b last:border-0">
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
            <td class="px-4 py-3">{{ new Date(c.updated_at).toLocaleString() }}</td>
            <td class="px-4 py-3">{{ primaryFacility(c) }}</td>
            <td class="px-4 py-3">{{ c.emr_system || '—' }}</td>
            <td class="px-4 py-3">
              <button
                type="button"
                class="text-brand-700 hover:underline"
                title="Download VMS resume"
                @click="emit('download', c)"
              >
                ⬇ DOCX
              </button>
            </td>
          </tr>
          <tr v-if="!filtered.length">
            <td colspan="6" class="px-4 py-8 text-center text-slate-500">
              <span v-if="!candidates.length">No candidates yet. Create an intake link above, then open it to start the wizard.</span>
              <span v-else>No candidates match your search.</span>
            </td>
          </tr>
        </template>
      </tbody>
    </table>
  </div>
</template>
