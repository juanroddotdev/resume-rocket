<script setup lang="ts">
import type { EmployerEntry } from '~/types/candidate'
import type {
  ProfessionalSnapshot,
  ProfessionalSnapshotKey,
  ProfessionalSnapshotLine,
  SnapshotProposals,
} from '~/utils/professionalSnapshot'
import {
  PROFESSIONAL_SNAPSHOT_KEYS,
  PROFESSIONAL_SNAPSHOT_LABELS,
  applySnapshotProposals,
  buildProfessionalSnapshotFromCandidate,
  computeSnapshotMismatches,
  ensureProfessionalSnapshotLines,
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
      ? `Filled ${count} line${count === 1 ? '' : 's'} from the resume. Review snippets and check Include — nothing is auto-included.`
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
</script>

<template>
  <div class="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-slate-800">
          Lines included below appear in the VMS packet Professional Snapshot.
        </p>
        <p class="mt-1 text-sm text-slate-600">
          Uncheck to omit a line. AI propose never auto-includes — you approve each line.
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          :disabled="disabled || proposing"
          @click="resetFromWizard"
        >
          Reset from wizard
        </button>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          :disabled="disabled || proposing || !candidateId || hasResume === false"
          @click="regenerateFromResume"
        >
          {{ proposing ? 'Proposing…' : 'Regenerate from resume' }}
        </button>
        <button
          type="button"
          class="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          :disabled="disabled"
          @click="emit('open-extra-details')"
        >
          Extra details{{ extraDetailsCount ? ` (${extraDetailsCount})` : '' }}
        </button>
      </div>
    </div>

    <p v-if="proposeError" class="text-sm text-red-700" role="alert">{{ proposeError }}</p>
    <p v-else-if="proposeNotice" class="text-sm text-slate-700" role="status">{{ proposeNotice }}</p>
    <p
      v-if="hasResume === false"
      class="text-sm text-amber-800"
      role="status"
    >
      Upload a resume on the Resume section to enable regenerate from resume.
    </p>

    <ul class="space-y-3">
      <li
        v-for="key in PROFESSIONAL_SNAPSHOT_KEYS"
        :key="key"
        class="rounded-md border border-slate-200 bg-white p-3"
      >
        <div class="flex flex-wrap items-center gap-3">
          <label class="flex shrink-0 items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              class="rounded border-slate-300"
              :checked="lines[key].included"
              :disabled="disabled"
              :aria-label="`Include ${PROFESSIONAL_SNAPSHOT_LABELS[key]}`"
              @change="patchLine(key, { included: ($event.target as HTMLInputElement).checked })"
            >
            Include
          </label>
          <label class="min-w-0 flex-1">
            <span class="field-label-compact">{{ PROFESSIONAL_SNAPSHOT_LABELS[key] }}</span>
            <input
              type="text"
              class="mt-0.5 w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              :value="lines[key].value"
              :disabled="disabled"
              :placeholder="key === 'snapshot_magnet_facility_experience' ? 'Often filled via Regenerate from resume' : ''"
              @input="onValueInput(key, $event)"
            >
          </label>
        </div>
        <p
          v-if="lines[key].source"
          class="mt-1.5 text-xs text-slate-500"
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
