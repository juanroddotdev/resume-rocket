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
  remove: [index: number]
  'move-up': [index: number]
  'move-down': [index: number]
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

function onMoveUp(index: number, event: Event) {
  event.stopPropagation()
  if (index <= 0) return
  emit('move-up', index)
}

function onMoveDown(index: number, event: Event) {
  event.stopPropagation()
  if (index >= props.employers.length - 1) return
  emit('move-down', index)
}

function onRemove(index: number, event: Event) {
  event.stopPropagation()
  emit('remove', index)
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
          <p v-else class="mt-0.5 text-sm text-slate-600">Jump, reorder, or remove hospitals here.</p>
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
          <li
            v-for="(employer, index) in employers"
            :key="`emp-jump-${index}`"
            class="flex items-start gap-0.5 rounded-lg"
            :class="index === activeIndex ? 'bg-white ring-1 ring-brand-200' : 'hover:bg-white/70'"
          >
            <button
              type="button"
              class="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition"
              :class="index === activeIndex
                ? 'font-medium text-brand-900'
                : 'text-slate-800'"
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
            <div class="flex shrink-0 items-center gap-0.5 py-2 pr-2">
              <button
                type="button"
                class="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Move employer up"
                :disabled="index === 0"
                @click="onMoveUp(index, $event)"
              >
                ↑
              </button>
              <button
                type="button"
                class="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Move employer down"
                :disabled="index >= employers.length - 1"
                @click="onMoveDown(index, $event)"
              >
                ↓
              </button>
              <button
                type="button"
                class="rounded border border-red-200 bg-white p-1 text-red-600 hover:bg-red-50"
                aria-label="Remove employer"
                @click="onRemove(index, $event)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="h-3.5 w-3.5" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              </button>
            </div>
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
