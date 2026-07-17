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
  applySnapshotProposals,
  buildProfessionalSnapshotFromCandidate,
  computeSnapshotMismatches,
  ensureProfessionalSnapshotLines,
  formatExperienceFlagValue,
  isSnapshotExperienceFlag,
  parseExperienceFlagValue,
} from '~/utils/professionalSnapshot'

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
    const count = res.proposal_count ?? Object.keys(res.proposals || {}).length
    proposeNotice.value = count
      ? `Filled ${count} line${count === 1 ? '' : 's'} from the resume. Dimmed lines are hidden from the packet — tap the eye to show each one you want.`
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

function toggleIncluded(key: ProfessionalSnapshotKey) {
  if (props.disabled) return
  patchLine(key, { included: !lines.value[key].included })
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="min-w-0 max-w-xl">
        <p class="text-sm text-slate-600">
          Bright lines print in the packet. Dimmed lines stay out until you show them.
        </p>
        <details class="mt-1 text-sm text-slate-500">
          <summary class="cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-700">
            How packet visibility &amp; AI propose work
          </summary>
          <p class="mt-1.5 text-xs leading-relaxed text-slate-500">
            Use the eye on each row to show or hide that line in the packet. Regenerate from resume fills values with snippets but never turns lines on automatically — you approve each one.
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
    <p v-else-if="proposeNotice" class="text-sm text-slate-600" role="status">{{ proposeNotice }}</p>
    <p
      v-if="hasResume === false"
      class="text-sm text-amber-800"
      role="status"
    >
      Upload a resume via the sidebar to enable regenerate from resume.
    </p>

    <ul class="space-y-2">
      <li
        v-for="key in PROFESSIONAL_SNAPSHOT_KEYS"
        :key="key"
        class="rounded-lg border p-3 transition-[background-color,border-color,box-shadow] duration-200 ease-out motion-reduce:transition-none"
        :class="lines[key].included
          ? 'border-slate-400 bg-white shadow-sm'
          : 'border-slate-100 bg-slate-50/90'"
      >
        <div class="flex items-start gap-2">
          <div
            class="min-w-0 flex-1 transition-opacity duration-200 ease-out motion-reduce:transition-none"
            :class="lines[key].included ? 'opacity-100' : 'opacity-45'"
          >
            <span class="field-label-compact">{{ PROFESSIONAL_SNAPSHOT_LABELS[key] }}</span>

            <template v-if="isSnapshotExperienceFlag(key)">
              <div
                class="mt-1 flex min-w-0 flex-wrap items-center gap-2"
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
                <input
                  type="text"
                  class="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-900 disabled:bg-slate-100"
                  :value="flagParts(key).detail"
                  :disabled="disabled || flagParts(key).answer !== 'yes'"
                  placeholder="Optional detail"
                  :aria-label="`${PROFESSIONAL_SNAPSHOT_LABELS[key]} detail`"
                  @input="setFlagDetail(key, ($event.target as HTMLInputElement).value)"
                >
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
            </template>

            <input
              v-else
              type="text"
              class="mt-0.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
              :value="lines[key].value"
              :disabled="disabled"
              @input="onValueInput(key, $event)"
            >
            <p
              v-if="lines[key].source"
              class="mt-1.5 text-[11px] italic text-slate-400"
            >
              Source: {{ lines[key].source }}
              <span v-if="lines[key].sourceSnippet"> — “{{ lines[key].sourceSnippet }}”</span>
            </p>
            <p
              v-if="mismatchByKey[key]"
              class="mt-2 text-sm text-amber-800"
              role="status"
            >
              {{ mismatchByKey[key] }}
              <button
                v-if="key === 'snapshot_charge_nurse_experience' || key === 'snapshot_preceptor_experience' || key === 'snapshot_teaching_facility_experience' || key === 'snapshot_travel_experience' || key === 'snapshot_specialty'"
                type="button"
                class="ml-1 font-medium underline hover:no-underline"
                @click="emit('go-to-employment')"
              >
                Go to Employment
              </button>
            </p>
          </div>

          <button
            type="button"
            class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition-colors disabled:opacity-50"
            :class="lines[key].included
              ? 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100'
              : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'"
            :disabled="disabled"
            :aria-pressed="lines[key].included"
            :aria-label="lines[key].included
              ? `Hide ${PROFESSIONAL_SNAPSHOT_LABELS[key]} from packet`
              : `Show ${PROFESSIONAL_SNAPSHOT_LABELS[key]} in packet`"
            :title="lines[key].included ? 'Shown in packet' : 'Hidden from packet'"
            @click="toggleIncluded(key)"
          >
            <!-- Eye (included) -->
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
            <!-- Eye slash (excluded) -->
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
