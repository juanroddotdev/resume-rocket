<script setup lang="ts">
const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const lastUrl = ref('')
const error = ref<string | null>(null)

async function createInvite() {
  loading.value = true
  error.value = null
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
    await navigator.clipboard.writeText(res.url)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string } }
    error.value = err.data?.statusMessage || 'Failed to create invite'
  } finally {
    loading.value = false
  }
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
    <button
      type="button"
      class="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      :disabled="loading"
      @click="createInvite"
    >
      {{ loading ? 'Creating…' : 'Copy intake link' }}
    </button>
    <p v-if="lastUrl" class="mt-2 break-all text-xs text-brand-700">
      Copied: {{ lastUrl }}
    </p>
    <p v-if="error" class="mt-2 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
