/**
 * Restyle the contract DOCX template to match the resume visual brief:
 * Inter body, centered name/contact, section rules, title|date rows, italic subheaders.
 * Preview (docx-preview) and download share this file — do not style preview-only.
 *
 * Run: node scripts/restyle-template-resume.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import PizZip from 'pizzip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATE = join(__dirname, '../server/assets/template.docx')

/** Content width with 1.25" L/R margins on US Letter (12240 - 2*1800). */
const RIGHT_TAB_POS = 8640

const FONT = 'Inter'
const COLOR_BODY = '333333'
const COLOR_MUTED = '555555'
const COLOR_RULE = 'C0C0C0'

function rFonts() {
  return `<w:rFonts w:ascii="${FONT}" w:hAnsi="${FONT}" w:cs="${FONT}" w:eastAsia="${FONT}"/>`
}

/**
 * @param {object} opts
 * @param {number} [opts.sz] half-points
 * @param {boolean} [opts.bold]
 * @param {boolean} [opts.italic]
 * @param {string} [opts.color]
 * @param {boolean} [opts.caps]
 */
function rPr(opts = {}) {
  const sz = opts.sz ?? 21
  return `<w:rPr>${rFonts()}${opts.bold ? '<w:b/><w:bCs/>' : '<w:b w:val="0"/><w:bCs w:val="0"/>'}${opts.italic ? '<w:i/><w:iCs/>' : '<w:i w:val="0"/><w:iCs w:val="0"/>'}${opts.caps ? '<w:caps/>' : ''}<w:color w:val="${opts.color || COLOR_BODY}"/><w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr>`
}

/**
 * @param {object} opts
 * @param {number} [opts.after]
 * @param {number} [opts.before]
 * @param {number} [opts.line]
 * @param {'left'|'center'} [opts.jc]
 * @param {boolean} [opts.sectionRule]
 * @param {boolean} [opts.rightTab]
 * @param {boolean} [opts.bullet]
 * @param {ReturnType<typeof rPr>} [opts.rPr]
 */
function pPr(opts = {}) {
  const after = opts.after ?? 60
  const before = opts.before ?? 0
  const line = opts.line ?? 336
  const jc = opts.jc ?? 'left'
  const border = opts.sectionRule
    ? `<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="${COLOR_RULE}"/></w:pBdr>`
    : ''
  const tabs = opts.rightTab
    ? `<w:tabs><w:tab w:val="right" w:pos="${RIGHT_TAB_POS}"/></w:tabs>`
    : ''
  const numPr = opts.bullet
    ? '<w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr>'
    : ''
  return `<w:pPr>${numPr}${border}${tabs}<w:spacing w:after="${after}" w:before="${before}" w:line="${line}" w:lineRule="auto"/><w:jc w:val="${jc}"/>${opts.rPr || ''}</w:pPr>`
}

function run(text, style = {}) {
  const xmlSpace = text.startsWith(' ') || text.endsWith(' ') || text.includes('{')
    ? ' xml:space="preserve"'
    : ''
  return `<w:r>${rPr(style)}<w:t${xmlSpace}>${text}</w:t></w:r>`
}

function tabRun(style = {}) {
  return `<w:r>${rPr(style)}<w:tab/></w:r>`
}

function para(innerRuns, pOpts = {}) {
  return `<w:p>${pPr({ ...pOpts, rPr: pOpts.runStyle ? rPr(pOpts.runStyle) : undefined })}${innerRuns}</w:p>`
}

function textPara(text, style = {}, pOpts = {}) {
  return para(run(text, style), { ...pOpts, runStyle: style })
}

function blankPara() {
  return textPara('', { sz: 21 }, { after: 0, before: 0, line: 240 })
}

