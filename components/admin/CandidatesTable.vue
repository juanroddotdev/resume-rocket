<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'

const props = defineProps<{
  candidates: CandidateRow[]
  search: string
  showAll: boolean
}>()

const emit = defineEmits<{
  download: [id: string]
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
        <tr v-for="c in filtered" :key="c.id" class="border-b last:border-0">
          <td class="px-4 py-3">{{ c.first_name }} {{ c.last_name }}</td>
          <td class="px-4 py-3 capitalize">{{ c.status }}</td>
          <td class="px-4 py-3">{{ new Date(c.updated_at).toLocaleString() }}</td>
          <td class="px-4 py-3">{{ primaryFacility(c) }}</td>
          <td class="px-4 py-3">{{ c.emr_system || '—' }}</td>
          <td class="px-4 py-3">
            <button
              type="button"
              class="text-brand-700 hover:underline"
              title="Download VMS resume"
              @click="emit('download', c.id)"
            >
              ⬇ DOCX
            </button>
          </td>
        </tr>
        <tr v-if="!filtered.length">
          <td colspan="6" class="px-4 py-8 text-center text-slate-500">No candidates found</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
