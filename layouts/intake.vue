<template>
  <div class="min-h-dvh bg-slate-200 lg:flex lg:justify-center">
    <div
      class="relative mx-auto flex w-full max-w-md min-h-dvh flex-col bg-slate-50 lg:shadow-xl lg:ring-1 lg:ring-slate-200/80"
    >
      <header class="sticky top-0 z-30 shrink-0 border-b border-slate-200 bg-white px-4 py-3">
        <NuxtLink to="/" class="text-lg font-semibold text-brand-700">Resume Rocket</NuxtLink>
      </header>
      <main class="relative flex-1 px-4 py-6">
        <slot />
      </main>
    </div>
  </div>
</template>
