import { getAppSettings, serializeAdminSettings } from '~/server/utils/adminSettings'

export default defineEventHandler(async (event) => {
  await requireAdminSession(event)
  const settings = await getAppSettings()
  return serializeAdminSettings(settings)
})
