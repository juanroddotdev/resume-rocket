import { getAppSettings, serializeAdminSettings, updateAppSettings } from '~/server/utils/adminSettings'

export default defineEventHandler(async (event) => {
  const user = await requireAdminSession(event)
  const body = await readBody(event)
  await updateAppSettings(body, user)
  const settings = await getAppSettings()
  return serializeAdminSettings(settings)
})
