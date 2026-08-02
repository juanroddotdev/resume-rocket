<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'
import { downloadResumeDocxFromApi } from '~/utils/downloadResumeDocxClient'

definePageMeta({ layout: 'admin' })

type AdminView = 'builder' | 'table'

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const route = useRoute()
const router = useRouter()

const email = ref('')
const password = ref('')
const authError = ref<string | null>(null)
const candidates = ref<CandidateRow[]>([])
const search = ref('')
const listFilter = ref<'all' | 'draft' | 'submitted'>('all')
const loadingCandidates = ref(false)
const candidatesError = ref<string | null>(null)
const selectedCandidate = ref<CandidateRow | null>(null)
const parseQaOpen = ref(false)
const adminView = ref<AdminView>('builder')
const docxError = ref<string | null>(null)
const intakeOpenError = ref<string | null>(null)
const deleteError = ref<string | null>(null)
const newPacketModalOpen = ref(false)
const builderReloadKey = ref(0)
const SIDEBAR_COLLAPSED_KEY = 'rr-admin-sidebar-collapsed'
const sidebarCollapsed = ref(false)

const { hasSelectedCandidate, parseQaTrigger, devFixtureRequest } = useAdminHubMenu()

onMounted(() => {
  try {
    sidebarCollapsed.value = localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1'
  } catch {
    /* ignore */
  }
})

watch(sidebarCollapsed, (collapsed) => {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? '1' : '0')
  } catch {
    /* ignore */
  }
})

function toggleSidebarCollapsed() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

/** Helper card open + sidebar open → collapse only. Never re-open sidebar when helper closes. */
function onBuilderDrawerOpen(open: boolean) {
  if (open && !sidebarCollapsed.value) {
    sidebarCollapsed.value = true
  }
}

const parseQaCandidateName = computed(() => {
  if (!selectedCandidate.value) return 'Candidate'
  const name = `${selectedCandidate.value.first_name || ''} ${selectedCandidate.value.last_name || ''}`.trim()
  return name || 'Unnamed candidate'
})

watch(selectedCandidate, (candidate) => {
  hasSelectedCandidate.value = Boolean(candidate)
}, { immediate: true })

watch(parseQaTrigger, () => {
  openParseQa()
})

watch(devFixtureRequest, (mode) => {
  if (!mode || !selectedCandidate.value) return
  setAdminView('builder')
})

watch(
  () => route.query.view,
  (view) => {
    adminView.value = view === 'table' ? 'table' : 'builder'
  },
  { immediate: true },
)

function setAdminView(view: AdminView) {
  adminView.value = view
  const query = { ...route.query }
  if (view === 'table') query.view = 'table'
  else delete query.view
  router.replace({ query })
}

async function signIn() {
  authError.value = null
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  if (error) authError.value = error.message
}

async function loadCandidates(preferredId?: string) {
  if (!user.value) return
  loadingCandidates.value = true
  candidatesError.value = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      candidatesError.value = 'Sign in required.'
      return
    }
    candidates.value = await $fetch<CandidateRow[]>('/api/admin/candidates', {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (preferredId) {
      selectedCandidate.value = candidates.value.find(c => c.id === preferredId) ?? null
    } else if (selectedCandidate.value) {
      selectedCandidate.value = candidates.value.find(c => c.id === selectedCandidate.value?.id) ?? null
    }
  } catch {
    candidatesError.value = 'Could not load candidates. Try again.'
  } finally {
    loadingCandidates.value = false
  }
}

watch(user, (u) => {
  if (u) loadCandidates()
  else {
    candidates.value = []
    selectedCandidate.value = null
    setAdminView('builder')
  }
}, { immediate: true })

async function onPacketReady(payload: { candidateId: string }) {
  await loadCandidates(payload.candidateId)
  openInBuilder(candidates.value.find(c => c.id === payload.candidateId) ?? null)
  builderReloadKey.value += 1
}

/** Link-only create: refresh list, show table, do not open empty builder. */
async function onIntakeLinkReady(payload: { candidateId: string }) {
  await loadCandidates(payload.candidateId)
  selectedCandidate.value = candidates.value.find(c => c.id === payload.candidateId) ?? null
  setAdminView('table')
}

async function adminAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sign in required')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

function selectCandidate(candidate: CandidateRow) {
  selectedCandidate.value = candidate
  setAdminView('builder')
}

