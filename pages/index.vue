<script setup lang="ts">
definePageMeta({ layout: 'intake' })
</script>

<template>
  <div class="py-10 text-center">
    <h1 class="text-2xl font-bold text-slate-900">Resume Rocket</h1>
    <p class="mt-4 text-slate-600">
      Use the intake link your recruiter sent you to upload and enrich your resume.
    </p>
    <p class="mt-2 text-sm text-slate-500">
      Links look like: <code class="rounded bg-slate-100 px-1">/intake/your-token</code>
    </p>
    <NuxtLink
      to="/admin"
      class="mt-8 inline-block text-sm text-brand-700 hover:underline"
    >
      Recruiter admin →
    </NuxtLink>
  </div>
</template>
