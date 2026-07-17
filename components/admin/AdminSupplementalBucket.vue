<script setup lang="ts">
import type { SupplementalBucketItem } from '~/utils/supplementalBucket'
import type { ProfessionalSnapshotKey } from '~/utils/professionalSnapshot'
import { PROFESSIONAL_SNAPSHOT_LABELS } from '~/utils/professionalSnapshot'

defineProps<{
  items: SupplementalBucketItem[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  copy: [value: string]
  apply: [payload: { key: ProfessionalSnapshotKey; value: string }]
}>()

const copiedId = ref<string | null>(null)

async function onCopy(item: SupplementalBucketItem) {
  try {
    await navigator.clipboard.writeText(item.value)
    copiedId.value = item.id
    window.setTimeout(() => {
      if (copiedId.value === item.id) copiedId.value = null
    }, 1500)
  } catch {
    emit('copy', item.value)
  }
}
</script>

<template>
  <ul class="space-y-2">
    <li
      v-for="item in items"
      :key="item.id"
      class="group extra-detail-item rounded-md border border-brand-100/50 bg-white px-3 py-2"
    >
      <p class="text-[11px] font-medium uppercase tracking-wider text-slate-400">{{ item.label }}</p>
      <p class="mt-0.5 break-words text-sm font-medium text-slate-900">{{ item.value }}</p>
      <div class="extra-detail-actions mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          class="text-xs font-medium text-brand-700 hover:underline disabled:opacity-50"
          :disabled="disabled"
          @click="onCopy(item)"
        >
          {{ copiedId === item.id ? 'Copied' : 'Copy' }}
        </button>
        <button
          v-if="item.applyTargetKey"
          type="button"
          class="rounded border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600 hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          :disabled="disabled"
          @click="emit('apply', { key: item.applyTargetKey, value: item.value })"
        >
          Apply to {{ PROFESSIONAL_SNAPSHOT_LABELS[item.applyTargetKey] }}
        </button>
      </div>
    </li>
  </ul>
</template>
