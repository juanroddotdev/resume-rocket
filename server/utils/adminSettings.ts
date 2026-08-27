import type { User } from '@supabase/supabase-js'
import {
  appSettingsPatchSchema,
  DEFAULT_APP_SETTINGS,
  formatUploadSize,
  GEMINI_MODEL_OPTIONS,
  normalizeAppSettings,
  type AdminSettingsResponse,
  type AppSettings,
  type AppSettingsPatch,
} from '~/utils/adminSettings'
import { isGeminiConfigured } from '~/server/utils/geminiShared'

const APP_SETTINGS_COLUMNS = [
  'default_invite_expiration_days',
  'allowed_upload_mime_types',
  'max_upload_bytes',
  'company_name',
  'brand_primary_color',
  'logo_storage_path',
  'packet_disclaimer',
  'facility_search_template',
  'license_lookup_template',
  'gemini_model',
  'gemini_extra_instructions',
].join(', ')

export function uploadTooLargeMessage(settings: Pick<AppSettings, 'max_upload_bytes'>) {
  return `File must be ${formatUploadSize(settings.max_upload_bytes)} or smaller`
}

export async function getAppSettings(): Promise<AppSettings> {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('app_settings')
    .select(APP_SETTINGS_COLUMNS)
    .eq('id', 1)
    .maybeSingle()

  if (error) throw error
  return normalizeAppSettings(data ?? DEFAULT_APP_SETTINGS)
}

export async function updateAppSettings(
  patchInput: unknown,
  user: Pick<User, 'id'>,
): Promise<AppSettings> {
  const patch = appSettingsPatchSchema.parse(patchInput) as AppSettingsPatch
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('app_settings')
    .upsert({ id: 1, ...patch, updated_by: user.id }, { onConflict: 'id' })
    .select(APP_SETTINGS_COLUMNS)
    .single()

  if (error) throw error
  return normalizeAppSettings(data)
}

export function serializeAdminSettings(settings: AppSettings): AdminSettingsResponse {
  const config = useRuntimeConfig()
  const model = GEMINI_MODEL_OPTIONS.includes(settings.gemini_model)
    ? settings.gemini_model
    : DEFAULT_APP_SETTINGS.gemini_model

  return {
    ...settings,
    gemini_model: model,
    integrations: {
      gemini: {
        configured: isGeminiConfigured(config.geminiApiKey),
        model,
      },
      resend: {
        configured: Boolean(config.resendApiKey?.trim()),
      },
    },
  }
}
