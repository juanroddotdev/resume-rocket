<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const lastUrl = ref('')
const expiresAt = ref('')
const copied = ref(false)
const error = ref<string | null>(null)

const emit = defineEmits<{
  created: []
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
    const res = await $fetch<{ url: string; expires_at: string }>('/api/invites', {
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
    emit('created')
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
    <p class="mt-1 text-sm text-slate-600">Send this link to a candidate (expires in 7 days).</p>
    <input
      v-model="email"
      type="email"
      placeholder="Candidate email (optional)"
      class="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
    >
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        :disabled="loading"
        @click="createInvite"
      >
        {{ loading ? 'Creating…' : 'Create intake link' }}
      </button>
      <a
        v-if="lastUrl"
        :href="lastUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="rounded-lg border border-brand-600 px-4 py-2 text-sm font-medium text-brand-700"
      >
        Open link
      </a>
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
      <p v-if="copied" class="mt-1 text-xs font-medium text-green-700">Copied!</p>
      <p v-else class="mt-1 text-xs text-slate-500">Tap the link above to select and copy, then send it to your candidate.</p>
    </div>
    <p v-if="expiresAt" class="mt-1 text-xs text-slate-500">
      Expires {{ new Date(expiresAt).toLocaleString() }}
    </p>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
