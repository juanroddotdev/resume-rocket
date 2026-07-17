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
  intakeOpenError.value = 'No intake link for this candidate. Open in builder to copy the link.'
}
</script>

<template>
  <div class="h-full">
    <div v-if="!user" class="flex h-full items-center justify-center py-8">
      <div class="mx-auto w-full max-w-sm rounded-xl border bg-white p-6 shadow-sm">
      <h1 class="text-xl font-bold">Recruiter sign in</h1>
      <input v-model="email" type="email" autocomplete="email" placeholder="Email" class="field mt-4">
      <input v-model="password" type="password" autocomplete="current-password" placeholder="Password" class="field mt-2">
      <button
        type="button"
        class="mt-4 w-full rounded-lg bg-brand-600 py-2 font-medium text-white"
        @click="signIn"
      >
        Sign in
      </button>
      <p v-if="authError" class="mt-2 text-sm text-red-600">{{ authError }}</p>
      </div>
    </div>

    <template v-else>
      <div class="flex h-full min-h-0 flex-col">
        <div
          v-if="docxError || intakeOpenError"
          class="mb-3 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {{ docxError || intakeOpenError }}
          <button
            type="button"
            class="ml-2 underline"
            @click="docxError = null; intakeOpenError = null"
          >
            Dismiss
          </button>
        </div>

        <div class="relative flex min-h-0 flex-1 overflow-hidden rounded-xl border border-slate-200/80 bg-[#f4f5f7]">
          <button
            type="button"
            class="absolute top-2 z-20 flex h-7 w-7 -translate-x-1/2 items-center justify-center rounded-full border border-slate-200/80 bg-[#f4f5f7] text-slate-600 shadow-sm hover:bg-white hover:text-slate-900"
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
              class="flex h-11 shrink-0 items-center justify-start border-b border-slate-200/80 pl-1.5 pr-5"
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
              class="flex min-h-0 min-w-[280px] flex-1 flex-col pl-3 pr-5"
            >
              <div class="flex h-11 shrink-0 items-center border-b border-slate-200/80">
                <button
                  type="button"
                  class="w-full rounded-md border border-brand-200/80 bg-brand-50/60 px-3 py-1 text-sm font-medium text-brand-700 hover:bg-brand-100"
                  @click="newPacketModalOpen = true"
                >
                  + New candidate
                </button>
              </div>
              <div class="shrink-0 space-y-1.5 pb-1.5 pt-3">
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
                    class="segmented-indicator w-[calc((100%-0.75rem)/3)]"
                    :class="{
                      'left-1': listFilter === 'all',
                      'left-[calc(0.375rem+(100%-0.75rem)/3)]': listFilter === 'draft',
                      'left-[calc(0.5rem+2*(100%-0.75rem)/3)]': listFilter === 'submitted',
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
              <div class="min-h-0 flex-1 overflow-y-auto pb-3">
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
                />
              </div>
            </div>
          </aside>

          <section class="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
            <div class="flex h-11 shrink-0 items-center border-b border-slate-200/80 px-4">
              <div class="mx-auto flex w-full max-w-5xl items-center">
              <div
                class="segmented-control relative w-full max-w-xs grid-cols-2"
                role="tablist"
                aria-label="Dashboard view"
              >
                <span
                  aria-hidden="true"
                  class="segmented-indicator w-[calc((100%-0.625rem)/2)]"
                  :class="adminView === 'table'
                    ? 'left-[calc(0.375rem+(100%-0.625rem)/2)]'
                    : 'left-1'"
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
              <div v-if="adminView === 'builder'" key="builder" class="flex h-full min-h-0 flex-col p-4">
                <AdminCandidateBuilder
                  v-if="selectedCandidate"
                  :key="`${selectedCandidate.id}-${builderReloadKey}`"
                  :candidate="selectedCandidate"
                  :sidebar-collapsed="sidebarCollapsed"
                  @reload="loadCandidates()"
                  @drawer-open="onBuilderDrawerOpen"
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
                    class="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
                    @click="newPacketModalOpen = true"
                  >
                    + New candidate packet
                  </button>
                </div>
              </div>

              <div v-else key="table" class="h-full min-h-0 overflow-y-auto p-4">
                <CandidatesTable
                  :candidates="candidates"
                  :search="search"
                  :list-filter="listFilter"
                  :loading="loadingCandidates"
                  :selected-id="selectedCandidate?.id ?? null"
                  @select="openInBuilder"
                  @download="downloadCandidateDocx"
                  @open-intake="openCandidateIntake"
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
