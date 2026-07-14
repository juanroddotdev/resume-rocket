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

function onBackdropClick(event: MouseEvent) {
  if (event.target === event.currentTarget) closePanel()
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
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      role="dialog"
      aria-modal="true"
      :aria-label="`Extra details for ${candidateName}`"
      @click="onBackdropClick"
    >
      <div class="flex h-full w-full max-w-md flex-col bg-white shadow-xl sm:max-w-lg">
        <div class="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div class="min-w-0">
            <h2 class="text-lg font-semibold text-slate-900">Extra details</h2>
            <p class="mt-0.5 truncate text-sm text-slate-600">{{ candidateName }}</p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
            @click="closePanel"
          >
            Close
          </button>
        </div>

        <div class="shrink-0 space-y-2 border-b border-slate-100 px-5 py-3">
          <p class="text-sm text-slate-600">
            Already in this profile from the resume or intake. Not included in the download unless you copy them or apply onto a Snapshot line (then check Include).
          </p>
          <p
            v-if="applyNotice"
            class="text-sm text-slate-700"
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
      </div>
    </div>
  </Teleport>
</template>
