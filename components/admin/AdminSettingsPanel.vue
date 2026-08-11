<script setup lang="ts">
import type { AdminSettingsResponse, AppSettings, UploadMimeType } from '~/utils/adminSettings'
import {
  DEFAULT_APP_SETTINGS,
  formatUploadSize,
  GEMINI_MODEL_OPTIONS,
  UPLOAD_TYPE_OPTIONS,
} from '~/utils/adminSettings'

type SettingsTab = 'integrations' | 'packet' | 'branding' | 'lookup' | 'system'

type SystemHealth = {
  integrations: AdminSettingsResponse['integrations']
  usage: {
    parses_this_month: number
    parse_failed_this_month: number
    partial_parse_this_month: number
    document_scan_this_month: number
  }
}

const tabs: Array<{ id: SettingsTab; label: string }> = [
  { id: 'integrations', label: 'Integrations' },
  { id: 'packet', label: 'Packet defaults' },
  { id: 'branding', label: 'Branding' },
  { id: 'lookup', label: 'Lookup templates' },
  { id: 'system', label: 'System' },
]

const supabase = useSupabaseClient()
const activeTab = ref<SettingsTab>('integrations')
const loading = ref(true)
const saving = ref(false)
const error = ref<string | null>(null)
const saved = ref(false)
const testStatus = ref<{ ok: boolean; message: string } | null>(null)
const testingGemini = ref(false)
const health = ref<SystemHealth | null>(null)
const healthLoading = ref(false)

const settings = ref<AdminSettingsResponse | null>(null)
const form = reactive<AppSettings>({
  default_invite_expiration_days: DEFAULT_APP_SETTINGS.default_invite_expiration_days,
  allowed_upload_mime_types: [...DEFAULT_APP_SETTINGS.allowed_upload_mime_types],
  max_upload_bytes: DEFAULT_APP_SETTINGS.max_upload_bytes,
  company_name: DEFAULT_APP_SETTINGS.company_name,
  brand_primary_color: DEFAULT_APP_SETTINGS.brand_primary_color,
  logo_storage_path: DEFAULT_APP_SETTINGS.logo_storage_path,
  packet_disclaimer: DEFAULT_APP_SETTINGS.packet_disclaimer,
  facility_search_template: DEFAULT_APP_SETTINGS.facility_search_template,
  license_lookup_template: DEFAULT_APP_SETTINGS.license_lookup_template,
  gemini_model: DEFAULT_APP_SETTINGS.gemini_model,
  gemini_extra_instructions: DEFAULT_APP_SETTINGS.gemini_extra_instructions,
})

const uploadSizeMb = computed({
  get: () => Math.round(form.max_upload_bytes / (1024 * 1024)),
  set: (value: number) => {
    form.max_upload_bytes = Number(value) * 1024 * 1024
  },
})

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Sign in required')
  }
  return { Authorization: `Bearer ${session.access_token}` }
}

function applySettings(next: AdminSettingsResponse) {
  settings.value = next
  form.default_invite_expiration_days = next.default_invite_expiration_days
  form.allowed_upload_mime_types = [...next.allowed_upload_mime_types]
  form.max_upload_bytes = next.max_upload_bytes
  form.company_name = next.company_name
  form.brand_primary_color = next.brand_primary_color
  form.logo_storage_path = next.logo_storage_path || ''
  form.packet_disclaimer = next.packet_disclaimer
  form.facility_search_template = next.facility_search_template
  form.license_lookup_template = next.license_lookup_template
  form.gemini_model = next.gemini_model
  form.gemini_extra_instructions = next.gemini_extra_instructions
}

async function loadSettings() {
  loading.value = true
  error.value = null
  try {
    const next = await $fetch<AdminSettingsResponse>('/api/admin/settings', {
      headers: await authHeaders(),
    })
    applySettings(next)
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Could not load settings.'
  } finally {
    loading.value = false
  }
}

async function loadHealth() {
  healthLoading.value = true
  try {
    health.value = await $fetch<SystemHealth>('/api/admin/settings/system-health', {
      headers: await authHeaders(),
    })
  } catch {
    health.value = null
  } finally {
    healthLoading.value = false
  }
}

async function saveSettings() {
  saving.value = true
  saved.value = false
  error.value = null
  testStatus.value = null
  try {
    const next = await $fetch<AdminSettingsResponse>('/api/admin/settings', {
      method: 'PATCH',
      headers: await authHeaders(),
      body: {
        default_invite_expiration_days: form.default_invite_expiration_days,
        allowed_upload_mime_types: form.allowed_upload_mime_types,
        max_upload_bytes: form.max_upload_bytes,
        company_name: form.company_name,
        brand_primary_color: form.brand_primary_color,
        logo_storage_path: form.logo_storage_path,
        packet_disclaimer: form.packet_disclaimer,
        facility_search_template: form.facility_search_template,
        license_lookup_template: form.license_lookup_template,
        gemini_model: form.gemini_model,
        gemini_extra_instructions: form.gemini_extra_instructions,
      },
    })
    applySettings(next)
    saved.value = true
    await loadHealth()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    error.value = err.data?.statusMessage || err.message || 'Could not save settings.'
  } finally {
    saving.value = false
  }
}

