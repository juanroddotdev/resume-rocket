import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

interface DocxCandidate {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  phone?: string | null
  license_number?: string | null
  emr_system?: string | null
  employers?: Array<{
    name: string
    beds?: number | null
    trauma_level?: string | null
    role?: string
  }> | null
  credentials?: Record<string, boolean> | null
}

export async function buildResumeDocx(candidate: DocxCandidate): Promise<Buffer> {
  const templatePath = join(process.cwd(), 'server/assets/template.docx')
  const content = await readFile(templatePath)
  const zip = new PizZip(content)

  const certifications = candidate.credentials
    ? Object.entries(candidate.credentials)
        .filter(([, v]) => v)
        .map(([k]) => k)
    : []

  const employers = (candidate.employers || []).map(e => ({
    name: e.name,
    beds: e.beds != null ? String(e.beds) : '',
    trauma_level: e.trauma_level || e.traumaLevel || '',
    role: e.role || '',
  }))

  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
  })

  doc.render({
    first_name: candidate.first_name || '',
    last_name: candidate.last_name || '',
    email: candidate.email || '',
    phone: candidate.phone || '',
    license_number: candidate.license_number || '',
    emr_system: candidate.emr_system || '',
    employers,
    certifications,
  })

  return Buffer.from(doc.getZip().generate({ type: 'nodebuffer' }))
}
