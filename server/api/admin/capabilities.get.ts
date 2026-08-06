import { isPlatformAdmin } from '~/server/utils/platformAdmin'

/** Session capabilities for the signed-in admin (email allowlist). */
export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)
  return {
    isPlatformAdmin: isPlatformAdmin(user),
  }
})
