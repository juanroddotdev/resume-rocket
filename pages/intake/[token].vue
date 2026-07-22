<script setup lang="ts">
import { computeMissingTemplateFields, computeEmployerLinkAdvisories } from '~/utils/vmsGapReview'
import { focusIntakeField } from '~/utils/focusIntakeField'
import { hasIntakeDraftData, REPLACE_RESUME_CONFIRM } from '~/utils/intakeDraft'
import { allEmployersEmrComplete } from '~/utils/emrSystem'
import {
  type FinalizePhase,
  FINALIZE_PHASE_PROGRESS,
  finalizePhaseMessage,
} from '~/utils/intakeProcessing'
definePageMeta({ layout: 'intake' })

const route = useRoute()
const token = computed(() => String(route.params.token))

const {
  validate,
  inviteValid,
  inviteError,
  candidateId: inviteCandidateId,
  prefilledEmail,
  intakeHeaders,
} = useIntakeInvite()
const {
  candidateId,
  form,
  currentStep,
  saveStatus,
  resetWizard,
  ensureDraft,
  scheduleAutosave,
  applyParseResult,
  finalizeAndDownload,
  downloadDocxOnly,
  flushAutosave,
  reconcileCandidateId,
  parseMeta,
  setParseMeta,
  clearParseMeta,
  restoreLocal,
  clearLocal,
  hydrateDraftFromServer,
} = useCandidateForm()

const loading = ref(true)
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitPhase = ref<FinalizePhase | 'success' | null>(null)
const submitProgress = ref(0)
const confirmationEmailSent = ref(false)
const redownloading = ref(false)
const redownloadError = ref<string | null>(null)
const previewSaving = ref(false)
const previewSaveError = ref<string | null>(null)
const previewReloadToken = ref(0)
const draftRestoredBanner = ref(false)
const hospitalAutocompleteRef = ref<{ openEmployerField: (fieldId: string) => boolean } | null>(null)
const educationRepeaterRef = ref<{ openEducationField: (fieldId: string) => boolean } | null>(null)
const adminDraftDownloadNotice = ref<string | null>(null)
const devPrefilling = ref(false)

const {
  fieldClasses,
  markParsePrefillFromApi,
  clearParseHighlight,
  clearAllPrefillHighlights,
  restoreDbMetricsFromEmployers,
} = useIntakePrefillHighlight()

const {
  isRecruiterPreview,
  previewMode,
  isAdminView,
  isClientView,
  setPreviewMode,
} = useIntakePreviewMode(token)

watch(previewMode, () => {
  adminDraftDownloadNotice.value = null
})

const { goToStep, resolveInitialStep } = useIntakeWizardNav({
  token,
  submitting,
  ready: computed(() => !loading.value),
})

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
  missingFields.value.filter(f =>
    f.step === 3 && (f.id === 'licenses' || f.id.startsWith('license-')),
  ),
)
const step3OtherMissing = computed(() =>
  missingFields.value.filter(f =>
    f.step === 3 && f.id !== 'licenses' && !f.id.startsWith('license-'),
  ),
)

const showSaveStatus = computed(() => {
  if (currentStep.value === 'success') return false
  if (typeof currentStep.value === 'number' && currentStep.value >= 1 && currentStep.value <= 4) return true
  if (currentStep.value === 0 && candidateId.value) return true
  return saveStatus.value === 'saving' || saveStatus.value === 'error'
})

const saveStatusShowSavedIdle = computed(
  () => currentStep.value === 0 && Boolean(candidateId.value) && saveStatus.value === 'idle',
)

const employersEmrComplete = computed(() => allEmployersEmrComplete(form.value.employers))

const identityTouched = reactive({
  first_name: false,
  last_name: false,
  email: false,
  phone: false,
})

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

function isValidPhone(value: string) {
  return value.replace(/\D/g, '').length >= 10
}

function identityFieldValid(field: 'first_name' | 'last_name' | 'email' | 'phone') {
  const value = form.value[field]?.trim() || ''
  if (!value) return false
  if (field === 'email') return isValidEmail(value)
  if (field === 'phone') return isValidPhone(value)
  return true
}

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

