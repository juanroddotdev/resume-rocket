<template>
  <div class="min-h-dvh bg-brand-100 lg:flex lg:justify-center">
    <div
      class="relative mx-auto flex w-full max-w-md min-h-dvh flex-col bg-canvas lg:max-w-3xl lg:shadow-xl lg:ring-1 lg:ring-brand-200/80"
    >
      <header class="sticky top-0 z-30 flex h-14 shrink-0 items-center border-b border-slate-200 bg-white px-4 lg:px-8">
        <NuxtLink to="/" class="text-lg font-semibold tracking-tight text-brand-700">Resume Rocket</NuxtLink>
      </header>
      <main class="relative flex-1 px-4 py-6 lg:px-8">
        <slot />
      </main>
    </div>
  </div>
</template>
