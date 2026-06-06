<script setup lang="ts">
import type { CandidateRow } from '~/types/candidate'

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
  const { data, error } = await supabase
    .from('candidates')
    .select(
      'id, status, first_name, last_name, email, phone, license_number, license_state, specialties, credentials, employers, emr_system, parse_error, updated_at, created_at',
    )
    .order('updated_at', { ascending: false })
  loadingCandidates.value = false
  if (error) {
    candidatesError.value = 'Could not load candidates. Try again.'
    return
  }
  if (data) candidates.value = data as CandidateRow[]
}

watch(user, (u) => {
  if (u) loadCandidates()
}, { immediate: true })

async function downloadDocx(id: string) {
  downloadError.value = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const blob = await $fetch<Blob>('/api/generate-docx', {
      method: 'POST',
      headers: session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : {},
      body: { id },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `candidate-${id}.docx`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    downloadError.value = err.data?.statusMessage || err.message || 'Could not download DOCX. Try again.'
  }
}
</script>

<template>
  <div class="space-y-8">
    <div v-if="!user" class="mx-auto max-w-sm rounded-xl border bg-white p-6 shadow-sm">
      <h1 class="text-xl font-bold">Recruiter sign in</h1>
      <input v-model="email" type="email" placeholder="Email" class="mt-4 w-full rounded-lg border px-3 py-2">
      <input v-model="password" type="password" placeholder="Password" class="mt-2 w-full rounded-lg border px-3 py-2">
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
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-bold">Recruiter hub</h1>
        <button type="button" class="text-sm text-slate-600" @click="signOut">Sign out</button>
      </div>

      <CreateInvitePanel @created="loadCandidates" />

      <div class="flex flex-wrap items-center gap-4">
        <input
          v-model="search"
          type="search"
          placeholder="Search candidates…"
          class="flex-1 rounded-lg border px-3 py-2 text-sm min-w-[200px]"
        >
        <label class="flex items-center gap-2 text-sm">
          <input v-model="showAll" type="checkbox">
          Show drafts
        </label>
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
      />
    </template>
  </div>
</template>