function openInBuilder(candidate: CandidateRow | null) {
  if (!candidate) return
  selectedCandidate.value = candidate
  setAdminView('builder')
}

function openParseQa() {
  if (!selectedCandidate.value) return
  parseQaOpen.value = true
}

async function downloadCandidateDocx(candidate: CandidateRow) {
  docxError.value = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      docxError.value = 'Sign in required.'
      return
    }
    await downloadResumeDocxFromApi({
      body: { id: candidate.id },
      headers: { Authorization: `Bearer ${session.access_token}` },
      firstName: candidate.first_name,
      lastName: candidate.last_name,
    })
  } catch (error) {
    docxError.value = error instanceof Error ? error.message : 'Could not download DOCX.'
  }
}

function openCandidateIntake(candidate: CandidateRow) {
  intakeOpenError.value = null
  if (candidate.intake_url) {
    window.open(candidate.intake_url, '_blank', 'noopener,noreferrer')
    return
  }
  intakeOpenError.value = 'No candidate link for this candidate. Create a new packet to generate one.'
}

async function deleteDraftCandidate(candidate: CandidateRow) {
  deleteError.value = null
  if (candidate.status !== 'draft') {
    deleteError.value = 'Only draft candidates can be deleted.'
    return
  }
  const name = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || 'Unnamed candidate'
  const ok = window.confirm(
    `Delete “${name}”? This removes the draft and revokes its candidate link. This cannot be undone.`,
  )
  if (!ok) return

  try {
    const headers = await adminAuthHeaders()
    await $fetch(`/api/admin/candidates/${candidate.id}`, {
      method: 'DELETE',
      headers,
    })
    if (selectedCandidate.value?.id === candidate.id) {
      selectedCandidate.value = null
    }
    await loadCandidates()
  } catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string }; message?: string }
    deleteError.value = err.data?.statusMessage || err.message || 'Could not delete draft.'
  }
}
</script>

