<template>
  <div class="min-h-screen">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <NuxtLink to="/" class="text-lg font-semibold text-brand-700">Resume Rocket</NuxtLink>
        <nav class="flex gap-4 text-sm">
          <NuxtLink to="/admin" class="text-slate-600 hover:text-brand-700">Admin</NuxtLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
