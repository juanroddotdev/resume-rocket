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
  <div class="min-h-dvh overflow-y-auto bg-[radial-gradient(circle_at_top_left,_rgba(230,179,92,0.22),_transparent_34%),linear-gradient(135deg,_#f8f9fc_0%,_#f4f3f8_48%,_#e8e6f0_100%)]">
    <section class="relative mx-auto grid min-h-dvh w-full max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.82fr)] lg:items-center lg:px-8 lg:py-10">
      <div class="pointer-events-none absolute inset-x-8 top-8 hidden h-32 rounded-full bg-white/35 blur-3xl lg:block" aria-hidden="true" />

      <div class="relative order-2 flex flex-col gap-8 lg:order-1">
        <div>
          <p class="inline-flex rounded-full border border-brand-200/80 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-600 shadow-sm">
            Recruiter workspace
          </p>
          <h1 class="mt-5 max-w-2xl text-4xl font-bold tracking-tight text-brand-900 sm:text-5xl">
            Build candidate packets faster.
          </h1>
          <p class="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">
            Resume Rocket helps recruiting teams turn uploaded resumes into reviewed, VMS-ready candidate packets without making candidates create an account.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M7 3.75h7.25L18 7.5v12.75H7V3.75Z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 3.75V8h4M9.5 12h5M9.5 15h5M9.5 18h3" />
              </svg>
            </div>
            <h2 class="mt-3 text-sm font-semibold text-slate-900">Parse resumes</h2>
            <p class="mt-1 text-sm leading-6 text-slate-600">Extract profile, work history, credentials, and facility details.</p>
          </div>
          <div class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 11.5 11 13.5 15.5 8.75M5 5.75h14v12.5H5z" />
              </svg>
            </div>
            <h2 class="mt-3 text-sm font-semibold text-slate-900">Review gaps</h2>
            <p class="mt-1 text-sm leading-6 text-slate-600">Spot missing packet fields before recruiters submit or export.</p>
          </div>
          <div class="rounded-2xl border border-white/70 bg-white/75 p-4 shadow-sm backdrop-blur">
            <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.5 4h11v16h-11zM9 8h6M9 11.5h6M9 15h3.5" />
              </svg>
            </div>
            <h2 class="mt-3 text-sm font-semibold text-slate-900">Export DOCX</h2>
            <p class="mt-1 text-sm leading-6 text-slate-600">Generate polished candidate packets from the completed profile.</p>
          </div>
        </div>

        <div class="relative overflow-hidden rounded-[2rem] border border-white/70 bg-brand-900 p-6 text-white shadow-2xl shadow-brand-900/20">
          <div class="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-accent-500/20 blur-3xl" aria-hidden="true" />
          <div class="relative grid gap-6 md:grid-cols-[0.9fr_1.1fr] md:items-center">
            <div>
              <p class="text-sm font-semibold uppercase tracking-[0.2em] text-accent-500">From resume to packet</p>
              <p class="mt-3 text-2xl font-semibold tracking-tight">One recruiter flow for intake, review, and document generation.</p>
              <p class="mt-3 text-sm leading-6 text-brand-100">
                Candidates complete invite links. Recruiters keep control of packet quality inside the admin workspace.
              </p>
            </div>

            <div class="resume-rocket-visual relative mx-auto h-64 w-full max-w-sm" aria-hidden="true">
              <div class="absolute inset-4 rounded-full border border-dashed border-accent-500/40" />
              <div class="absolute left-1/2 top-1/2 h-36 w-28 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/20 bg-white p-3 text-brand-900 shadow-2xl">
                <div class="mb-3 flex items-center gap-2">
                  <span class="h-8 w-8 rounded-full bg-brand-100" />
                  <span class="h-2 w-14 rounded-full bg-brand-200" />
                </div>
                <span class="mb-2 block h-2 rounded-full bg-slate-200" />
                <span class="mb-2 block h-2 w-4/5 rounded-full bg-slate-200" />
                <span class="mb-4 block h-2 w-3/5 rounded-full bg-slate-200" />
                <div class="grid grid-cols-2 gap-2">
                  <span class="h-8 rounded-lg bg-brand-50" />
                  <span class="h-8 rounded-lg bg-accent-500/25" />
                </div>
              </div>
              <div class="rocket-orbit absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2">
                <div class="absolute -right-3 top-1/2 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-2xl bg-accent-500 text-brand-900 shadow-xl shadow-accent-500/30">
                  <svg class="h-8 w-8 -rotate-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12.5 14.5 9 18l-3-3 3.5-3.5M12.5 14.5l4.25 1.25L21 8.5 15.5 3 8.25 7.25 9.5 11.5m3 3L9.5 11.5m0 0L15.5 3M6 18l-2 2" />
                  </svg>
                </div>
              </div>
              <div class="absolute bottom-5 left-4 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                Parse
              </div>
              <div class="absolute right-3 top-5 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                Review
              </div>
              <div class="absolute bottom-8 right-8 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                DOCX
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="relative order-1 lg:order-2">
        <div class="mx-auto w-full max-w-md rounded-[1.75rem] border border-white/80 bg-white/90 p-6 shadow-2xl shadow-brand-900/10 backdrop-blur sm:p-8">
          <div>
            <p class="text-sm font-medium text-brand-600">Resume Rocket admin</p>
            <h2 class="mt-2 text-2xl font-bold tracking-tight text-slate-900">Recruiter sign in</h2>
            <p class="mt-2 text-sm leading-6 text-slate-600">
              Access is limited to recruiting teams. Candidates use invite links sent by recruiters.
            </p>
          </div>

          <form class="mt-8 space-y-4" @submit.prevent="emit('submit')">
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
              class="w-full rounded-xl bg-accent-500 px-4 py-3 text-sm font-semibold text-brand-900 shadow-sm shadow-accent-500/20 transition hover:bg-accent-600 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 motion-reduce:transition-none"
            >
              Sign in to admin
            </button>
          </form>

          <div class="mt-6 rounded-2xl border border-brand-100 bg-brand-50/70 p-4">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">Recruiter-only workflow</p>
            <p class="mt-2 text-sm leading-6 text-slate-600">
              Create invite links, review parsed resume data, and export packets from one secure workspace.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.rocket-orbit {
  animation: rocket-orbit 10s linear infinite;
  transform-origin: center;
}

.rocket-orbit > div {
  animation: rocket-counter-orbit 10s linear infinite;
}

.resume-rocket-visual {
  animation: resume-visual-float 5s ease-in-out infinite;
}

@keyframes rocket-orbit {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}

@keyframes rocket-counter-orbit {
  from {
    transform: translateY(-50%) rotate(0deg);
  }

  to {
    transform: translateY(-50%) rotate(-360deg);
  }
}

@keyframes resume-visual-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-0.5rem);
  }
}

@media (prefers-reduced-motion: reduce) {
  .rocket-orbit,
  .rocket-orbit > div,
  .resume-rocket-visual {
    animation: none;
  }
}
</style>
