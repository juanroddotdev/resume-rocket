#!/usr/bin/env node
/**
 * Dump parse audit payloads for recent candidates (admin QA / fixture authoring).
 * Usage: node --env-file=.env scripts/dump-parse-audit.mjs [limit]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { buildParseAuditView } from '../server/utils/parseAuditView.ts'

const limit = Number(process.argv[2] || 10)
const url = process.env.NUXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY

if (!url || !serviceKey) {
  console.error('Set NUXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const { data, error } = await supabase
  .from('candidates')
  .select('id, first_name, last_name, parse_error, parsed_resume, employers, licenses, education, credentials, license_state, license_number, updated_at')
  .not('parsed_resume', 'is', null)
  .order('updated_at', { ascending: false })
  .limit(limit)

if (error) {
  console.error(error.message)
  process.exit(1)
}

const rows = (data ?? []).map((row) => {
  const view = buildParseAuditView({
    candidateId: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    parseError: row.parse_error,
    parsedResume: row.parsed_resume,
    wizardEmployers: row.employers,
    wizardLicenses: row.licenses,
    wizardEducation: row.education,
    wizardCredentials: row.credentials,
    licenseState: row.license_state,
    licenseNumber: row.license_number,
  })
  return {
    id: row.id,
    updated_at: row.updated_at,
    name: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    view,
  }
})

const outDir = join(process.cwd(), 'data', 'parse-audit-dumps')
mkdirSync(outDir, { recursive: true })

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const outPath = join(outDir, `parse-audit-${stamp}.json`)
writeFileSync(outPath, JSON.stringify(rows, null, 2))

console.log(`Wrote ${rows.length} candidate audit view(s) to ${outPath}`)