function hasPassedStep0() {
  return Boolean(candidateId.value) || hasIntakeDraftData(form.value, candidateId.value)
}

async function bootstrapInvite(routeToken: string) {
  resetWizard()
  draftRestoredBanner.value = false
  const ok = await validate(routeToken)
  if (!ok) return false

  const { restored: localRestored } = restoreLocal(routeToken)

  if (inviteCandidateId.value) {
    if (candidateId.value && candidateId.value !== inviteCandidateId.value) {
      clearLocal(routeToken)
      resetWizard()
    } else {
      candidateId.value = inviteCandidateId.value
    }
  } else if (candidateId.value) {
    clearLocal(routeToken)
    resetWizard()
  }

  let serverRestored = false
  if (candidateId.value) {
    serverRestored = await hydrateDraftFromServer()
  }

  restoreDbMetricsFromEmployers(form.value.employers)

  if (prefilledEmail.value && !form.value.email) {
    form.value.email = prefilledEmail.value
  }

  let initialStep = resolveInitialStep(route.query.step, currentStep.value)
  if (typeof initialStep === 'number' && initialStep > 0 && !hasPassedStep0()) {
    initialStep = 0
  }

  await goToStep(initialStep, { replace: true, skipFlush: true })
  updateDraftRestoredBanner(localRestored || serverRestored)

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
  markParsePrefillFromApi(data as Parameters<typeof markParsePrefillFromApi>[0])
  setParseMeta({
    document_scan: Boolean(data.document_scan),
    partial_parse: Boolean(data.partial_parse),
    fields_found: fieldsFound,
  })

  await goToStep(1)
}

async function onManual() {
  clearParseMeta()
  clearAllPrefillHighlights()
  await ensureDraft()
  await goToStep(1)
}

async function onDevPrefill(mode: 'partial' | 'complete') {
  if (!import.meta.dev) return
  if (hasDraftData.value && !confirm(REPLACE_RESUME_CONFIRM)) return

  devPrefilling.value = true
  try {
    const {
      buildDevIntakeParsePayload,
      buildDevIntakeParsePayloadComplete,
    } = await import('~/utils/devIntakeFixture')
    if (!candidateId.value) await ensureDraft()
    const payload = mode === 'complete'
      ? buildDevIntakeParsePayloadComplete(candidateId.value)
      : buildDevIntakeParsePayload(candidateId.value)
    await onParsed(payload as Record<string, unknown>)
  } finally {
    devPrefilling.value = false
  }
}

function canAdvanceStep1() {
  if (isAdminView.value) return true
  return form.value.first_name && form.value.last_name && form.value.email && form.value.phone
}

function canAdvanceStep2() {
  if (isAdminView.value) return true
  return form.value.employers.length > 0 && employersEmrComplete.value
}

function canAdvanceStep3() {
  if (isAdminView.value) return true
  return step3LicenseMissing.value.length === 0
}

async function goToField(step: number, fieldId: string) {
  const stepChanging = currentStep.value !== step
  await goToStep(step)
  if (stepChanging) {
    await nextTick()
    await nextTick()
  }
  if (step === 2 && fieldId.startsWith('employer-')) {
    hospitalAutocompleteRef.value?.openEmployerField(fieldId)
    await nextTick()
  }
  if (step === 3 && fieldId.startsWith('education-')) {
    educationRepeaterRef.value?.openEducationField(fieldId)
    await nextTick()
  }
  await focusIntakeField(fieldId)
}

