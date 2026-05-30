<script setup lang="ts">
import type { MissingTemplateField } from '~/utils/vmsGapReview'

defineProps<{
  missing: MissingTemplateField[]
  submitting: boolean
}>()

const emit = defineEmits<{
  back: []
  submit: []
  'go-to-step': [step: number]
}>()
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-bold">Review before download</h1>
    <p class="text-sm text-slate-600">
      We need a few VMS placement fields before generating your packet. Fix anything missing below.
    </p>

    <div
      v-if="missing.length"
      class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
    >
      <p class="font-medium">Still needed ({{ missing.length }})</p>
      <ul class="mt-2 space-y-1">
        <li v-for="field in missing" :key="field.id">
          <button
            type="button"
            class="text-left underline"
            @click="emit('go-to-step', field.step)"
          >
            {{ field.label }}
          </button>
        </li>
      </ul>
    </div>

    <p v-else class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
      All required VMS fields look complete. You can download your packet.
    </p>

    <div class="flex gap-2">
      <button type="button" class="flex-1 rounded-lg border py-3" @click="emit('back')">Back</button>
      <button
        type="button"
        class="flex-1 rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-50"
        :disabled="submitting || missing.length > 0"
        @click="emit('submit')"
      >
        {{ submitting ? 'Preparing…' : 'Download VMS-Ready Resume' }}
      </button>
    </div>
  </div>
</template>
