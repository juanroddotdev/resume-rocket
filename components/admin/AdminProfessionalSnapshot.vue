<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import type {
  ProfessionalSnapshot,
  ProfessionalSnapshotKey,
  ProfessionalSnapshotLine,
  SnapshotExperienceAnswer,
  SnapshotProposals,
} from '~/utils/professionalSnapshot'
import {
  PROFESSIONAL_SNAPSHOT_KEYS,
  PROFESSIONAL_SNAPSHOT_LABELS,
  SNAPSHOT_EXPERIENCE_FLAG_KEYS,
  applySnapshotProposals,
  buildProfessionalSnapshotFromCandidate,
  computeSnapshotMismatches,
  ensureProfessionalSnapshotLines,
  formatExperienceFlagValue,
  parseExperienceFlagValue,
} from '~/utils/professionalSnapshot'

/** Short free-text lines — paired in a 2-column grid. */
const SHORT_TEXT_KEYS = [
  'snapshot_specialty',
  'snapshot_years_experience',
  'snapshot_emr_systems',
  'snapshot_patient_ratios_managed',
] as const satisfies readonly ProfessionalSnapshotKey[]

/** Longer free-text — full width under the grid. */
const FULL_WIDTH_TEXT_KEYS = [
  'snapshot_equipment_skills',
] as const satisfies readonly ProfessionalSnapshotKey[]

const model = defineModel<ProfessionalSnapshot>({ default: () => ({}) })

const props = defineProps<{
  specialties: string[]
  yearsNursingExperience: string
  averagePatientRatios: string
  specializedMedicalEquipment: string
  emrSystem: string
  employers: EmployerEntry[]
  candidateId?: string
  getAuthHeaders?: () => Promise<Record<string, string>>
  hasResume?: boolean
  extraDetailsCount?: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  'go-to-employment': []
  'open-extra-details': []
}>()

const proposing = ref(false)
const proposeError = ref<string | null>(null)
const proposeNotice = ref<string | null>(null)
/** Keys last filled by regenerate — used for batch “Include all proposed”. */
const pendingProposedKeys = ref<ProfessionalSnapshotKey[]>([])

const lines = computed({
  get: () => ensureProfessionalSnapshotLines(model.value),
  set: (next: Record<ProfessionalSnapshotKey, ProfessionalSnapshotLine>) => {
    model.value = { ...next }
  },
})

const mismatches = computed(() =>
  computeSnapshotMismatches(model.value, {
    specialties: props.specialties,
    years_nursing_experience: props.yearsNursingExperience,
    average_patient_ratios: props.averagePatientRatios,
    specialized_medical_equipment: props.specializedMedicalEquipment,
    emr_system: props.emrSystem,
    employers: props.employers,
  }),
)

const mismatchByKey = computed(() => {
  const map = {} as Partial<Record<ProfessionalSnapshotKey, string>>
  for (const warning of mismatches.value) {
    map[warning.key] = warning.message
  }
  return map
})

const pendingProposedCount = computed(() =>
  pendingProposedKeys.value.filter((key) => {
    const line = lines.value[key]
    return Boolean(line?.value.trim()) && !line.included
  }).length,
)

function patchLine(key: ProfessionalSnapshotKey, patch: Partial<ProfessionalSnapshotLine>) {
  const next = ensureProfessionalSnapshotLines(model.value)
  const current = next[key]
  const value = patch.value !== undefined ? patch.value : current.value
  const included =
    patch.included !== undefined
      ? patch.included
      : patch.value !== undefined
        ? Boolean(value.trim()) || current.included
        : current.included
  next[key] = {
    ...current,
    ...patch,
    value,
    included,
  }
  model.value = { ...next }
}

function onValueInput(key: ProfessionalSnapshotKey, event: Event) {
  const value = (event.target as HTMLInputElement).value
  const next = ensureProfessionalSnapshotLines(model.value)
  const current = next[key]
  next[key] = {
    ...current,
    value,
    included: current.included || Boolean(value.trim()),
  }
  model.value = { ...next }
}

function flagParts(key: ProfessionalSnapshotKey) {
  return parseExperienceFlagValue(lines.value[key]?.value)
}

function setFlagAnswer(key: ProfessionalSnapshotKey, answer: SnapshotExperienceAnswer) {
  const { detail } = parseExperienceFlagValue(lines.value[key]?.value)
  const value = formatExperienceFlagValue(answer, answer === 'yes' ? detail : '')
  patchLine(key, {
    value,
    included: Boolean(value.trim()) || lines.value[key]?.included,
  })
}