const bodyParas = [
  // Name header
  textPara('{candidate_first_name} {candidate_last_name}, RN', {
    sz: 40,
    bold: true,
    caps: true,
    color: COLOR_BODY,
  }, { jc: 'left', after: 80, before: 0, line: 276 }),

  // Contact
  textPara('{candidate_phone} | {candidate_email}', {
    sz: 20,
    color: COLOR_MUTED,
  }, { jc: 'left', after: 40, before: 0, line: 276 }),
  textPara('{candidate_home_address}, {candidate_city}, {candidate_state}', {
    sz: 20,
    color: COLOR_MUTED,
  }, { jc: 'left', after: 360, before: 0, line: 276 }),

  // PROFESSIONAL SNAPSHOT
  textPara('PROFESSIONAL SNAPSHOT', {
    sz: 24,
    bold: true,
    caps: true,
  }, { sectionRule: true, before: 280, after: 120, line: 276 }),
  textPara('{#snapshot_lines}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
  textPara('{snapshot_line}', { sz: 21 }, { bullet: true, after: 60, before: 0, line: 276 }),
  textPara('{/snapshot_lines}', { sz: 21 }, { after: 0, before: 0, line: 240 }),

  // LICENSES & CERTIFICATIONS
  textPara('LICENSES &amp; CERTIFICATIONS', {
    sz: 24,
    bold: true,
    caps: true,
  }, { sectionRule: true, before: 280, after: 120, line: 276 }),
  textPara('{#licenses_list}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
  textPara('{rn_license_state_and_expiry}', { sz: 21 }, { bullet: true, after: 60, before: 0, line: 276 }),
  textPara('{/licenses_list}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
  textPara('{#certifications_list}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
  textPara('{certification_name} | {certification_expiration_date}', { sz: 21 }, {
    bullet: true,
    after: 60,
    before: 0,
    line: 276,
  }),
  textPara('{/certifications_list}', { sz: 21 }, { after: 0, before: 0, line: 240 }),

  // EDUCATION — degree | year row + italic school
  textPara('EDUCATION', {
    sz: 24,
    bold: true,
    caps: true,
  }, { sectionRule: true, before: 280, after: 120, line: 276 }),
  textPara('{#education}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
  para(
    run('{education_degree}', { sz: 22, bold: true })
    + tabRun({ sz: 22, bold: true })
    + run('{education_graduation_year}', { sz: 22, bold: true }),
    {
      rightTab: true,
      after: 40,
      before: 120,
      line: 276,
      runStyle: { sz: 22, bold: true },
    },
  ),
  textPara('{education_school_name}', {
    sz: 21,
    italic: true,
    color: COLOR_MUTED,
  }, { after: 220, before: 0, line: 276 }),
  textPara('{/education}', { sz: 21 }, { after: 0, before: 0, line: 240 }),

  // PROFESSIONAL EXPERIENCE — title|dates, italic hospital, metrics
  textPara('PROFESSIONAL EXPERIENCE', {
    sz: 24,
    bold: true,
    caps: true,
  }, { sectionRule: true, before: 280, after: 120, line: 276 }),
  textPara('{#professional_experiences}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
  para(
    run('RN - {experience_unit_specialty}', { sz: 22, bold: true })
    + tabRun({ sz: 22, color: COLOR_MUTED })
    + run('{experience_employment_dates}', { sz: 22, color: COLOR_MUTED }),
    {
      rightTab: true,
      after: 40,
      before: 0,
      line: 276,
      runStyle: { sz: 22, bold: true },
    },
  ),
  // With metrics: hospital (tight) then metrics line carries the inter-job gap.
  textPara('{#experience_metrics_rows}', { sz: 20 }, { after: 0, before: 0, line: 240 }),
  textPara('{experience_hospital_name} | {experience_facility_location}', {
    sz: 21,
    italic: true,
    color: COLOR_MUTED,
  }, { after: 60, before: 0, line: 276 }),
  textPara('{experience_metrics_line}', {
    sz: 20,
    color: COLOR_BODY,
  }, { after: 120, before: 0, line: 276 }),
  textPara('{/experience_metrics_rows}', { sz: 20 }, { after: 0, before: 0, line: 240 }),
  // No metrics: hospital line is the last line, so it carries the inter-job gap.
  textPara('{^experience_metrics_rows}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
  textPara('{experience_hospital_name} | {experience_facility_location}', {
    sz: 21,
    italic: true,
    color: COLOR_MUTED,
  }, { after: 120, before: 0, line: 276 }),
  textPara('{/experience_metrics_rows}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
  textPara('{/professional_experiences}', { sz: 21 }, { after: 0, before: 0, line: 240 }),
]

const zip = new PizZip(readFileSync(TEMPLATE))
let documentXml = zip.file('word/document.xml').asText()
const open = documentXml.match(/^[\s\S]*?<w:body>/)?.[0]
const sectPr = documentXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0]
if (!open || !sectPr) {
  throw new Error('Could not parse document.xml shell')
}

documentXml = `${open}${bodyParas.join('')}${sectPr}</w:body></w:document>`
zip.file('word/document.xml', documentXml)

// Document defaults: Inter 10.5pt, body color, line 1.4
let stylesXml = zip.file('word/styles.xml').asText()
const newDefaults = `<w:docDefaults><w:rPrDefault><w:rPr>${rFonts()}<w:color w:val="${COLOR_BODY}"/><w:sz w:val="21"/><w:szCs w:val="21"/><w:lang w:val="en"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="60" w:line="336" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`

if (stylesXml.includes('<w:docDefaults>')) {
  stylesXml = stylesXml.replace(/<w:docDefaults>[\s\S]*?<\/w:docDefaults>/, newDefaults)
} else {
  stylesXml = stylesXml.replace(/(<w:styles[^>]*>)/, `$1${newDefaults}`)
}
zip.file('word/styles.xml', stylesXml)

writeFileSync(TEMPLATE, zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }))
console.log('✓ template.docx restyled (Inter + resume visual brief)')
