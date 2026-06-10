<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'

definePageMeta({ layout: 'admin' })

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const email = ref('')
const password = ref('')
const authError = ref<string | null>(null)
const candidates = ref<CandidateRow[]>([])
const search = ref('')
const showAll = ref(false)
const loadingCandidates = ref(false)
const candidatesError = ref<string | null>(null)
const downloadError = ref<string | null>(null)
const parseQaOpen = ref(false)
const parseQaCandidate = ref<CandidateRow | null>(null)

const parseQaCandidateName = computed(() => {
  if (!parseQaCandidate.value) return 'Candidate'
  const name = `${parseQaCandidate.value.first_name || ''} ${parseQaCandidate.value.last_name || ''}`.trim()
  return name || 'Unnamed candidate'
})

async function signIn() {
  authError.value = null
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })
  if (error) authError.value = error.message
}

async function signOut() {
  await supabase.auth.signOut()
}

async function loadCandidates() {
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
  } catch {
    candidatesError.value = 'Could not load candidates. Try again.'
  } finally {
    loadingCandidates.value = false
  }
}

watch(user, (u) => {
  if (u) loadCandidates()
}, { immediate: true })

async function downloadDocx(candidate: CandidateRow) {
  downloadError.value = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await downloadResumeDocxFromApi({
      body: { id: candidate.id },
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
      firstName: candidate.first_name,
      lastName: candidate.last_name,
    })
  } catch (e: unknown) {
    downloadError.value = e instanceof Error ? e.message : 'Could not download DOCX. Try again.'
  }
}

function openParseQa(candidate: CandidateRow) {
  parseQaCandidate.value = candidate
  parseQaOpen.value = true
}

function closeParseQa() {
  parseQaOpen.value = false
  parseQaCandidate.value = null
}
</script>

<template>
  <div>
    <div v-if="!user" class="mx-auto max-w-sm rounded-xl border bg-white p-6 shadow-sm">
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

    <template v-else>
      <div class="mb-8 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Recruiter hub</h1>
        <button type="button" class="text-sm text-slate-600 hover:text-slate-900" @click="signOut">
          Sign out
        </button>
      </div>

      <div class="lg:grid lg:grid-cols-[minmax(320px,380px)_1fr] lg:items-start lg:gap-8">
        <aside class="space-y-6 lg:sticky lg:top-8">
          <CreateInvitePanel @created="loadCandidates" />
        </aside>

        <section class="mt-8 space-y-4 lg:mt-0">
          <div class="sticky top-0 z-10 -mx-1 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
            <div class="flex flex-wrap items-center gap-4">
              <input
                v-model="search"
                type="search"
                placeholder="Search candidates…"
                class="field min-w-[200px] flex-1 text-sm"
              >
              <label class="flex items-center gap-2 text-sm whitespace-nowrap">
                <input v-model="showAll" type="checkbox">
                Show drafts
              </label>
            </div>
          </div>

          <div
            v-if="downloadError"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {{ downloadError }}
          </div>

          <div
            v-if="candidatesError"
            class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {{ candidatesError }}
            <button type="button" class="ml-2 font-medium underline" @click="loadCandidates">
              Retry
            </button>
          </div>

          <CandidatesTable
            v-else
            :candidates="candidates"
            :search="search"
            :show-all="showAll"
            :loading="loadingCandidates"
            @download="downloadDocx"
            @open-parse-qa="openParseQa"
          />
        </section>
      </div>

      <ParseQAPanel
        :open="parseQaOpen"
        :candidate-id="parseQaCandidate?.id ?? null"
        :candidate-name="parseQaCandidateName"
        @close="closeParseQa"
      />
    </template>
  </div>
</template>