function setFlagDetail(key: ProfessionalSnapshotKey, detail: string) {
  const { answer } = parseExperienceFlagValue(lines.value[key]?.value)
  const nextAnswer: SnapshotExperienceAnswer = answer || (detail.trim() ? 'yes' : '')
  const value = formatExperienceFlagValue(nextAnswer, detail)
  patchLine(key, {
    value,
    included: Boolean(value.trim()) || lines.value[key]?.included,
  })
}

function clearFlag(key: ProfessionalSnapshotKey) {
  patchLine(key, { value: '', included: false })
}

function resetFromWizard() {
  proposeError.value = null
  proposeNotice.value = null
  pendingProposedKeys.value = []
  model.value = ensureProfessionalSnapshotLines(
    buildProfessionalSnapshotFromCandidate({
      specialties: props.specialties,
      years_nursing_experience: props.yearsNursingExperience,
      average_patient_ratios: props.averagePatientRatios,
      specialized_medical_equipment: props.specializedMedicalEquipment,
      emr_system: props.emrSystem,
      employers: props.employers,
    }),
  )
}

async function regenerateFromResume() {
  if (!props.candidateId || proposing.value) return
  proposing.value = true
  proposeError.value = null
  proposeNotice.value = null
  pendingProposedKeys.value = []
  try {
    const headers = props.getAuthHeaders ? await props.getAuthHeaders() : {}
    const res = await $fetch<{
      proposals: SnapshotProposals
      proposal_count: number
    }>(`/api/admin/candidates/${props.candidateId}/propose-snapshot`, {
      method: 'POST',
      headers,
    })
    model.value = applySnapshotProposals(model.value, res.proposals || {})
    const proposedKeys = PROFESSIONAL_SNAPSHOT_KEYS.filter((key) => {
      const value = res.proposals?.[key]?.value?.trim()
      return Boolean(value)
    })
    pendingProposedKeys.value = proposedKeys
    const count = res.proposal_count ?? proposedKeys.length
    proposeNotice.value = count
      ? `Filled ${count} line${count === 1 ? '' : 's'} from the resume. They stay hidden from the packet until you include them.`
      : 'No snapshot lines found in the resume text. You can still edit manually or open Extra details.'
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; statusMessage?: string; message?: string }
    proposeError.value =
      err?.data?.statusMessage
      || err?.statusMessage
      || err?.message
      || 'Could not regenerate Snapshot from resume.'
  } finally {
    proposing.value = false
  }
}

function includeAllProposed() {
  if (props.disabled || !pendingProposedCount.value) return
  const next = ensureProfessionalSnapshotLines(model.value)
  for (const key of pendingProposedKeys.value) {
    if (!next[key].value.trim() || next[key].included) continue
    next[key] = { ...next[key], included: true }
  }
  model.value = { ...next }
  pendingProposedKeys.value = []
  proposeNotice.value = null
}

function toggleIncluded(key: ProfessionalSnapshotKey) {
  if (props.disabled) return
  patchLine(key, { included: !lines.value[key].included })
}

/** Show provenance only for AI / supplemental — not redundant “Source: wizard”. */
function lineEvidence(key: ProfessionalSnapshotKey): string | null {
  const line = lines.value[key]
  const snippet = line.sourceSnippet?.trim()
  if (snippet) return `From resume — “${snippet}”`
  const source = line.source?.trim()
  if (source === 'gemini') return 'From resume'
  if (source === 'supplemental') return 'From extra details'
  return null
}

function hasMismatchJump(key: ProfessionalSnapshotKey): boolean {
  return (
    key === 'snapshot_charge_nurse_experience'
    || key === 'snapshot_preceptor_experience'
    || key === 'snapshot_teaching_facility_experience'
    || key === 'snapshot_travel_experience'
    || key === 'snapshot_specialty'
  )
}

