<script setup lang="ts">
const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  close: []
  created: [payload: { inviteId: string; url: string; copied: boolean }]
}>()

const supabase = useSupabaseClient()
const email = ref('')
const loading = ref(false)
const error = ref<string | null>(null)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) {
      email.value = ''
      error.value = null
      loading.value = false
    }
  },
)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.open) {
    event.preventDefault()
    emit('close')
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))

async function createPacket() {
  loading.value = true
  error.value = null
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
    let copied = false
    try {
      await navigator.clipboard.writeText(res.url)
      copied = true
    } catch {
      copied = false
    }
    emit('created', { inviteId: res.id, url: res.url, copied })
    emit('close')
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Could not create packet'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div
    v-if="open"
    class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    role="presentation"
    @click.self="emit('close')"
  >
    <div
      class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-packet-title"
    >
      <h2 id="new-packet-title" class="text-lg font-semibold text-slate-900">New candidate packet</h2>
      <p class="mt-1 text-sm text-slate-600">
        Creates a draft you can build in the workspace. Copy the intake link from the builder when you are ready to hand off.
      </p>
      <label class="mt-4 block">
        <span class="field-label">Candidate email (optional)</span>
        <input
          v-model="email"
          type="email"
          autocomplete="email"
          placeholder="name@example.com"
          class="field mt-1"
          @keydown.enter.prevent="createPacket"
        >
      </label>
      <p v-if="error" class="mt-3 text-sm text-red-600" role="alert">{{ error }}</p>
      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="rounded-lg border px-4 py-2 text-sm" @click="emit('close')">
          Cancel
        </button>
        <button
          type="button"
          class="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          :disabled="loading"
          @click="createPacket"
        >
          {{ loading ? 'Creating…' : 'Create & open builder' }}
        </button>
      </div>
    </div>
  </div>
</template>
