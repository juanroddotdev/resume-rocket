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
    const blob = await $fetch<Blob>('/api/generate-docx', {
      method: 'POST',
      body: { access_token: accessToken.value },
      responseType: 'blob',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'resume.docx'
    a.click()
    URL.revokeObjectURL(url)
  } catch {
    error.value = 'Unable to download. Link may be invalid.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="py-10 text-center">
    <h1 class="text-xl font-bold">Your resume</h1>
    <p class="mt-2 text-slate-600">Download your VMS-ready document.</p>
    <button
      type="button"
      class="mt-6 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white disabled:opacity-50"
      :disabled="loading"
      @click="download"
    >
      {{ loading ? 'Downloading…' : 'Download DOCX' }}
    </button>
    <p v-if="error" class="mt-4 text-sm text-red-600">{{ error }}</p>
  </div>
</template>
