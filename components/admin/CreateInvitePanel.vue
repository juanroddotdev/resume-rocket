<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const lastUrl = ref('')
const expiresAt = ref('')
const copied = ref(false)
const error = ref<string | null>(null)

const emit = defineEmits<{
  created: [payload: { inviteId: string; url: string }]
}>()

async function createInvite() {
  loading.value = true
  error.value = null
  copied.value = false
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) {
      error.value = 'Sign in required'
      return
    }
    const res = await $fetch<{ id: string; url: string; expires_at: string }>('/api/invites', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: {
        candidate_email: email.value || undefined,
        expires_in_days: 7,
      },
    })
    lastUrl.value = res.url
    expiresAt.value = res.expires_at
    try {
      await navigator.clipboard.writeText(res.url)
      copied.value = true
    } catch {
      copied.value = false
    }
    emit('created', { inviteId: res.id, url: res.url })
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Failed to create invite'
  } finally {
    loading.value = false
  }
}

function selectUrlInput(e: FocusEvent) {
  (e.target as HTMLInputElement).select()
}
</script>

<template>
  <div class="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
    <h2 class="text-lg font-semibold text-slate-900">Create intake link</h2>
    <p class="mt-1 text-sm text-slate-600">
      Creates a candidate draft you can build here. Copy the link when you want the candidate to finish on their phone.
    </p>
    <input
      v-model="email"
      type="email"
      placeholder="Candidate email (optional)"
      class="field mt-3"
    >
    <div class="mt-3">
      <button
        type="button"
        class="w-full rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        :disabled="loading"
        @click="createInvite"
      >
        {{ loading ? 'Creating…' : 'Create link & start packet' }}
      </button>
    </div>
    <div
      v-if="lastUrl && copied"
      class="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900"
      role="status"
    >
      <p class="font-medium">Link created and copied</p>
      <p class="mt-0.5 text-xs text-green-800">Builder opened for this packet — share the link when ready for candidate handoff.</p>
    </div>
    <div v-if="lastUrl" class="mt-3">
      <input
        :value="lastUrl"
        type="text"
        readonly
        class="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700"
        aria-label="Intake link URL"
        @focus="selectUrlInput"
      >
      <p v-if="!copied" class="mt-1 text-xs text-slate-500">Select and copy to share with the candidate later.</p>
    </div>
    <p v-if="expiresAt" class="mt-1 text-xs text-slate-500">
      Expires {{ new Date(expiresAt).toLocaleString() }}
    </p>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
