<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'
import { displayCandidateEmr } from '~/utils/emrSystem'

const props = defineProps<{
  candidates: CandidateRow[]
  search: string
  listFilter: 'all' | 'draft' | 'submitted'
  loading?: boolean
  selectedId?: string | null
}>()

const emit = defineEmits<{
  select: [candidate: CandidateRow]
  download: [candidate: CandidateRow]
  'open-intake': [candidate: CandidateRow]
  'copy-intake': [candidate: CandidateRow]
  delete: [candidate: CandidateRow]
}>()

const copiedIntakeId = ref<string | null>(null)
const menuOpenId = ref<string | null>(null)
let copiedIntakeTimer: ReturnType<typeof setTimeout> | null = null

async function copyIntakeLink(c: CandidateRow) {
  if (!c.intake_url) return
  try {
    await navigator.clipboard.writeText(c.intake_url)
    copiedIntakeId.value = c.id
    emit('copy-intake', c)
    if (copiedIntakeTimer) clearTimeout(copiedIntakeTimer)
    copiedIntakeTimer = setTimeout(() => {
      if (copiedIntakeId.value === c.id) copiedIntakeId.value = null
      if (menuOpenId.value === c.id) closeMenu()
    }, 1200)
  } catch {
    closeMenu()
  }
}

function toggleMenu(c: CandidateRow) {
  menuOpenId.value = menuOpenId.value === c.id ? null : c.id
}

function closeMenu() {
  menuOpenId.value = null
}

function runAndClose(action: () => void) {
  action()
  closeMenu()
}

function onDocumentClick(event: MouseEvent) {
  if (!menuOpenId.value) return
  const target = event.target as HTMLElement | null
  const inOpenMenu = target?.closest?.(`[data-menu-for="${menuOpenId.value}"]`)
  if (!inOpenMenu) closeMenu()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && menuOpenId.value) {
    event.preventDefault()
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('keydown', onKeydown)
  if (copiedIntakeTimer) clearTimeout(copiedIntakeTimer)
})

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

const emptyMessage = computed(() => {
  if (!props.candidates.length) {
    return 'No candidates yet — create an intake link or packet above.'
  }
  const q = props.search.trim()
  if (q) {
    return `No candidates match “${q}”. Try a different name, facility, or EMR.`
  }
  if (props.listFilter === 'submitted') {
    const hasDrafts = props.candidates.some(c => c.status === 'draft')
    const hasSubmitted = props.candidates.some(c => submittedStatuses.has(c.status))
    if (hasDrafts && !hasSubmitted) {
      return 'Only drafts so far — switch to Drafts or All to see in-progress candidates.'
    }
  }
  if (props.listFilter === 'draft') {
    const hasDrafts = props.candidates.some(c => c.status === 'draft')
    if (!hasDrafts) {
      return 'No drafts right now — switch to Submitted or All to browse other candidates.'
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

function intakeLinkActive(c: CandidateRow) {
  return c.status === 'draft' && Boolean(c.intake_url)
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
          <th class="px-4 py-3 font-medium">Updated</th>
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
          <tr
            v-for="c in filtered"
            :key="c.id"
            class="border-b last:border-0 hover:bg-slate-50"
            :class="selectedId === c.id ? 'bg-brand-50 ring-1 ring-inset ring-brand-200' : ''"
            :aria-selected="selectedId === c.id"
          >
            <td class="px-4 py-3 font-medium text-slate-900">
              <button
                type="button"
                class="text-left font-medium text-brand-800 hover:underline"
                @click="closeMenu(); emit('select', c)"
              >
                {{ candidateDisplayName(c) }}
              </button>
            </td>
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
            <td class="hidden px-4 py-3 md:table-cell">{{ displayCandidateEmr(c) || '—' }}</td>
            <td class="px-4 py-3">
              <div class="flex flex-nowrap items-center gap-1.5">
                <button
                  type="button"
                  class="rounded-lg border border-brand-200 px-2.5 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50"
                  title="Open this candidate in the resume builder"
                  @click="closeMenu(); emit('select', c)"
                >
                  Open
                </button>
                <div class="relative" :data-menu-for="c.id">
                  <button
                    type="button"
                    class="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium leading-none text-slate-700 hover:bg-slate-50"
                    title="More actions"
                    aria-label="More actions"
                    aria-haspopup="menu"
                    :aria-expanded="menuOpenId === c.id"
                    @click.stop="toggleMenu(c)"
                  >
                    ···
                  </button>
                  <div
                    v-if="menuOpenId === c.id"
                    class="absolute right-0 z-50 mt-1 min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                    role="menu"
                    @click.stop
                  >
                    <button
                      v-if="intakeLinkActive(c)"
                      type="button"
                      class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      @click="copyIntakeLink(c)"
                    >
                      {{ copiedIntakeId === c.id ? 'Copied!' : 'Copy intake link' }}
                    </button>
                    <button
                      v-if="intakeLinkActive(c)"
                      type="button"
                      class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      @click="runAndClose(() => emit('open-intake', c))"
                    >
                      Open intake
                    </button>
                    <button
                      type="button"
                      class="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                      role="menuitem"
                      @click="runAndClose(() => emit('download', c))"
                    >
                      Download DOCX
                    </button>
                    <template v-if="c.status === 'draft'">
                      <div class="my-1 border-t border-slate-100" role="separator" />
                      <button
                        type="button"
                        class="block w-full px-3 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                        role="menuitem"
                        @click="runAndClose(() => emit('delete', c))"
                      >
                        Delete draft
                      </button>
                    </template>
                  </div>
                </div>
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
