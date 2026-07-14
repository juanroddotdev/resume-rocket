<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import { isStoredEmrComplete } from '~/utils/emrSystem'

const props = defineProps<{
  open: boolean
  employers: EmployerEntry[]
  activeIndex: number
  legacyEmrSystem?: string
  /** Shown under the title in admin builder. */
  candidateName?: string
  /** Override positioning classes (intake uses fixed; admin uses absolute in builder). */
  panelClass?: string
}>()

const emit = defineEmits<{
  close: []
  select: [index: number]
}>()

function closePanel() {
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    closePanel()
  }
}

function employerJumpLabel(employer: EmployerEntry) {
  return employer.name?.trim() || 'Hospital name not set'
}

function employerJumpMeta(employer: EmployerEntry) {
  const role = employer.role?.trim() || 'Role not set'
  const start = employer.startDate?.trim()
  const end = employer.endDate?.trim()
  const dates = !start && !end ? 'Dates not set' : `${start || '—'} – ${end || 'Present'}`
  return `${role} · ${dates}`
}

function employerNeedsAttention(employer: EmployerEntry) {
  if (!employer.name?.trim()) return true
  return !isStoredEmrComplete(employer.emrSystem || props.legacyEmrSystem)
}

function onSelect(index: number) {
  emit('select', index)
  closePanel()
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="employers-jump-card">
    <aside
      v-if="open"
      class="flex w-[min(100%-1.5rem,28rem)] flex-col overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 shadow-2xl sm:w-[min(100%-1.5rem,32rem)]"
      :class="panelClass || 'absolute bottom-3 right-3 top-14 z-40'"
      role="complementary"
      :aria-label="candidateName ? `Employers for ${candidateName}` : 'Employers'"
    >
      <div class="flex items-start justify-between gap-3 border-b border-brand-100/80 px-5 py-4">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-slate-900">
            Employers{{ employers.length ? ` (${employers.length})` : '' }}
          </h2>
          <p v-if="candidateName" class="mt-0.5 truncate text-sm text-slate-600">{{ candidateName }}</p>
          <p v-else class="mt-0.5 text-sm text-slate-600">Jump to a hospital without scrolling the whole list.</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-white/70"
          @click="closePanel"
        >
          Close
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        <p
          v-if="!employers.length"
          class="px-2 text-sm text-slate-600"
          role="status"
        >
          No employers yet — search or add a hospital to start.
        </p>
        <ul v-else class="space-y-0.5" role="list">
          <li v-for="(employer, index) in employers" :key="`emp-jump-${index}`">
            <button
              type="button"
              class="flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition"
              :class="index === activeIndex
                ? 'bg-white font-medium text-brand-900 ring-1 ring-brand-200'
                : 'text-slate-800 hover:bg-white/70'"
              :aria-current="index === activeIndex ? 'true' : undefined"
              @click="onSelect(index)"
            >
              <span class="mt-0.5 w-5 shrink-0 text-xs tabular-nums text-slate-400">{{ index + 1 }}</span>
              <span class="min-w-0 flex-1">
                <span class="block truncate">{{ employerJumpLabel(employer) }}</span>
                <span class="block truncate text-xs font-normal text-slate-500">{{ employerJumpMeta(employer) }}</span>
              </span>
              <span
                v-if="employerNeedsAttention(employer)"
                class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500"
                title="Needs attention (name or EMR)"
                aria-label="Needs attention"
              />
            </button>
          </li>
        </ul>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.employers-jump-card-enter-active,
.employers-jump-card-leave-active {
  transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}

.employers-jump-card-enter-from,
.employers-jump-card-leave-to {
  transform: translate3d(calc(100% + 1.5rem), 0, 0);
}
</style>
