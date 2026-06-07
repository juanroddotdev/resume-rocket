<script setup lang="ts">
import { computeMissingTemplateFields, computeEmployerLinkAdvisories } from '~/utils/vmsGapReview'
import { focusIntakeField } from '~/utils/focusIntakeField'
import { hasIntakeDraftData } from '~/utils/intakeDraft'
import {
  type FinalizePhase,
  FINALIZE_PHASE_PROGRESS,
  finalizePhaseMessage,
} from '~/utils/intakeProcessing'

const route = useRoute()
const token = computed(() => String(route.params.token))

const {
  validate,
  inviteValid,
  inviteError,
  candidateId: inviteCandidateId,
  prefilledEmail,
} = useIntakeInvite()
const {
  candidateId,
  form,
  currentStep,
  saveStatus,
  certKeys,
  resetWizard,
  ensureDraft,
  scheduleAutosave,
  applyParseResult,
  finalizeAndDownload,
  downloadDocxOnly,
  parseMeta,
  setParseMeta,
  clearParseMeta,
  restoreLocal,
  persistLocal,
  clearLocal,
} = useCandidateForm()

const loading = ref(true)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitPhase = ref<FinalizePhase | 'success' | null>(null)
const submitProgress = ref(0)
const confirmationEmailSent = ref(false)
const redownloading = ref(false)
const redownloadError = ref<string | null>(null)
const draftRestoredBanner = ref(false)

function isWizardStep(step: number | 'success'): step is number {
  return typeof step === 'number' && step >= 1 && step <= 4
}

function updateDraftRestoredBanner(restored: boolean) {
  draftRestoredBanner.value = restored && isWizardStep(currentStep.value)
}

function dismissDraftRestoredBanner() {
  draftRestoredBanner.value = false
}

const STEP_LABELS: Record<number, string> = {
  0: 'Upload resume',
  1: 'Your details',
  2: 'Employment',
  3: 'Credentials & education',
  4: 'Review',
}

const stepIndicator = computed(() => {
  if (typeof currentStep.value !== 'number') return null
  return `Step ${currentStep.value + 1} of 5 · ${STEP_LABELS[currentStep.value]}`
})

const missingFields = computed(() => computeMissingTemplateFields(form.value))
const employerLinkAdvisories = computed(() => computeEmployerLinkAdvisories(form.value))
const hasDraftData = computed(() => hasIntakeDraftData(form.value, candidateId.value))

const step3LicenseMissing = computed(() =>
  missingFields.value.filter(f => f.step === 3 && (f.id === 'license_number' || f.id === 'license_state')),
)
const step3OtherMissing = computed(() =>
  missingFields.value.filter(f => f.step === 3 && f.id !== 'license_number' && f.id !== 'license_state'),
)

const showSaveChip = computed(() =>
  saveStatus.value !== 'idle' || (currentStep.value === 0 && Boolean(candidateId.value)),
)
const saveChipShowsSaved = computed(() =>
  saveStatus.value === 'saved'
  || (saveStatus.value === 'idle' && currentStep.value === 0 && Boolean(candidateId.value)),
)

const showSubmitOverlay = computed(() => submitting.value || submitPhase.value === 'success')

const submitMessage = computed(() => finalizePhaseMessage(submitPhase.value))

const GENERATE_SUCCESS_FLASH_MS = 600

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

function resetSubmitOverlay() {
  submitPhase.value = null
  submitProgress.value = 0
}

async function bootstrapInvite(routeToken: string) {
  resetWizard()
  draftRestoredBanner.value = false
  const ok = await validate(routeToken)
  if (!ok) return false

  const draftRestored = restoreLocal(routeToken)

  if (inviteCandidateId.value) {
    if (candidateId.value && candidateId.value !== inviteCandidateId.value) {
      clearLocal(routeToken)
      resetWizard()
    } else {
      candidateId.value = inviteCandidateId.value
      updateDraftRestoredBanner(draftRestored)
    }
  } else if (candidateId.value) {
    clearLocal(routeToken)
    resetWizard()
  } else {
    updateDraftRestoredBanner(draftRestored)
  }

  if (prefilledEmail.value && !form.value.email) {
    form.value.email = prefilledEmail.value
  }

  return true
}

onMounted(async () => {
  loading.value = true
  await bootstrapInvite(token.value)
  loading.value = false
})

watch(token, async (newToken, oldToken) => {
  if (!newToken || newToken === oldToken) return
  loading.value = true
  await bootstrapInvite(newToken)
  loading.value = false
})

watch(
  () => currentStep.value,
  (step) => {
    if (step === 0 || step === 'success') {
      draftRestoredBanner.value = false
    }
  },
)

watch(
  () => form.value,
  () => {
    if (currentStep.value !== 0 && currentStep.value !== 'success') {
      scheduleAutosave({})
    }
  },
  { deep: true },
)