async function testGemini() {
  testingGemini.value = true
  testStatus.value = null
  error.value = null
  try {
    const result = await $fetch<{ ok: boolean; message: string }>('/api/admin/settings/test-gemini', {
      method: 'POST',
      headers: await authHeaders(),
    })
    testStatus.value = result
    await loadHealth()
  } catch (e: unknown) {
    const err = e as { data?: { statusMessage?: string }; message?: string }
    testStatus.value = {
      ok: false,
      message: err.data?.statusMessage || err.message || 'Gemini connection failed.',
    }
  } finally {
    testingGemini.value = false
  }
}

function toggleUploadMime(mime: UploadMimeType, checked: boolean) {
  const set = new Set(form.allowed_upload_mime_types)
  if (checked) set.add(mime)
  else set.delete(mime)
  if (!set.size) {
    error.value = 'At least one upload type must stay enabled.'
    return
  }
  error.value = null
  form.allowed_upload_mime_types = [...set] as UploadMimeType[]
}

function integrationBadge(configured: boolean) {
  return configured
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-amber-200 bg-amber-50 text-amber-800'
}

onMounted(async () => {
  await loadSettings()
  await loadHealth()
})
</script>

<template>
  <div class="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col">
    <div class="mb-4 shrink-0">
      <h1 class="text-xl font-semibold text-slate-950">Admin Settings</h1>
      <p class="mt-1 text-sm text-slate-600">
        Manage integration status, packet defaults, branding, lookup templates, and safe system diagnostics.
      </p>
    </div>

    <div
      v-if="loading"
      class="builder-elevated-surface flex min-h-[16rem] items-center justify-center text-sm text-slate-600"
    >
      Loading settings...
    </div>

    <div v-else class="builder-elevated-surface flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        class="grid shrink-0 gap-1 border-b border-slate-200 p-2 md:grid-cols-5"
        role="tablist"
        aria-label="Settings sections"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          role="tab"
          class="rounded-lg px-3 py-2 text-sm font-medium"
          :class="activeTab === tab.id ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-slate-100'"
          :aria-selected="activeTab === tab.id"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto p-5">
        <div
          v-if="error"
          class="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
          role="alert"
        >
          {{ error }}
          <button type="button" class="ml-2 underline" @click="error = null">Dismiss</button>
        </div>
        <p v-if="saved" class="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">
          Settings saved.
        </p>

        <section v-if="activeTab === 'integrations'" class="space-y-5">
          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-slate-950">Google Gemini</h2>
                <p class="mt-1 text-sm text-slate-600">
                  The API key remains in server runtime config. This page only controls the selected model and safe prompt appendix.
                </p>
              </div>
              <span
                class="rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="integrationBadge(settings?.integrations.gemini.configured ?? false)"
              >
                {{ settings?.integrations.gemini.configured ? 'Configured' : 'Missing key' }}
              </span>
            </div>

            <label class="mt-4 block text-sm font-medium text-slate-700" for="settings-gemini-model">Model</label>
            <select
              id="settings-gemini-model"
              v-model="form.gemini_model"
              class="field mt-1"
            >
              <option
                v-for="model in GEMINI_MODEL_OPTIONS"
                :key="model"
                :value="model"
              >
                {{ model }}
              </option>
            </select>

            <label class="mt-4 block text-sm font-medium text-slate-700" for="settings-gemini-extra">
              Additional parsing instructions
            </label>
            <textarea
              id="settings-gemini-extra"
              v-model="form.gemini_extra_instructions"
              class="field mt-1 min-h-28"
              maxlength="2000"
              placeholder="Example: Always preserve trauma levels as written."
            />
            <p class="mt-1 text-xs text-slate-500">
              Appended to the controlled healthcare VMS parser prompt. Do not include candidate-specific PHI here.
            </p>

            <div class="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
                :disabled="testingGemini || !(settings?.integrations.gemini.configured)"
                @click="testGemini"
              >
                {{ testingGemini ? 'Testing...' : 'Test Gemini connection' }}
              </button>
              <span
                v-if="testStatus"
                class="text-sm"
                :class="testStatus.ok ? 'text-emerald-700' : 'text-red-700'"
              >
                {{ testStatus.message }}
              </span>
            </div>
          </div>

          <div class="rounded-xl border border-slate-200 bg-white p-4">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-slate-950">Resend email</h2>
                <p class="mt-1 text-sm text-slate-600">
                  Confirmation email continues to degrade gracefully when the key is missing.
                </p>
              </div>
              <span
                class="rounded-full border px-2.5 py-1 text-xs font-medium"
                :class="integrationBadge(settings?.integrations.resend.configured ?? false)"
              >
                {{ settings?.integrations.resend.configured ? 'Configured' : 'Missing key' }}
              </span>
            </div>
          </div>
        </section>

        <section v-else-if="activeTab === 'packet'" class="space-y-5">
          <div class="grid gap-4 md:grid-cols-2">
            <div>
              <label class="block text-sm font-medium text-slate-700" for="settings-expiration">Default link expiration</label>
              <select id="settings-expiration" v-model.number="form.default_invite_expiration_days" class="field mt-1">
                <option :value="3">3 days</option>
                <option :value="7">7 days</option>
                <option :value="14">14 days</option>
                <option :value="30">30 days</option>
              </select>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700" for="settings-upload-size">Maximum upload size</label>
              <select id="settings-upload-size" v-model.number="uploadSizeMb" class="field mt-1">
                <option :value="5">5MB</option>
                <option :value="10">10MB</option>
                <option :value="15">15MB</option>
                <option :value="25">25MB</option>
              </select>
            </div>
          </div>

          <fieldset>
            <legend class="text-sm font-medium text-slate-700">Allowed upload types</legend>
            <div class="mt-2 grid gap-2 md:grid-cols-2">
              <label
                v-for="option in UPLOAD_TYPE_OPTIONS"
                :key="option.mime"
                class="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-slate-300"
                  :checked="form.allowed_upload_mime_types.includes(option.mime)"
                  @change="toggleUploadMime(option.mime, ($event.target as HTMLInputElement).checked)"
                >
                {{ option.label }}
              </label>
            </div>
            <p class="mt-2 text-xs text-slate-500">
              Server validation remains authoritative. Current max: {{ formatUploadSize(form.max_upload_bytes) }}.
            </p>
          </fieldset>
        </section>

        <section v-else-if="activeTab === 'branding'" class="space-y-5">
          <div class="grid gap-4 md:grid-cols-[1fr_auto]">
            <div>
              <label class="block text-sm font-medium text-slate-700" for="settings-company-name">Company name</label>
              <input id="settings-company-name" v-model="form.company_name" type="text" class="field mt-1">
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700" for="settings-brand-color">Primary color</label>
              <input
                id="settings-brand-color"
                v-model="form.brand_primary_color"
                type="color"
                class="mt-1 h-10 w-20 rounded-lg border border-slate-300 bg-white p-1"
              >
            </div>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700" for="settings-logo-path">Logo storage path</label>
            <input
              id="settings-logo-path"
              v-model="form.logo_storage_path"
              type="text"
              class="field mt-1"
              placeholder="Optional storage path; upload workflow ships later"
            >
            <p class="mt-1 text-xs text-slate-500">
              Logo upload is intentionally a follow-up so file validation and storage policies can be reviewed separately.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700" for="settings-disclaimer">Packet disclaimer / footer</label>
            <textarea id="settings-disclaimer" v-model="form.packet_disclaimer" class="field mt-1 min-h-28" maxlength="1000" />
          </div>
        </section>

        <section v-else-if="activeTab === 'lookup'" class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-slate-700" for="settings-facility-template">Facility verification template</label>
            <input id="settings-facility-template" v-model="form.facility_search_template" type="url" class="field mt-1">
            <p class="mt-1 text-xs text-slate-500">
              Supported placeholders: {facilityName}, {city}, {state}. Use https:// URLs only.
            </p>
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700" for="settings-license-template">License lookup template</label>
            <input
              id="settings-license-template"
              v-model="form.license_lookup_template"
              type="url"
              class="field mt-1"
              placeholder="Optional"
            >
            <p class="mt-1 text-xs text-slate-500">
              Supported placeholders: {licenseNumber}, {state}, {profession}. Leave blank if no standard lookup applies.
            </p>
          </div>
        </section>

        <section v-else class="space-y-5">
          <div class="grid gap-3 md:grid-cols-4">
            <div class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Parses this month</p>
              <p class="mt-2 text-2xl font-semibold text-slate-950">
                {{ healthLoading ? '...' : health?.usage.parses_this_month ?? 0 }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Failed</p>
              <p class="mt-2 text-2xl font-semibold text-slate-950">
                {{ healthLoading ? '...' : health?.usage.parse_failed_this_month ?? 0 }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Partial</p>
              <p class="mt-2 text-2xl font-semibold text-slate-950">
                {{ healthLoading ? '...' : health?.usage.partial_parse_this_month ?? 0 }}
              </p>
            </div>
            <div class="rounded-xl border border-slate-200 bg-white p-4">
              <p class="text-xs font-medium uppercase tracking-wide text-slate-500">Document scans</p>
              <p class="mt-2 text-2xl font-semibold text-slate-950">
                {{ healthLoading ? '...' : health?.usage.document_scan_this_month ?? 0 }}
              </p>
            </div>
          </div>

          <button
            type="button"
            class="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            :disabled="healthLoading"
            @click="loadHealth"
          >
            {{ healthLoading ? 'Refreshing...' : 'Refresh diagnostics' }}
          </button>
        </section>
      </div>

      <div class="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
        <p class="text-xs text-slate-500">
          Changes apply to new packets and future parses. Existing invite links keep their stored expiration.
        </p>
        <button
          type="button"
          class="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-brand-900 hover:bg-accent-600 disabled:opacity-50"
          :disabled="saving"
          @click="saveSettings"
        >
          {{ saving ? 'Saving...' : 'Save changes' }}
        </button>
      </div>
    </div>
  </div>
</template>
