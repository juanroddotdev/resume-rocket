<script setup lang="ts">
defineProps<{
  email: string
  password: string
  authError: string | null
}>()

const emit = defineEmits<{
  'update:email': [value: string]
  'update:password': [value: string]
  submit: []
}>()
</script>

<template>
  <div class="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
    <div class="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div class="text-center">
        <p class="text-lg font-semibold tracking-tight text-brand-700">Resume Rocket</p>
        <h1 class="mt-2 text-xl font-bold text-slate-900">Recruiter sign in</h1>
        <p class="mt-2 text-sm leading-6 text-slate-600">
          Sign in to access the candidate review workspace.
        </p>
      </div>

      <form class="mt-6 space-y-4" @submit.prevent="emit('submit')">
        <label class="block">
          <span class="field-label">Email</span>
          <input
            :value="email"
            type="email"
            autocomplete="email"
            placeholder="recruiter@example.com"
            class="field"
            required
            @input="emit('update:email', ($event.target as HTMLInputElement).value)"
          >
        </label>

        <label class="block">
          <span class="field-label">Password</span>
          <input
            :value="password"
            type="password"
            autocomplete="current-password"
            placeholder="Enter your password"
            class="field"
            required
            @input="emit('update:password', ($event.target as HTMLInputElement).value)"
          >
        </label>

        <p
          v-if="authError"
          class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {{ authError }}
        </p>

        <button
          type="submit"
          class="w-full rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-brand-900 hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2"
        >
          Sign in
        </button>
      </form>

      <p class="mt-5 text-center text-xs leading-5 text-slate-500">
        Candidates use invite links sent by recruiters.
      </p>
    </div>
  </div>
</template>
