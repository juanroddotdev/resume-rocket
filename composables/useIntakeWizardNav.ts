import type { Ref } from 'vue'
import {
  isEditableWizardStep,
  parseStepQuery,
  stepToQuery,
  type WizardStep,
} from '~/utils/intakeWizardStep'

type GoToStepOptions = {
  replace?: boolean
  skipFlush?: boolean
}

export function useIntakeWizardNav(options: {
  token: Ref<string>
  submitting?: Ref<boolean>
  ready?: Ref<boolean>
}) {
  const route = useRoute()
  const router = useRouter()
  const { currentStep, flushAutosave, persistLocal } = useCandidateForm()

  const syncingToRoute = ref(false)

  function stepQueryMatches(step: WizardStep): boolean {
    const desired = stepToQuery(step)
    const current = route.query.step
    if (desired === undefined) return current == null || current === ''
    return String(current) === desired
  }

  function buildQuery(step: WizardStep) {
    const query = { ...route.query }
    const stepParam = stepToQuery(step)
    if (stepParam === undefined) {
      delete query.step
    } else {
      query.step = stepParam
    }
    return query
  }

  async function syncStepToRoute(step: WizardStep, replace: boolean) {
    if (stepQueryMatches(step)) return

    syncingToRoute.value = true
    try {
      const query = buildQuery(step)
      if (replace) {
        await router.replace({ query })
      } else {
        await router.push({ query })
      }
    } finally {
      syncingToRoute.value = false
    }
  }

  async function goToStep(step: WizardStep, opts?: GoToStepOptions) {
    if (currentStep.value === step && stepQueryMatches(step)) return

    if (!opts?.skipFlush) {
      await flushAutosave()
    }

    currentStep.value = step
    persistLocal(options.token.value)
    await syncStepToRoute(step, opts?.replace ?? false)
  }

  async function applyRouteStep(raw: unknown) {
    if (options.ready && !options.ready.value) return
    if (options.submitting?.value) return
    if (syncingToRoute.value) return

    if (currentStep.value === 'success') {
      const queryStep = parseStepQuery(raw)
      if (queryStep !== 'success' && queryStep != null && isEditableWizardStep(queryStep)) {
        await syncStepToRoute('success', true)
      }
      return
    }

    const queryStep = parseStepQuery(raw)

    if (queryStep == null) {
      if (currentStep.value !== 0) {
        await flushAutosave()
        currentStep.value = 0
        persistLocal(options.token.value)
      }
      return
    }

    if (queryStep === currentStep.value) return

    await flushAutosave()
    currentStep.value = queryStep
    persistLocal(options.token.value)
  }

  watch(
    () => route.query.step,
    (raw) => {
      void applyRouteStep(raw)
    },
  )

  function resolveInitialStep(queryRaw: unknown, localStep: WizardStep): WizardStep {
    const queryStep = parseStepQuery(queryRaw)
    if (queryStep != null) return queryStep
    return localStep
  }

  return {
    goToStep,
    syncStepToRoute,
    resolveInitialStep,
  }
}
