<script setup lang="ts">
definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const user = useSupabaseUser()
const router = useRouter()

const email = ref('')
const password = ref('')
const authError = ref<string | null>(null)

watch(user, (currentUser) => {
  if (currentUser) {
    router.replace('/admin')
  }
}, { immediate: true })

async function signIn() {
  authError.value = null
  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    authError.value = error.message
    return
  }

  await router.push('/admin')
}
</script>

<template>
  <RecruiterLoginLanding
    v-model:email="email"
    v-model:password="password"
    :auth-error="authError"
    @submit="signIn"
  />
</template>
