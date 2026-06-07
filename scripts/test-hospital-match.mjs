/**
 * Smoke test: hospitalMatch returns scored rows for known facility names.
 * Usage: node --env-file=.env scripts/test-hospital-match.mjs
 */
import { matchHospitals } from '../server/utils/hospitalMatch.ts'

const queries = [
  { name: 'Mayo', city: 'Rochester', state: 'MN' },
  { name: 'Cleveland Clinic', state: 'OH' },
  { name: 'Memorial', city: 'Houston', state: 'TX' },
]

let passed = 0
let failed = 0

for (const query of queries) {
  try {
    const matches = await matchHospitals(query, 3)
    if (!matches.length) {
      console.warn(`WARN no matches for "${query.name}" — seed data may omit this facility`)
      continue
    }
    const top = matches[0]
    console.log(`OK "${query.name}" → ${top.name} (score ${top.score.toFixed(2)})`)
    passed++
  } catch (e) {
    console.error(`FAIL "${query.name}":`, e instanceof Error ? e.message : e)
    failed++
  }
}

if (failed > 0) {
  process.exit(1)
}

console.log(`\nHospital match smoke: ${passed} query(s) returned results, ${failed} failed`)
process.exit(0)