async function onParsed(data: Record<string, unknown>) {
  if (!candidateId.value && data.candidateId) {
    candidateId.value = String(data.candidateId)
  }
  if (!candidateId.value) await ensureDraft()

  const fieldsFound = applyParseResult(data as Parameters<typeof applyParseResult>[0])
  setParseMeta({
    document_scan: Boolean(data.document_scan),
    partial_parse: Boolean(data.partial_parse),
    fields_found: fieldsFound,
  })

  currentStep.value = 1
  persistLocal(token.value)
}

async function onManual() {
  clearParseMeta()
  await ensureDraft()
  currentStep.value = 1
  persistLocal(token.value)
}

function canAdvanceStep1() {
  return form.value.first_name && form.value.last_name && form.value.email && form.value.phone
}

function canAdvanceStep2() {
  return form.value.employers.length > 0
}

function canAdvanceStep3() {
  return step3LicenseMissing.value.length === 0
}

async function goToField(step: number, fieldId: string) {
  const stepChanging = currentStep.value !== step
  currentStep.value = step
  persistLocal(token.value)
  if (stepChanging) {
    await nextTick()
    await nextTick()
  }
  await focusIntakeField(fieldId)
}

async function goSuccess() {
  submitting.value = true
  submitError.value = null
  resetSubmitOverlay()
  try {
    const result = await finalizeAndDownload({
      onPhase: (phase) => {
        submitPhase.value = phase
        submitProgress.value = FINALIZE_PHASE_PROGRESS[phase]
      },
    })
    submitPhase.value = 'success'
    submitProgress.value = 100
    await sleep(GENERATE_SUCCESS_FLASH_MS)
    confirmationEmailSent.value = result.confirmationEmailSent
    currentStep.value = 'success'
    clearLocal(token.value)
  } catch (e) {
    resetSubmitOverlay()
    submitError.value =
      e instanceof Error ? e.message : 'Could not prepare your download. Check your connection and try again.'
  } finally {
    submitting.value = false
    resetSubmitOverlay()
  }
}

async function onDownloadAgain() {
  redownloading.value = true
  redownloadError.value = null
  try {
    await downloadDocxOnly()
  } catch (e) {
    redownloadError.value =
      e instanceof Error ? e.message : 'Could not download your packet. Check your connection and try again.'
  } finally {
    redownloading.value = false
  }
}
</script>

