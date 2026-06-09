<script setup lang="ts">
import type { EmployerLinkAdvisory, MissingTemplateField } from '~/utils/vmsGapReview'

const props = defineProps<{
  missing: MissingTemplateField[]
  advisories?: EmployerLinkAdvisory[]
  submitting: boolean
  allowIncompleteSubmit?: boolean
}>()

const emit = defineEmits<{
  back: []
  submit: []
  'go-to-field': [payload: { step: number; fieldId: string }]
}>()
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-xl font-bold">Review before download</h1>
    <p class="text-sm text-slate-600">
      <template v-if="props.allowIncompleteSubmit">
        Admin preview — review gaps below. You can download a draft packet; candidate status stays unchanged.
      </template>
      <template v-else>
        We need a few VMS placement fields before generating your packet. Fix anything missing below.
      </template>
    </p>

    <div
      v-if="missing.length"
      class="rounded-lg border px-3 py-3 text-sm"
      :class="props.allowIncompleteSubmit
        ? 'border-slate-200 bg-slate-50 text-slate-800'
        : 'border-amber-200 bg-amber-50 text-amber-950'"
    >
      <p class="font-medium">
        {{ props.allowIncompleteSubmit ? 'Incomplete fields' : 'Still needed' }} ({{ missing.length }})
      </p>
      <ul class="mt-2 space-y-1">
        <li v-for="field in missing" :key="field.id">
          <button
            type="button"
            class="text-left underline"
            @click="emit('go-to-field', { step: field.step, fieldId: field.id })"
          >
            {{ field.label }}
          </button>
        </li>
      </ul>
    </div>

    <div
      v-if="advisories?.length"
      class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
    >
      <p class="font-medium">Recommended (optional)</p>
      <ul class="mt-2 space-y-1">
        <li v-for="item in advisories" :key="item.id">
          <button
            type="button"
            class="text-left underline"
            @click="emit('go-to-field', { step: item.step, fieldId: item.id })"
          >
            {{ item.label }}
          </button>
        </li>
      </ul>
    </div>

    <p v-if="!missing.length" class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900">
      All required VMS fields look complete. You can download your packet.
    </p>
    <p
      v-else-if="props.allowIncompleteSubmit"
      class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
    >
      Admin view: download will include blank sections for missing fields above.
    </p>

    <div class="flex gap-2">
      <button type="button" class="flex-1 rounded-lg border py-3" @click="emit('back')">Back</button>
      <button
        type="button"
        class="flex-1 rounded-lg bg-brand-600 py-3 font-bold text-white disabled:opacity-50"
        :disabled="submitting || (!props.allowIncompleteSubmit && missing.length > 0)"
        @click="emit('submit')"
      >
        {{
          submitting
            ? 'Preparing your packet…'
            : props.allowIncompleteSubmit
              ? 'Download draft packet'
              : 'Download VMS-Ready Resume'
        }}
      </button>
    </div>
  </div>
</template>