function textInputClass(key: ProfessionalSnapshotKey): string {
  const base = 'mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 disabled:bg-slate-100'
  if (key === 'snapshot_years_experience') return `${base} max-w-[7rem]`
  return base
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 max-w-xl">
        <p class="text-sm text-slate-600">
          Included lines print in the packet. Hidden lines stay out until you include them.
        </p>
        <details class="mt-1 text-sm text-slate-500">
          <summary class="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            How packet visibility &amp; AI propose work
          </summary>
          <p class="mt-1.5 text-xs leading-relaxed text-slate-500">
            Use the eye on each row to show or hide that line in the packet. Regenerate from resume fills values with snippets but never includes them automatically — approve each line, or use Include all proposed.
          </p>
        </details>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          :disabled="disabled || proposing"
          @click="resetFromWizard"
        >
          Reset from wizard
        </button>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          :disabled="disabled || proposing || !candidateId || hasResume === false"
          @click="regenerateFromResume"
        >
          {{ proposing ? 'Proposing…' : 'Regenerate from resume' }}
        </button>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          :disabled="disabled"
          @click="emit('open-extra-details')"
        >
          Extra details{{ extraDetailsCount ? ` (${extraDetailsCount})` : '' }}
        </button>
      </div>
    </div>

    <p v-if="proposeError" class="text-sm text-red-700" role="alert">{{ proposeError }}</p>
    <div
      v-else-if="proposeNotice || pendingProposedCount"
      class="flex flex-wrap items-center gap-2"
      role="status"
    >
      <p v-if="proposeNotice" class="text-sm text-slate-600">{{ proposeNotice }}</p>
      <button
        v-if="pendingProposedCount"
        type="button"
        class="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-800 hover:bg-brand-100 disabled:opacity-50"
        :disabled="disabled"
        @click="includeAllProposed"
      >
        Include all proposed ({{ pendingProposedCount }})
      </button>
    </div>
    <p
      v-if="hasResume === false"
      class="text-sm text-amber-800"
      role="status"
    >
      Upload a resume via the sidebar to enable regenerate from resume.
    </p>

    <!-- Short free-text: 2-column grid -->
    <div class="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
      <div
        v-for="key in SHORT_TEXT_KEYS"
        :key="key"
        class="min-w-0"
      >
        <div class="flex items-center justify-between gap-2">
          <span class="field-label-compact">{{ PROFESSIONAL_SNAPSHOT_LABELS[key] }}</span>
          <button
            type="button"
            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50"
            :class="lines[key].included
              ? 'text-brand-700 hover:bg-brand-50'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'"
            :disabled="disabled"
            :aria-pressed="lines[key].included"
            :aria-label="lines[key].included
              ? `Hide ${PROFESSIONAL_SNAPSHOT_LABELS[key]} from packet`
              : `Include ${PROFESSIONAL_SNAPSHOT_LABELS[key]} in packet`"
            :title="lines[key].included ? 'In packet' : 'Not in packet'"
            @click="toggleIncluded(key)"
          >
            <svg
              v-if="lines[key].included"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </button>
        </div>
        <input
          type="text"
          :class="textInputClass(key)"
          :value="lines[key].value"
          :disabled="disabled"
          @input="onValueInput(key, $event)"
        >
        <p
          v-if="lineEvidence(key)"
          class="mt-1 text-[11px] italic text-slate-400"
        >
          {{ lineEvidence(key) }}
        </p>
        <p
          v-if="mismatchByKey[key]"
          class="mt-1.5 text-sm text-amber-800"
          role="status"
        >
          {{ mismatchByKey[key] }}
          <button
            v-if="hasMismatchJump(key)"
            type="button"
            class="ml-1 font-medium underline hover:no-underline"
            @click="emit('go-to-employment')"
          >
            Go to Employment
          </button>
        </p>
      </div>
    </div>

    <!-- Longer free-text -->
    <div
      v-for="key in FULL_WIDTH_TEXT_KEYS"
      :key="key"
      class="min-w-0"
    >
      <div class="flex items-center justify-between gap-2">
        <span class="field-label-compact">{{ PROFESSIONAL_SNAPSHOT_LABELS[key] }}</span>
        <button
          type="button"
          class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50"
          :class="lines[key].included
            ? 'text-brand-700 hover:bg-brand-50'
            : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'"
          :disabled="disabled"
          :aria-pressed="lines[key].included"
          :aria-label="lines[key].included
            ? `Hide ${PROFESSIONAL_SNAPSHOT_LABELS[key]} from packet`
            : `Include ${PROFESSIONAL_SNAPSHOT_LABELS[key]} in packet`"
          :title="lines[key].included ? 'In packet' : 'Not in packet'"
          @click="toggleIncluded(key)"
        >
          <svg
            v-if="lines[key].included"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="currentColor"
            class="h-4 w-4"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
          </svg>
        </button>
      </div>
      <input
        type="text"
        class="mt-1 w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 disabled:bg-slate-100"
        :value="lines[key].value"
        :disabled="disabled"
        @input="onValueInput(key, $event)"
      >
      <p
        v-if="lineEvidence(key)"
        class="mt-1 text-[11px] italic text-slate-400"
      >
        {{ lineEvidence(key) }}
      </p>
      <p
        v-if="mismatchByKey[key]"
        class="mt-1.5 text-sm text-amber-800"
        role="status"
      >
        {{ mismatchByKey[key] }}
      </p>
    </div>

    <!-- Experience flags: single column (detail expands under Yes) -->
    <ul class="divide-y divide-slate-100 border-t border-slate-100 pt-1">
      <li
        v-for="key in SNAPSHOT_EXPERIENCE_FLAG_KEYS"
        :key="key"
        class="py-2.5 first:pt-2"
      >
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <span class="field-label-compact">{{ PROFESSIONAL_SNAPSHOT_LABELS[key] }}</span>
          <button
            type="button"
            class="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50"
            :class="lines[key].included
              ? 'text-brand-700 hover:bg-brand-50'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'"
            :disabled="disabled"
            :aria-pressed="lines[key].included"
            :aria-label="lines[key].included
              ? `Hide ${PROFESSIONAL_SNAPSHOT_LABELS[key]} from packet`
              : `Include ${PROFESSIONAL_SNAPSHOT_LABELS[key]} in packet`"
            :title="lines[key].included ? 'In packet' : 'Not in packet'"
            @click="toggleIncluded(key)"
          >
            <svg
              v-if="lines[key].included"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            <svg
              v-else
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="h-4 w-4"
              aria-hidden="true"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          </button>
        </div>

        <div
          class="mt-1.5 flex flex-wrap items-center gap-2"
          role="group"
          :aria-label="PROFESSIONAL_SNAPSHOT_LABELS[key]"
        >
          <button
            type="button"
            class="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            :class="flagParts(key).answer === 'yes'
              ? 'border-brand-600 bg-brand-50 text-brand-800'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'"
            :aria-pressed="flagParts(key).answer === 'yes'"
            :disabled="disabled"
            @click="setFlagAnswer(key, 'yes')"
          >
            Yes
          </button>
          <button
            type="button"
            class="shrink-0 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
            :class="flagParts(key).answer === 'no'
              ? 'border-slate-600 bg-slate-100 text-slate-900'
              : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'"
            :aria-pressed="flagParts(key).answer === 'no'"
            :disabled="disabled"
            @click="setFlagAnswer(key, 'no')"
          >
            No
          </button>
          <button
            v-if="flagParts(key).answer"
            type="button"
            class="shrink-0 text-xs font-medium text-slate-500 underline hover:no-underline disabled:opacity-50"
            :disabled="disabled"
            @click="clearFlag(key)"
          >
            Clear
          </button>
        </div>
        <input
          v-if="flagParts(key).answer === 'yes'"
          type="text"
          class="mt-1.5 w-full max-w-sm rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 disabled:bg-slate-100"
          :value="flagParts(key).detail"
          :disabled="disabled"
          placeholder="Optional detail (e.g. 3 yrs, Level 1)"
          :aria-label="`${PROFESSIONAL_SNAPSHOT_LABELS[key]} detail`"
          @input="setFlagDetail(key, ($event.target as HTMLInputElement).value)"
        >

        <p
          v-if="lineEvidence(key)"
          class="mt-1 text-[11px] italic text-slate-400"
        >
          {{ lineEvidence(key) }}
        </p>
        <p
          v-if="mismatchByKey[key]"
          class="mt-1.5 text-sm text-amber-800"
          role="status"
        >
          {{ mismatchByKey[key] }}
          <button
            v-if="hasMismatchJump(key)"
            type="button"
            class="ml-1 font-medium underline hover:no-underline"
            @click="emit('go-to-employment')"
          >
            Go to Employment
          </button>
        </p>
      </li>
    </ul>

    <p
      v-if="mismatches.length"
      class="text-sm text-amber-800"
      role="status"
    >
      {{ mismatches.length }} snapshot {{ mismatches.length === 1 ? 'line does' : 'lines do' }} not match Employment data — review before download.
    </p>
  </div>
</template>