<template>
  <div class="h-full">
    <div
      v-if="!user"
      class="h-full overflow-y-auto rounded-[1.5rem] bg-[radial-gradient(circle_at_top_left,_rgba(230,179,92,0.22),_transparent_34%),linear-gradient(135deg,_#f8f9fc_0%,_#f4f3f8_48%,_#e8e6f0_100%)]"
    >
      <section class="relative mx-auto grid min-h-full w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.82fr)] lg:items-center lg:px-8 lg:py-10">
        <div class="pointer-events-none absolute inset-x-8 top-8 hidden h-32 rounded-full bg-white/35 blur-3xl lg:block" aria-hidden="true" />

        <div class="relative order-2 flex flex-col gap-8 lg:order-1">
          <div>
            <p class="inline-flex rounded-full border border-brand-200/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 shadow-sm">
              Recruiter workspace
            </p>
            <h1 class="mt-5 max-w-2xl text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
              Build candidate packets faster.
            </h1>
            <p class="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
              Resume Rocket helps recruiting teams turn uploaded resumes into reviewed, VMS-ready candidate packets without making candidates create an account.
            </p>
          </div>

          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 3.75h7.25L18 7.5v12.75H7V3.75Z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14 3.75V8h4M9.5 12h5M9.5 15h5M9.5 18h3" />
                </svg>
              </div>
              <h2 class="mt-3 text-sm font-semibold text-slate-900">Parse resumes</h2>
              <p class="mt-1 text-sm leading-6 text-slate-600">Extract profile, work history, credentials, and facility details.</p>
            </div>
            <div class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 11.5 11 13.5 15.5 8.75M5 5.75h14v12.5H5z" />
                </svg>
              </div>
              <h2 class="mt-3 text-sm font-semibold text-slate-900">Review gaps</h2>
              <p class="mt-1 text-sm leading-6 text-slate-600">Spot missing packet fields before recruiters submit or export.</p>
            </div>
            <div class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.5 4h11v16h-11zM9 8h6M9 11.5h6M9 15h3.5" />
                </svg>
              </div>
              <h2 class="mt-3 text-sm font-semibold text-slate-900">Export DOCX</h2>
              <p class="mt-1 text-sm leading-6 text-slate-600">Generate polished candidate packets from the completed profile.</p>
            </div>
          </div>

          <div class="relative overflow-hidden rounded-[2rem] border border-white/70 bg-brand-900 p-6 text-white shadow-2xl shadow-brand-900/20">
            <div class="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" aria-hidden="true" />
            <div class="relative grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.2em] text-accent-500">From resume to packet</p>
                <p class="mt-3 text-2xl font-semibold tracking-tight">One recruiter flow for intake, review, and document generation.</p>
                <p class="mt-3 text-sm leading-6 text-brand-100">
                  Candidates complete invite links. Recruiters keep control of packet quality inside the admin workspace.
                </p>
              </div>

              <div class="resume-rocket-visual relative mx-auto h-64 w-full max-w-sm" aria-hidden="true">
                <div class="absolute inset-4 rounded-full border border-dashed border-accent-500/40" />
                <div class="absolute left-1/2 top-1/2 h-36 w-28 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-white p-3 text-brand-900 shadow-2xl">
                  <div class="mb-3 flex items-center gap-2">
                    <span class="h-8 w-8 rounded-full bg-brand-100" />
                    <span class="h-2 w-14 rounded-full bg-brand-200" />
                  </div>
                  <span class="mb-2 block h-2 rounded-full bg-slate-200" />
                  <span class="mb-2 block h-2 w-4/5 rounded-full bg-slate-200" />
                  <span class="mb-4 block h-2 w-3/5 rounded-full bg-slate-200" />
                  <div class="grid grid-cols-2 gap-2">
                    <span class="h-8 rounded-lg bg-brand-50" />
                    <span class="h-8 rounded-lg bg-accent-500/25" />
                  </div>
                </div>
                <div class="rocket-orbit absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2">
                  <div class="absolute -right-3 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl bg-accent-500 text-brand-900 shadow-xl shadow-accent-500/30">
                    <svg class="h-8 w-8 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M12.5 14.5 9 18l-3-3 3.5-3.5M12.5 14.5l4.25 1.25L21 8.5 15.5 3 8.25 7.25 9.5 11.5m3 3L9.5 11.5m0 0L15.5 3M6 18l-2 2" />
                    </svg>
                  </div>
                </div>
                <div class="absolute bottom-5 left-4 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  Parse
                </div>
                <div class="absolute right-3 top-5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  Review
                </div>
                <div class="absolute bottom-8 right-8 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                  DOCX
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="relative order-1 lg:order-2">
          <div class="mx-auto w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-brand-900/10 backdrop-blur sm:p-8">
            <div>
              <p class="text-sm font-medium text-brand-600">Resume Rocket admin</p>
              <h2 class="mt-2 text-2xl font-bold tracking-tight text-slate-900">Recruiter sign in</h2>
              <p class="mt-2 text-sm leading-6 text-slate-600">
                Access is limited to recruiting teams. Candidates use invite links sent by recruiters.
              </p>
            </div>

            <form class="mt-8 space-y-4" @submit.prevent="signIn">
              <label class="block">
                <span class="field-label">Email</span>
                <input
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  placeholder="recruiter@example.com"
                  class="field"
                >
              </label>

              <label class="block">
                <span class="field-label">Password</span>
                <input
                  v-model="password"
                  type="password"
                  autocomplete="current-password"
                  placeholder="Enter your password"
                  class="field"
                >
              </label>

              <p
                v-if="authError"
                class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                role="alert"
              >
                {{ authError }}
              </p>

              <button
                type="submit"
                class="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-brand-900 shadow-sm shadow-accent-500/20 transition hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 motion-reduce:transition-none"
              >
                Sign in to admin
              </button>
            </form>

            <div class="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
              <p class="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Recruiter-only workflow</p>
              <p class="mt-2 text-sm leading-6 text-slate-600">
                Create invite links, review parsed resume data, and export packets from one secure workspace.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <template v-else>
      <div class="flex h-full min-h-0 flex-col">
        <div
          v-if="docxError || intakeOpenError || deleteError"
          class="mb-3 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {{ docxError || intakeOpenError || deleteError }}
          <button
            type="button"
            class="ml-2 underline"
            @click="docxError = null; intakeOpenError = null; deleteError = null"
          >
            Dismiss
          </button>
        </div>

        <div class="relative flex min-h-0 flex-1 overflow-hidden rounded-xl bg-canvas">
          <button
            type="button"
            class="absolute top-2 z-20 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-brand-200 bg-canvas text-brand-600 shadow-sm hover:bg-white hover:text-brand-900"
            :class="sidebarCollapsed ? 'left-14' : 'left-[280px]'"
            :aria-label="sidebarCollapsed ? 'Expand candidate list' : 'Collapse candidate list'"
            :title="sidebarCollapsed ? 'Expand candidate list' : 'Collapse candidate list'"
            @click="toggleSidebarCollapsed"
          >
            <svg
              class="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                v-if="sidebarCollapsed"
                fill-rule="evenodd"
                d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                clip-rule="evenodd"
              />
              <path
                v-else
                fill-rule="evenodd"
                d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
          <aside
            class="flex shrink-0 flex-col overflow-hidden border-r border-slate-200/80 bg-transparent transition-[width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none"
            :class="sidebarCollapsed ? 'w-14' : 'w-[280px]'"
            :aria-expanded="!sidebarCollapsed"
            aria-label="Candidate list"
          >
            <div
              v-show="sidebarCollapsed"
              class="flex h-11 shrink-0 items-center justify-start pl-1.5 pr-5"
            >
              <button
                type="button"
                class="flex h-7 w-7 items-center justify-center rounded-md border border-brand-200/80 bg-brand-50/60 text-base font-semibold leading-none text-brand-700 hover:bg-brand-100"
                title="New candidate packet"
                aria-label="New candidate packet"
                @click="newPacketModalOpen = true"
              >
                +
              </button>
            </div>
            <div
              v-show="sidebarCollapsed"
              class="flex flex-1 flex-col items-center gap-2 p-2"
            >
              <p class="sr-only">
                Candidate list is collapsed. Expand to search and select candidates.
              </p>
            </div>

            <div
              v-show="!sidebarCollapsed"
              class="flex min-h-0 min-w-[280px] flex-1 flex-col"
            >
              <div class="flex h-11 shrink-0 items-center pl-3 pr-5">
                <button
                  type="button"
                  class="w-full rounded-md border border-brand-200/80 bg-brand-50/60 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-100"
                  @click="newPacketModalOpen = true"
                >
                  + New candidate
                </button>
              </div>
              <div class="shrink-0 space-y-1.5 pb-1.5 pl-3 pr-5 pt-3">
                <div class="relative">
                  <svg
                    class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
                  </svg>
                  <input
                    v-model="search"
                    type="search"
                    placeholder="Search…"
                    class="sidebar-search"
                    aria-label="Search candidates"
                  >
                </div>
                <div
                  class="segmented-control relative grid-cols-3"
                  role="tablist"
                  aria-label="Candidate status filter"
                >
                  <span
                    aria-hidden="true"
                    class="segmented-indicator w-[calc((100%-0.25rem)/3)]"
                    :class="{
                      'left-0': listFilter === 'all',
                      'left-[calc(0.125rem+(100%-0.25rem)/3)]': listFilter === 'draft',
                      'left-[calc(0.25rem+2*((100%-0.25rem)/3))]': listFilter === 'submitted',
                    }"
                  />
                  <button
                    type="button"
                    role="tab"
                    class="segmented-tab relative z-10 px-1.5 py-1 text-[11px]"
                    :class="listFilter === 'all' ? 'segmented-tab-active' : ''"
                    :aria-selected="listFilter === 'all'"
                    @click="listFilter = 'all'"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class="segmented-tab relative z-10 px-1.5 py-1 text-[11px]"
                    :class="listFilter === 'draft' ? 'segmented-tab-active' : ''"
                    :aria-selected="listFilter === 'draft'"
                    @click="listFilter = 'draft'"
                  >
                    Drafts
                  </button>
                  <button
                    type="button"
                    role="tab"
                    class="segmented-tab relative z-10 px-1.5 py-1 text-[11px]"
                    :class="listFilter === 'submitted' ? 'segmented-tab-active' : ''"
                    :aria-selected="listFilter === 'submitted'"
                    @click="listFilter = 'submitted'"
                  >
                    Submitted
                  </button>
                </div>
              </div>
              <div class="min-h-0 flex-1 overflow-y-auto pb-3 pl-3 pr-5">
                <div
                  v-if="candidatesError"
                  class="rounded-md border border-red-200 bg-red-50 px-2.5 py-2 text-sm text-red-800"
                >
                  {{ candidatesError }}
                  <button type="button" class="ml-1 underline" @click="loadCandidates()">Retry</button>
                </div>
                <AdminCandidateList
                  v-else
                  :candidates="candidates"
                  :search="search"
                  :list-filter="listFilter"
                  :loading="loadingCandidates"
                  :selected-id="selectedCandidate?.id ?? null"
                  @select="selectCandidate"
                  @delete="deleteDraftCandidate"
                />
              </div>
            </div>
          </aside>

          <section class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
            <div class="flex h-11 shrink-0 items-center px-4">
              <div class="mx-auto flex w-full max-w-5xl items-center">
              <div
                class="segmented-control relative w-full max-w-xs grid-cols-2"
                role="tablist"
                aria-label="Dashboard view"
              >
                <span
                  aria-hidden="true"
                  class="segmented-indicator w-[calc((100%-0.125rem)/2)]"
                  :class="adminView === 'table'
                    ? 'left-[calc(0.125rem+(100%-0.125rem)/2)]'
                    : 'left-0'"
                />
                <button
                  type="button"
                  role="tab"
                  class="segmented-tab relative z-10 px-2 py-1.5 text-xs sm:text-sm"
                  :class="adminView === 'builder' ? 'segmented-tab-active' : ''"
                  :aria-selected="adminView === 'builder'"
                  @click="setAdminView('builder')"
                >
                  Builder
                </button>
                <button
                  type="button"
                  role="tab"
                  class="segmented-tab relative z-10 px-2 py-1.5 text-xs sm:text-sm"
                  :class="adminView === 'table' ? 'segmented-tab-active' : ''"
                  :aria-selected="adminView === 'table'"
                  @click="setAdminView('table')"
                >
                  All candidates
                </button>
              </div>
              </div>
            </div>

            <div class="relative min-h-0 flex-1 overflow-hidden">
            <Transition name="admin-view" mode="out-in">
              <div v-if="adminView === 'builder'" key="builder" class="flex h-full min-h-0 flex-col px-4 pb-4 pt-3">
                <AdminCandidateBuilder
                  v-if="selectedCandidate"
                  :key="`${selectedCandidate.id}-${builderReloadKey}`"
                  :candidate="selectedCandidate"
                  :sidebar-collapsed="sidebarCollapsed"
                  @reload="loadCandidates()"
                  @drawer-open="onBuilderDrawerOpen"
                  @preview-open="onBuilderDrawerOpen"
                />
                <div
                  v-else
                  class="builder-elevated-surface mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col items-center justify-center p-8 text-center"
                >
                  <h2 class="text-lg font-semibold text-slate-900">Resume builder</h2>
                  <p class="mt-2 max-w-md text-sm text-slate-600">
                    Create a candidate packet or select one from the list to upload a resume, parse, and complete the VMS packet.
                  </p>
                  <button
                    type="button"
                    class="mt-4 rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-accent-600"
                    @click="newPacketModalOpen = true"
                  >
                    + New candidate packet
                  </button>
                </div>
              </div>

              <div v-else key="table" class="h-full min-h-0 overflow-y-auto px-4 pb-4 pt-3">
                <CandidatesTable
                  :candidates="candidates"
                  :search="search"
                  :list-filter="listFilter"
                  :loading="loadingCandidates"
                  :selected-id="selectedCandidate?.id ?? null"
                  @select="openInBuilder"
                  @download="downloadCandidateDocx"
                  @open-intake="openCandidateIntake"
                  @delete="deleteDraftCandidate"
                />
              </div>
            </Transition>
            </div>
          </section>
        </div>
      </div>

      <NewCandidatePacketModal
        :open="newPacketModalOpen"
        @close="newPacketModalOpen = false"
        @ready="onPacketReady"
        @link-ready="onIntakeLinkReady"
      />

      <ParseQAPanel
        :open="parseQaOpen"
        :candidate-id="selectedCandidate?.id ?? null"
        :candidate-name="parseQaCandidateName"
        @close="parseQaOpen = false"
      />
    </template>
  </div>
</template>

<style scoped>
.rocket-orbit {
  animation: rocket-orbit 10s linear infinite;
  transform-origin: center;
}

.rocket-orbit > div {
  animation: rocket-counter-orbit 10s linear infinite;
}

.resume-rocket-visual {
  animation: resume-visual-float 5s ease-in-out infinite;
}

@keyframes rocket-orbit {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes rocket-counter-orbit {
  from {
    transform: translateY(-50%) rotate(0deg);
  }

  to {
    transform: translateY(-50%) rotate(-360deg);
  }
}

@keyframes resume-visual-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-0.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rocket-orbit,
  .rocket-orbit > div,
  .resume-rocket-visual {
    animation: none;
  }
}
</style>
