<script setup lang="ts">
import type { SupplementalBucketItem } from '~/utils/supplementalBucket'
import type { ProfessionalSnapshotKey } from '~/utils/professionalSnapshot'

const props = defineProps<{
  open: boolean
  items: SupplementalBucketItem[]
  candidateName: string
  hasResume?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  close: []
  apply: [payload: { key: ProfessionalSnapshotKey; value: string }]
  'go-to-snapshot': []
}>()

const applyNotice = ref<string | null>(null)

watch(
  () => props.open,
  (open) => {
    if (!open) applyNotice.value = null
  },
)

function closePanel() {
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    closePanel()
  }
}

function onApply(payload: { key: ProfessionalSnapshotKey; value: string }) {
  emit('apply', payload)
  applyNotice.value = 'Applied to Snapshot — check Include on that line to put it in the packet.'
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Transition name="extra-details-card">
    <aside
      v-if="open"
      class="absolute bottom-3 right-3 top-14 z-40 flex w-[min(100%-1.5rem,28rem)] flex-col overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 shadow-2xl sm:w-[min(100%-1.5rem,32rem)]"
      role="complementary"
      :aria-label="`Extra details for ${candidateName}`"
    >
      <div class="flex items-start justify-between gap-3 border-b border-brand-100/80 px-5 py-4">
        <div class="min-w-0">
          <h2 class="text-lg font-semibold text-slate-900">Extra details</h2>
          <p class="mt-0.5 truncate text-sm text-slate-600">{{ candidateName }}</p>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-white/70"
          @click="closePanel"
        >
          Close
        </button>
      </div>

      <div class="shrink-0 space-y-2 border-b border-brand-100/80 px-5 py-3">
        <p class="text-sm text-slate-600">
          Already in this profile from the resume or intake. Not included in the download unless you copy them or apply onto a Snapshot line (then check Include).
        </p>
        <p
          v-if="applyNotice"
          class="rounded-md border border-brand-100 bg-white/80 px-3 py-2 text-sm text-slate-700"
          role="status"
        >
          {{ applyNotice }}
          <button
            type="button"
            class="ml-1 font-medium text-brand-700 underline hover:no-underline"
            @click="emit('go-to-snapshot'); closePanel()"
          >
            Go to Snapshot
          </button>
        </p>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p
          v-if="!items.length && hasResume === false"
          class="text-sm text-slate-600"
          role="status"
        >
          Upload a resume (or fill Employment and Credentials) to pull extra details you can copy without opening the original file.
        </p>
        <p
          v-else-if="!items.length"
          class="text-sm text-slate-500"
          role="status"
        >
          Nothing extra beyond what’s already on the form. As you fill Employment and Credentials, useful copy-ready lines will show up here.
        </p>
        <AdminSupplementalBucket
          v-else
          :items="items"
          :disabled="disabled"
          @apply="onApply"
        />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.extra-details-card-enter-active,
.extra-details-card-leave-active {
  transition: transform 320ms cubic-bezier(0.32, 0.72, 0, 1);
  will-change: transform;
}

.extra-details-card-enter-from,
.extra-details-card-leave-to {
  transform: translate3d(calc(100% + 1.5rem), 0, 0);
}
</style>
