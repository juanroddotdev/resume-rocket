/**
 * Extract docxtemplater tags from server/assets/template.docx and diff vs docxBuilder.
 * Usage: node scripts/inventory-template-tags.mjs [--json]
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import PizZip from 'pizzip'
import { mapCandidateToTemplateData } from '../server/utils/docxBuilder.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const templatePath = join(__dirname, '../server/assets/template.docx')
const jsonOut = process.argv.includes('--json')

/** Word XML parts that may contain template tags. */
const XML_PARTS = /^word\/(document|header\d+|footer\d+|footnotes|endnotes)\.xml$/

/** Match docxtemplater tags: {#loop}, {/loop}, {scalar}, {.} */
const TAG_RE = /\{([#/]?)([^{}]+)\}/g

function collectXmlParts(zip) {
  return Object.keys(zip.files).filter(name => XML_PARTS.test(name))
}

function extractTagsFromXml(xml) {
  const tags = new Set()
  const loops = new Set()
  let match

  while ((match = TAG_RE.exec(xml)) !== null) {
    const marker = match[1]
    const raw = match[2].trim()
    if (raw === '.') continue

    if (marker === '#') {
      loops.add(raw)
    } else if (marker === '/') {
      loops.add(raw)
    } else {
      tags.add(raw)
    }
  }

  return { tags, loops }
}

function flattenBuilderKeys(obj) {
  const scalar = new Set()
  const loops = new Set()

  function walk(value, loopContext) {
    if (Array.isArray(value)) {
      if (loopContext) loops.add(loopContext)
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        walk(value[0], null)
      }
      return
    }
    if (value && typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) {
        if (Array.isArray(nested)) {
          walk(nested, key)
        } else {
          scalar.add(key)
        }
      }
    }
  }

  walk(obj, null)
  return { scalar, loops }
}

/** Tags inside loops when fixture arrays are empty in mapCandidateToTemplateData(). */
const NESTED_LOOP_SCALARS = {
  education: ['education_degree', 'education_school_name', 'education_graduation_year'],
}

const NESTED_EXPERIENCE_LOOPS = [
  'experience_floated_units_list',
  'experience_equipment_procedures_list',
  'experience_highlights',
]

function applyNestedSchema(builder) {
  for (const tags of Object.values(NESTED_LOOP_SCALARS)) {
    for (const tag of tags) builder.scalar.add(tag)
  }
  for (const loop of NESTED_EXPERIENCE_LOOPS) {
    builder.loops.add(loop)
  }
}

function loadTemplateTags() {
  if (!existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`)
    console.error('Copy your contract template to server/assets/template.docx or run: node scripts/generate-template.mjs')
    process.exit(1)
  }

  const zip = new PizZip(readFileSync(templatePath))
  const parts = collectXmlParts(zip)
  const allTags = new Set()
  const allLoops = new Set()
  const byPart = {}

  for (const part of parts) {
    const xml = zip.file(part)?.asText() ?? ''
    const { tags, loops } = extractTagsFromXml(xml)
    byPart[part] = { tags: [...tags].sort(), loops: [...loops].sort() }
    for (const t of tags) allTags.add(t)
    for (const l of loops) allLoops.add(l)
  }

  return {
    parts,
    byPart,
    tags: [...allTags].sort(),
    loops: [...allLoops].sort(),
  }
}

function loadBuilderKeys() {
  const fixture = {
    first_name: 'X',
    last_name: 'Y',
    email: 'a@b.c',
    phone: '1',
    license_number: '1',
    license_state: 'CA',
    emr_system: 'Epic',
    specialties: ['ICU'],
    credentials: { BLS: true },
    employers: [
      {
        name: 'H',
        role: 'RN',
        city: 'C',
        state: 'ST',
        beds: 1,
        traumaLevel: 'I',
        teachingStatus: true,
        startDate: '2020',
        endDate: '2024',
      },
    ],
  }

  const data = mapCandidateToTemplateData(fixture)
  const builder = flattenBuilderKeys(data)
  applyNestedSchema(builder)
  return builder
}

function main() {
  const template = loadTemplateTags()
  const builder = loadBuilderKeys()

  const templateScalars = template.tags
  const templateLoops = template.loops

  const builderScalars = [...builder.scalar].sort()
  const builderLoops = [...builder.loops].sort()

  const inTemplateNotBuilder = templateScalars.filter(t => !builder.scalar.has(t))
  const inBuilderNotTemplate = builderScalars.filter(t => !template.tags.includes(t))
  const loopsInTemplateNotBuilder = templateLoops.filter(l => !builder.loops.has(l))
  const loopsInBuilderNotTemplate = builderLoops.filter(l => !template.loops.includes(l))

  const report = {
    templatePath,
    xmlParts: template.parts,
    template: { scalars: templateScalars, loops: templateLoops },
    builder: { scalars: builderScalars, loops: builderLoops },
    unmappedInBuilder: inTemplateNotBuilder,
    unusedInTemplate: inBuilderNotTemplate,
    unmappedLoopsInBuilder: loopsInTemplateNotBuilder,
    unusedLoopsInTemplate: loopsInBuilderNotTemplate,
  }

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(`Template: ${templatePath}`)
  console.log(`XML parts scanned: ${template.parts.join(', ')}\n`)

  console.log(`Template scalar tags (${templateScalars.length}):`)
  for (const t of templateScalars) console.log(`  ${t}`)

  console.log(`\nTemplate loop tags (${templateLoops.length}):`)
  for (const l of templateLoops) console.log(`  {#${l}}...{/${l}}`)

  console.log(`\n--- Diff vs mapCandidateToTemplateData() ---\n`)

  if (inTemplateNotBuilder.length === 0 && loopsInTemplateNotBuilder.length === 0) {
    console.log('All template tags have builder keys.')
  } else {
    if (inTemplateNotBuilder.length) {
      console.log(`In template, NOT in docxBuilder (${inTemplateNotBuilder.length}):`)
      for (const t of inTemplateNotBuilder) console.log(`  ${t}`)
    }
    if (loopsInTemplateNotBuilder.length) {
      console.log(`Loop tags in template, NOT in docxBuilder (${loopsInTemplateNotBuilder.length}):`)
      for (const l of loopsInTemplateNotBuilder) console.log(`  ${l}`)
    }
  }

  if (inBuilderNotTemplate.length || loopsInBuilderNotTemplate.length) {
    console.log('')
    if (inBuilderNotTemplate.length) {
      console.log(`In docxBuilder, NOT in template (${inBuilderNotTemplate.length}):`)
      for (const t of inBuilderNotTemplate) console.log(`  ${t}`)
    }
    if (loopsInBuilderNotTemplate.length) {
      console.log(`Loop keys in docxBuilder, NOT in template (${loopsInBuilderNotTemplate.length}):`)
      for (const l of loopsInBuilderNotTemplate) console.log(`  ${l}`)
    }
  }

  const exitCode =
    inTemplateNotBuilder.length > 0 || loopsInTemplateNotBuilder.length > 0 ? 1 : 0
  if (exitCode === 1) {
    console.log('\nUpdate docxBuilder and docs/VMS-FIELD-MANIFEST.md for unmapped tags.')
  } else {
    console.log('\nOK — every template tag has a docxBuilder key (values may still be blank).')
  }

  process.exit(exitCode)
}

main()
