<template>
  <div class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3">
        <NuxtLink to="/" class="text-lg font-semibold text-brand-700">Resume Rocket</NuxtLink>
        <nav class="flex gap-4 text-sm">
          <NuxtLink to="/admin" class="font-medium text-brand-700">Admin</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-[1400px] px-4 py-8">
      <slot />
    </main>
  </div>
</template>
