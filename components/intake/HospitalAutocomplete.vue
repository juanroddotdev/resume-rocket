<script setup lang="ts">
import type { HospitalRow } from '~/types/hospital'
import type { EmployerEntry } from '~/types/candidate'

const props = defineProps<{
  employers: EmployerEntry[]
}>()

const emit = defineEmits<{
  'update:employers': [value: EmployerEntry[]]
}>()

const query = ref('')
const results = ref<HospitalRow[]>([])
const emr = defineModel<string>('emr', { default: '' })
const searching = ref(false)

let debounce: ReturnType<typeof setTimeout> | null = null

watch(query, (q) => {
  if (debounce) clearTimeout(debounce)
  if (q.length < 2) {
    results.value = []
    return
  }
  debounce = setTimeout(async () => {
    searching.value = true
    try {
      const res = await $fetch<{ hospitals: HospitalRow[] }>('/api/hospitals/search', {
        query: { query: q },
      })
      results.value = res.hospitals
    } finally {
      searching.value = false
    }
  }, 300)
})

function addHospital(h: HospitalRow) {
  const entry: EmployerEntry = {
    name: h.name,
    city: h.city || undefined,
    state: h.state || undefined,
    hospitalId: h.id,
    beds: h.beds ?? undefined,
    traumaLevel: h.trauma_level ?? undefined,
  }
  if (!props.employers.some(e => e.hospitalId === h.id || e.name === h.name)) {
    emit('update:employers', [...props.employers, entry])
  }
  query.value = ''
  results.value = []
}

function removeEmployer(index: number) {
  const next = [...props.employers]
  next.splice(index, 1)
  emit('update:employers', next)
}

</script>

<template>
  <div class="space-y-4">
    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">Search facilities</label>
      <input
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
    </div>

    <ul v-if="employers.length" class="space-y-2">
      <li
        v-for="(e, i) in employers"
        :key="i"
        class="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-2 text-sm"
      >
        <span>{{ e.name }}</span>
        <button type="button" class="text-red-600" @click="removeEmployer(i)">Remove</button>
      </li>
    </ul>

    <div>
      <label class="mb-1 block text-sm font-medium text-slate-700">EMR platform</label>
      <select
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