<template>
  <div class="mx-auto min-h-dvh max-w-md pb-12">
    <div
      v-if="showSubmitOverlay"
      class="fixed inset-0 z-50 flex items-center justify-center bg-white/90 px-4"
      role="presentation"
    >
      <IntakeProcessingCard
        mode="generate"
        :status="submitPhase === 'success' ? 'success' : 'active'"
        :message="submitMessage"
        :progress="submitProgress"
      />
    </div>

    <div v-if="loading" class="py-20 text-center text-slate-500">Loading…</div>

    <div v-else-if="!inviteValid" class="py-16 text-center">
      <h1 class="text-xl font-semibold text-slate-900">Link unavailable</h1>
      <p class="mt-2 text-slate-600">
        <template v-if="inviteError === 'expired'">This link has expired.</template>
        <template v-else-if="inviteError === 'completed'">This application was already submitted.</template>
        <template v-else-if="inviteError === 'unavailable'">We could not verify this link. Check your connection and try again.</template>
        <template v-else>Ask your recruiter for a new intake link.</template>
      </p>
    </div>

    <template v-else>
      <div v-if="showSaveChip" class="mb-2 text-right text-xs text-slate-500">
        <span v-if="saveStatus === 'saving'">Saving…</span>
        <span v-else-if="saveChipShowsSaved">Saved</span>
        <span v-else-if="saveStatus === 'error'" class="text-red-600">
          Save failed —
          <button type="button" class="underline" @click="scheduleAutosave({})">Retry</button>
        </span>
      </div>

      <div
        v-if="draftRestoredBanner"
        class="mb-3 flex items-start justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
      >
        <p><strong>Draft restored</strong> — You can pick up where you left off.</p>
        <button
          type="button"
          class="shrink-0 text-xs text-slate-500 underline"
          @click="dismissDraftRestoredBanner"
        >
          Dismiss
        </button>
      </div>

      <p
        v-if="stepIndicator"
        class="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500"
      >
        {{ stepIndicator }}
      </p>

      <!-- Step 0 -->
      <section v-if="currentStep === 0">
        <h1 class="text-xl font-bold text-slate-900">Upload resume</h1>
        <FileDropZone
          class="mt-4"
          :candidate-id="candidateId"
          :has-existing-data="hasDraftData"
          @parsed="onParsed"
          @manual="onManual"
        />
      </section>

      <!-- Step 1 -->
      <section v-else-if="currentStep === 1" class="space-y-4">
        <h1 class="text-xl font-bold">Your details</h1>
        <ParseNoticeBanner :meta="parseMeta" show-fields-found />
        <button type="button" class="text-sm text-brand-700" @click="currentStep = 0">
          Replace resume
        </button>
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">First name</span>
          <input id="intake-field-first_name" v-model="form.first_name" autocomplete="given-name" placeholder="Jane" required class="field">
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Last name</span>
          <input id="intake-field-last_name" v-model="form.last_name" autocomplete="family-name" placeholder="Doe" required class="field">
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Email</span>
          <input id="intake-field-email" v-model="form.email" type="email" autocomplete="email" placeholder="you@example.com" required class="field">
        </label>
        <label class="block">
          <span class="mb-1 block text-sm font-medium text-slate-700">Phone</span>
          <input id="intake-field-phone" v-model="form.phone" type="tel" autocomplete="tel" placeholder="(555) 555-5555" required class="field">
          <span class="mt-1 block text-xs text-slate-500">Include area code — any common format is fine.</span>
        </label>
        <div class="flex gap-2 pt-2">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="currentStep = 0">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-brand-600 py-3 font-medium text-white disabled:opacity-50"
            :disabled="!canAdvanceStep1()"
            @click="currentStep = 2"
          >
            Next
          </button>
        </div>
      </section>

      <!-- Step 2 -->
      <section v-else-if="currentStep === 2" class="space-y-4">
        <h1 class="text-xl font-bold">Employment</h1>
        <ParseNoticeBanner :meta="parseMeta" />
        <SpecialtyChipInput
          v-model="form.specialties"
          label="Specialties / units"
          placeholder="e.g. ICU, ER, Med-Surg"
          field-id="specialties"
        />
        <HospitalAutocomplete
          v-model:emr="form.emr_system"
          :employers="form.employers"
          @update:employers="form.employers = $event"
        />
        <p
          v-if="!canAdvanceStep2()"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          Add at least one hospital where you worked before continuing.
        </p>
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="currentStep = 1">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-brand-600 py-3 font-medium text-white disabled:opacity-50"
            :disabled="!canAdvanceStep2()"
            @click="currentStep = 3"
          >
            Next
          </button>
        </div>
      </section>

      <!-- Step 3 -->
      <section v-else-if="currentStep === 3" class="space-y-4">
        <h1 class="text-xl font-bold">Credentials & education</h1>
        <ParseNoticeBanner :meta="parseMeta" />
        <CredentialsChecklist
          :credentials="form.credentials"
          :license-number="form.license_number"
          :license-state="form.license_state"
          :cert-keys="certKeys"
          @update:credentials="form.credentials = $event"
          @update:license-number="form.license_number = $event"
          @update:license-state="form.license_state = $event"
        />
        <ClinicalSummaryFields
          v-model:years-nursing-experience="form.years_nursing_experience"
          v-model:compact-license-status="form.compact_license_status"
          v-model:average-patient-ratios="form.average_patient_ratios"
          v-model:specialized-medical-equipment="form.specialized_medical_equipment"
        />
        <EducationRepeater v-model="form.education" />
        <p
          v-if="step3LicenseMissing.length"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          Add your RN license number and state before review — required for your VMS packet.
        </p>
        <p
          v-else-if="step3OtherMissing.length"
          class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
          {{ step3OtherMissing.length }} more field{{ step3OtherMissing.length === 1 ? '' : 's' }} recommended on this step — you can fix them on review.
        </p>
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="currentStep = 2">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-brand-600 py-3 font-medium text-white disabled:opacity-50"
            :disabled="!canAdvanceStep3()"
            @click="currentStep = 4"
          >
            Review
          </button>
        </div>
      </section>

      <!-- Step 4 -->
      <section v-else-if="currentStep === 4" class="space-y-4">
        <IntakeReviewPanel
          :missing="missingFields"
          :advisories="employerLinkAdvisories"
          :submitting="submitting"
          @back="currentStep = 3"
          @go-to-field="goToField"
          @submit="goSuccess"
        />
        <p
          v-if="submitError"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {{ submitError }}
          <button type="button" class="ml-1 underline" @click="goSuccess">Retry</button>
        </p>
      </section>

      <!-- Success -->
      <section v-else-if="currentStep === 'success'" class="py-12 text-center">
        <div class="text-4xl text-brand-600">✓</div>
        <h1 class="mt-4 text-xl font-bold">Submitted</h1>
        <p class="mt-2 text-slate-600">
          Your VMS-ready placement packet (DOCX) was downloaded. Your recruiter receives the same file for hospital submission.
        </p>
        <p v-if="confirmationEmailSent" class="mt-2 text-slate-600">
          Check your inbox at <strong>{{ form.email }}</strong> for a confirmation link.
        </p>
        <button
          type="button"
          class="mt-6 rounded-lg border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700 disabled:opacity-50"
          :disabled="redownloading"
          @click="onDownloadAgain"
        >
          {{ redownloading ? 'Preparing…' : 'Download again' }}
        </button>
        <p
          v-if="redownloadError"
          class="mt-2 text-sm text-red-600"
        >
          {{ redownloadError }}
          <button type="button" class="ml-1 underline" @click="onDownloadAgain">Retry</button>
        </p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.field {
  @apply w-full rounded-lg border border-slate-300 px-3 py-3 text-base;
}
</style>