async function goSuccess() {
  adminDraftDownloadNotice.value = null
  submitting.value = true
  submitError.value = null
  resetSubmitOverlay()

  if (isAdminView.value) {
    try {
      await flushAutosave()
      await downloadDocxOnly()
      adminDraftDownloadNotice.value =
        'Draft packet downloaded. Candidate status is unchanged — switch to Client view to test the real submit path.'
    } catch (e) {
      submitError.value =
        e instanceof Error ? e.message : 'Could not download draft packet. Check your connection and try again.'
    } finally {
      submitting.value = false
    }
    return
  }

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
    await goToStep('success', { replace: true, skipFlush: true })
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

async function onReviewPreview() {
  previewSaveError.value = null
  previewSaving.value = true
  try {
    await reconcileCandidateId()
    await flushAutosave()
  } catch {
    previewSaveError.value = 'Could not save your latest answers.'
  } finally {
    previewSaving.value = false
    previewReloadToken.value += 1
  }
}
</script>

<template>
  <div class="relative pb-12">
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
      <IntakePreviewModeToggle
        v-if="isRecruiterPreview"
        :model-value="previewMode"
        @update:model-value="setPreviewMode"
      />

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

      <div
        v-if="stepIndicator || showSaveStatus"
        class="mb-3 flex items-center justify-between gap-3"
      >
        <p
          v-if="stepIndicator"
          class="text-xs font-medium uppercase tracking-wide text-slate-500"
        >
          {{ stepIndicator }}
        </p>
        <div v-else class="min-w-0 flex-1" />
        <IntakeSaveStatus
          v-if="showSaveStatus"
          :status="saveStatus"
          :show-saved-idle="saveStatusShowSavedIdle"
          @retry="scheduleAutosave({})"
        />
      </div>

      <!-- Step 0 -->
      <section v-if="currentStep === 0">
        <h1 class="text-xl font-bold text-slate-900">Upload resume</h1>
        <FileDropZone
          class="mt-4"
          :candidate-id="candidateId"
          :has-existing-data="hasDraftData"
          :disabled="devPrefilling"
          @parsed="onParsed"
          @manual="onManual"
        />
        <DevParseFixturePanel
          :disabled="devPrefilling"
          @prefill="onDevPrefill"
        />
      </section>

      <!-- Step 1 -->
      <section v-else-if="currentStep === 1" class="space-y-4">
        <h1 class="text-xl font-bold">Your details</h1>
        <ParseNoticeBanner :meta="parseMeta" show-fields-found />
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          @click="goToStep(0, { replace: true })"
        >
          <span aria-hidden="true">↻</span>
          Replace resume
        </button>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="field-label">First name</span>
            <div class="relative">
              <input
                id="intake-field-first_name"
                v-model="form.first_name"
                autocomplete="given-name"
                placeholder="Jane"
                required
                class="field pr-9"
                :class="fieldClasses('first_name')"
                @input="clearParseHighlight('first_name')"
                @blur="identityTouched.first_name = true"
              >
              <FieldValidityIcon
                :touched="identityTouched.first_name"
                :valid="identityFieldValid('first_name')"
              />
            </div>
          </label>
          <label class="block">
            <span class="field-label">Last name</span>
            <div class="relative">
              <input
                id="intake-field-last_name"
                v-model="form.last_name"
                autocomplete="family-name"
                placeholder="Doe"
                required
                class="field pr-9"
                :class="fieldClasses('last_name')"
                @input="clearParseHighlight('last_name')"
                @blur="identityTouched.last_name = true"
              >
              <FieldValidityIcon
                :touched="identityTouched.last_name"
                :valid="identityFieldValid('last_name')"
              />
            </div>
          </label>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="field-label">Email</span>
            <div class="relative">
              <input
                id="intake-field-email"
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="you@example.com"
                required
                class="field pr-9"
                :class="fieldClasses('email')"
                @input="clearParseHighlight('email')"
                @blur="identityTouched.email = true"
              >
              <FieldValidityIcon
                :touched="identityTouched.email"
                :valid="identityFieldValid('email')"
              />
            </div>
          </label>
          <label class="block">
            <span class="field-label">Phone</span>
            <div class="relative">
              <input
                id="intake-field-phone"
                v-model="form.phone"
                type="tel"
                autocomplete="tel"
                placeholder="(555) 555-5555"
                required
                class="field pr-9"
                :class="fieldClasses('phone')"
                @input="clearParseHighlight('phone')"
                @blur="identityTouched.phone = true"
              >
              <FieldValidityIcon
                :touched="identityTouched.phone"
                :valid="identityFieldValid('phone')"
              />
            </div>
            <span class="mt-1 block text-xs text-slate-500">Include area code — any common format is fine.</span>
          </label>
        </div>
        <label class="block">
          <span class="field-label">Home address</span>
          <input
            id="intake-field-home_address"
            v-model="form.home_address"
            autocomplete="street-address"
            placeholder="123 Main St, Apt 4"
            class="field"
            :class="fieldClasses('home_address')"
            @input="clearParseHighlight('home_address')"
          >
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="block">
            <span class="field-label-compact">City</span>
            <input
              id="intake-field-home_city"
              v-model="form.home_city"
              autocomplete="address-level2"
              placeholder="City"
              class="field"
              :class="fieldClasses('home_city')"
              @input="clearParseHighlight('home_city')"
            >
          </label>
          <label class="block">
            <span class="field-label-compact">State</span>
            <input
              id="intake-field-home_state"
              v-model="form.home_state"
              autocomplete="address-level1"
              placeholder="ST"
              maxlength="2"
              class="field"
              :class="fieldClasses('home_state')"
              @input="clearParseHighlight('home_state')"
            >
          </label>
        </div>
        <div class="mt-6 flex gap-2 border-t border-slate-100 pt-4 lg:ml-auto lg:max-w-sm">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="goToStep(0)">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-accent-500 py-3 font-medium text-brand-900 hover:bg-accent-600 disabled:opacity-50"
            :disabled="!canAdvanceStep1()"
            @click="goToStep(2)"
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
          ref="hospitalAutocompleteRef"
          :employers="form.employers"
          :legacy-emr-system="form.emr_system"
          deck-mode="multi"
          :sticky-chrome-offset-px="56"
          show-employers-jump-link
          :persist-immediate="flushAutosave"
          @update:employers="form.employers = $event"
        />
        <p
          v-if="isClientView && !form.employers.length"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          Add at least one hospital where you worked before continuing.
        </p>
        <p
          v-else-if="isClientView && form.employers.length && !employersEmrComplete"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          Select an EMR / charting system on each employer card. If you choose Other, enter the system name — required before continuing.
        </p>
        <div class="mt-6 flex gap-2 border-t border-slate-100 pt-4 lg:ml-auto lg:max-w-sm">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="goToStep(1)">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-accent-500 py-3 font-medium text-brand-900 hover:bg-accent-600 disabled:opacity-50"
            :disabled="!canAdvanceStep2()"
            @click="goToStep(3)"
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
          v-model:compact-license-status="form.compact_license_status"
          :credentials="form.credentials"
          :licenses="form.licenses"
          @update:credentials="form.credentials = $event"
          @update:licenses="form.licenses = $event"
        />
        <ClinicalSummaryFields
          v-model:years-nursing-experience="form.years_nursing_experience"
          v-model:specialized-medical-equipment="form.specialized_medical_equipment"
        />
        <EducationRepeater ref="educationRepeaterRef" v-model="form.education" />
        <p
          v-if="isClientView && step3LicenseMissing.length"
          class="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
        >
          Add your RN license number and state before review — required for your VMS packet.
        </p>
        <p
          v-else-if="isClientView && step3OtherMissing.length"
          class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
        >
          {{ step3OtherMissing.length }} more field{{ step3OtherMissing.length === 1 ? '' : 's' }} recommended on this step — you can fix them on review.
        </p>
        <div class="mt-6 flex gap-2 border-t border-slate-100 pt-4 lg:ml-auto lg:max-w-sm">
          <button type="button" class="flex-1 rounded-lg border py-3" @click="goToStep(2)">Back</button>
          <button
            type="button"
            class="flex-1 rounded-lg bg-accent-500 py-3 font-medium text-brand-900 hover:bg-accent-600 disabled:opacity-50"
            :disabled="!canAdvanceStep3()"
            @click="goToStep(4)"
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
          :allow-incomplete-submit="isAdminView"
          :candidate-id="candidateId ?? undefined"
          :preview-headers="intakeHeaders()"
          :preview-reload-token="previewReloadToken"
          :preview-loading="previewSaving"
          :preview-save-error="previewSaveError"
          :active="currentStep === 4"
          @back="goToStep(3)"
          @preview="onReviewPreview"
          @go-to-field="goToField"
          @submit="goSuccess"
        />
        <p
          v-if="adminDraftDownloadNotice"
          class="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-900"
        >
          {{ adminDraftDownloadNotice }}
        </p>
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
