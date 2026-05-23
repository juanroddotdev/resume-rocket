import type { H3Event } from 'h3'
import { createClient } from '@supabase/supabase-js'

export async function requireAdminSession(event: H3Event) {
  const authHeader = getHeader(event, 'authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, statusMessage: 'Admin authorization required' })
  }

  const jwt = authHeader.slice(7)
  const url = process.env.SUPABASE_URL || process.env.NUXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.SUPABASE_KEY || process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw createError({ statusCode: 500, statusMessage: 'Supabase not configured' })
  }

  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await client.auth.getUser(jwt)
  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid session' })
  }

  return data.user
}
