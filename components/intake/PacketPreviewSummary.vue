<script setup lang="ts">
import type { CandidateDraftInput } from '~/types/candidate'
import { buildPacketPreviewSections } from '~/utils/packetPreviewSections'

const props = defineProps<{
  form: CandidateDraftInput
}>()

const sections = computed(() => buildPacketPreviewSections(props.form))

const metricFieldLabels = new Set([
  'Hospital beds',
  'Trauma level',
  'Teaching facility',
  'Unit beds',
  'Avg daily patients',
])
</script>

<template>
  <section
    id="packet-preview-summary"
    role="region"
    aria-labelledby="packet-preview-heading"
    class="space-y-5 rounded-lg border border-slate-200 bg-white p-4"
  >
    <h2 id="packet-preview-heading" class="text-lg font-semibold text-slate-900">
      Packet summary
    </h2>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-slate-800">Identity</h3>
      <dl class="grid gap-2 sm:grid-cols-2">
        <div v-for="field in sections.identity" :key="field.label">
          <dt class="text-xs text-slate-500">{{ field.label }}</dt>
          <dd class="text-sm text-slate-900">{{ field.value }}</dd>
        </div>
      </dl>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-slate-800">RN licenses</h3>
      <ul v-if="sections.licenses.length" class="space-y-1 text-sm text-slate-900">
        <li v-for="(line, index) in sections.licenses" :key="`license-${index}`">
          {{ line }}
        </li>
      </ul>
      <p v-else class="text-sm text-slate-600">No licenses added yet.</p>
      <p class="text-sm text-slate-700">
        <span class="text-xs text-slate-500">Compact license status:</span>
        {{ sections.compactLicenseStatus }}
      </p>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-slate-800">Clinical summary</h3>
      <dl class="grid gap-2 sm:grid-cols-2">
        <div v-for="field in sections.clinical" :key="field.label">
          <dt class="text-xs text-slate-500">{{ field.label }}</dt>
          <dd class="text-sm text-slate-900">{{ field.value }}</dd>
        </div>
      </dl>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-slate-800">Certifications</h3>
      <ul v-if="sections.certifications.length" class="space-y-1">
        <li
          v-for="cert in sections.certifications"
          :key="cert.name"
          class="flex flex-wrap gap-x-2 text-sm text-slate-900"
        >
          <span class="font-medium">{{ cert.name }}</span>
          <span class="text-slate-500">Expires {{ cert.expiry }}</span>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-600">No active certifications selected.</p>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-slate-800">Education</h3>
      <ul v-if="sections.education.length" class="space-y-3">
        <li
          v-for="(entry, index) in sections.education"
          :key="`education-${index}`"
          class="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
        >
          <p class="font-medium text-slate-900">{{ entry.degree }}</p>
          <p class="text-slate-700">{{ entry.school }}</p>
          <p class="text-slate-500">Graduation {{ entry.graduation }}</p>
        </li>
      </ul>
      <p v-else class="text-sm text-slate-600">No education entries yet.</p>
    </div>

    <div class="space-y-2">
      <h3 class="text-sm font-medium text-slate-800">Employment history</h3>
      <div v-if="sections.employers.length" class="space-y-4">
        <article
          v-for="(employer, index) in sections.employers"
          :key="`employer-${index}`"
          class="rounded-lg border border-slate-200 bg-slate-50 p-3"
        >
          <h4 class="text-sm font-semibold text-slate-900">{{ employer.title }}</h4>
          <dl class="mt-2 grid gap-2 sm:grid-cols-2">
            <template v-for="field in employer.fields" :key="field.label">
              <div v-if="metricFieldLabels.has(field.label)">
                <MetricTile :label="field.label" :value="field.value" />
              </div>
              <div v-else>
                <dt class="text-xs text-slate-500">{{ field.label }}</dt>
                <dd class="text-sm text-slate-900">{{ field.value }}</dd>
              </div>
            </template>
          </dl>
          <div v-if="employer.highlights.length" class="mt-2">
            <p class="text-xs text-slate-500">Highlights</p>
            <ul class="mt-1 list-inside list-disc text-sm text-slate-800">
              <li v-for="(highlight, hi) in employer.highlights" :key="`highlight-${hi}`">
                {{ highlight }}
              </li>
            </ul>
          </div>
        </article>
      </div>
      <p v-else class="text-sm text-slate-600">No employment history yet.</p>
    </div>
  </section>
</template>
