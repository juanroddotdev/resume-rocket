<script setup lang="ts">
definePageMeta({ layout: 'intake' })

const route = useRoute()
const accessToken = computed(() => String(route.params.accessToken))
const loading = ref(false)
const error = ref<string | null>(null)

async function download() {
  loading.value = true
  error.value = null
  try {
    await downloadResumeDocxFromApi({
      body: { access_token: accessToken.value },
    })
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'Could not download your packet. The link may be invalid — check your connection and try again.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="py-10 text-center">
    <h1 class="text-xl font-bold text-slate-900">Your resume</h1>
    <p class="mt-2 text-slate-600">
      Download your VMS-ready placement packet (DOCX). Your recruiter has the same file for hospital submission.
    </p>
    <p class="mt-2 text-sm text-slate-500">
      Your recruiter may finalize a few packet details before sending it to the hospital.
    </p>
    <button
      type="button"
      class="mt-6 rounded-lg bg-accent-500 px-6 py-3 font-medium text-brand-900 hover:bg-accent-600 disabled:opacity-50"
      :disabled="loading"
      @click="download"
    >
      {{ loading ? 'Preparing…' : 'Download DOCX' }}
    </button>
    <p v-if="error" class="mt-4 text-sm text-red-600">
      {{ error }}
      <button type="button" class="ml-1 underline" @click="download">Retry</button>
    </p>
  </div>
</template>
