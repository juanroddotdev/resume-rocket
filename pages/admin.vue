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
const showAll = ref(true)
const loadingCandidates = ref(false)
const candidatesError = ref<string | null>(null)
const selectedCandidate = ref<CandidateRow | null>(null)
const parseQaOpen = ref(false)

type InviteSuccess = {
  url: string
  copied: boolean
}

const inviteSuccess = ref<InviteSuccess | null>(null)
const inviteBannerCopyFeedback = ref(false)

const parseQaCandidateName = computed(() => {
  if (!selectedCandidate.value) return 'Candidate'
  const name = `${selectedCandidate.value.first_name || ''} ${selectedCandidate.value.last_name || ''}`.trim()
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
    inviteSuccess.value = null
  }
}, { immediate: true })

async function onInviteCreated(payload: { inviteId: string; url: string; copied: boolean }) {
  inviteSuccess.value = { url: payload.url, copied: payload.copied }
  inviteBannerCopyFeedback.value = false

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) return
  try {
    const created = await $fetch<{ id: string }>('/api/admin/candidates', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: { intake_invite_id: payload.inviteId },
    })
    await loadCandidates(created.id)
  } catch {
    await loadCandidates()
  }
}

function dismissInviteBanner() {
  inviteSuccess.value = null
}

async function copyInviteUrl(url: string) {
  inviteBannerCopyFeedback.value = false
  try {
    await navigator.clipboard.writeText(url)
    inviteBannerCopyFeedback.value = true
  } catch {
    inviteBannerCopyFeedback.value = false
  }
}

function selectCandidate(candidate: CandidateRow) {
  selectedCandidate.value = candidate
}

function openParseQa() {
  if (!selectedCandidate.value) return
  parseQaOpen.value = true
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
      <div
        v-if="inviteSuccess"
        class="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900"
        role="status"
      >
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="font-medium">Packet created — builder ready</p>
            <p class="mt-0.5 text-xs text-green-800">
              Upload and complete the VMS packet in the builder on the right.
              <span v-if="inviteSuccess.copied"> Intake link copied for future candidate handoff.</span>
              <span v-else>Use Copy intake link in the builder footer when you want to share it.</span>
            </p>
            <button
              type="button"
              class="mt-3 rounded-lg border border-green-300 bg-white px-3 py-1.5 text-xs font-medium text-green-900 hover:bg-green-100"
              @click="copyInviteUrl(inviteSuccess.url)"
            >
              {{ inviteBannerCopyFeedback ? 'Copied!' : 'Copy intake link' }}
            </button>
          </div>
          <button
            type="button"
            class="shrink-0 text-xs font-medium text-green-800 underline"
            @click="dismissInviteBanner"
          >
            Dismiss
          </button>
        </div>
      </div>

      <div class="lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] lg:items-start lg:gap-8">
        <aside class="space-y-4 lg:sticky lg:top-8">
          <CreateInvitePanel @created="onInviteCreated" />
          <div>
            <div class="mb-2 flex flex-wrap items-center gap-3">
              <input
                v-model="search"
                type="search"
                placeholder="Search…"
                class="field min-w-0 flex-1 text-sm"
              >
              <label class="flex items-center gap-1.5 text-xs whitespace-nowrap">
                <input v-model="showAll" type="checkbox">
                Drafts
              </label>
            </div>
            <div
              v-if="candidatesError"
              class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
            >
              {{ candidatesError }}
              <button type="button" class="ml-1 underline" @click="loadCandidates()">Retry</button>
            </div>
            <AdminCandidateList
              v-else
              :candidates="candidates"
              :search="search"
              :show-all="showAll"
              :loading="loadingCandidates"
              :selected-id="selectedCandidate?.id ?? null"
              @select="selectCandidate"
            />
          </div>
        </aside>

        <section class="mt-8 lg:mt-0">
          <AdminCandidateBuilder
            v-if="selectedCandidate"
            :candidate="selectedCandidate"
            @reload="loadCandidates()"
            @open-parse-qa="openParseQa"
          />
          <div
            v-else
            class="flex min-h-[480px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center"
          >
            <h2 class="text-lg font-semibold text-slate-900">Resume builder</h2>
            <p class="mt-2 max-w-md text-sm text-slate-600">
              Create an intake link, then select a candidate on the left to upload their resume, parse, and complete the VMS packet here.
            </p>
          </div>
        </section>
      </div>

      <ParseQAPanel
        :open="parseQaOpen"
        :candidate-id="selectedCandidate?.id ?? null"
        :candidate-name="parseQaCandidateName"
        @close="parseQaOpen = false"
      />
    </template>
  </div>
</template>
