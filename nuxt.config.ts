export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss', '@nuxtjs/supabase'],
  components: [{ path: '~/components', pathPrefix: false }],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    resendApiKey: process.env.RESEND_API_KEY || '',
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
    supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    public: {
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    },
  },
  supabase: {
    redirect: false,
    url:
      process.env.NUXT_PUBLIC_SUPABASE_URL
      || process.env.SUPABASE_URL
      || '',
    key:
      process.env.NUXT_PUBLIC_SUPABASE_KEY
      || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
      || process.env.SUPABASE_KEY
      || process.env.SUPABASE_PUBLISHABLE_KEY
      || '',
    serviceKey:
      process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_KEY
      || '',
  },
  routeRules: {
    '/admin': { ssr: true },
  },
})
