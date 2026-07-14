<script setup lang="ts">
import type { SupplementalBucketItem } from '~/utils/supplementalBucket'
import type { ProfessionalSnapshotKey } from '~/utils/professionalSnapshot'
import { PROFESSIONAL_SNAPSHOT_LABELS } from '~/utils/professionalSnapshot'

defineProps<{
  items: SupplementalBucketItem[]
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
  <div class="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
    <div>
      <p class="text-sm font-medium text-slate-800">Extra details (not in packet)</p>
      <p class="mt-1 text-sm text-slate-600">
        Already in this profile from the resume or intake. Not included in the download unless you copy them or apply onto a Snapshot line (then check Include).
      </p>
    </div>

    <p v-if="!items.length" class="text-sm text-slate-500">
      Nothing extra yet — fill Employment and Credentials, or upload a resume, to populate this list.
    </p>

    <ul v-else class="max-h-72 space-y-2 overflow-y-auto">
      <li
        v-for="item in items"
        :key="item.id"
        class="rounded-md border border-slate-100 bg-slate-50 px-3 py-2"
      >
        <p class="text-xs font-medium uppercase tracking-wide text-slate-500">{{ item.label }}</p>
        <p class="mt-0.5 break-words text-sm text-slate-800">{{ item.value }}</p>
        <div class="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            @click="onCopy(item)"
          >
            {{ copiedId === item.id ? 'Copied' : 'Copy' }}
          </button>
          <button
            v-if="item.applyTargetKey"
            type="button"
            class="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            @click="emit('apply', { key: item.applyTargetKey, value: item.value })"
          >
            Apply to {{ PROFESSIONAL_SNAPSHOT_LABELS[item.applyTargetKey] }}
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>
