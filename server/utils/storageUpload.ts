import { randomUUID } from 'node:crypto'

export async function uploadResumeFile(
  candidateId: string,
  buffer: Buffer,
  filename: string,
  mime: string,
) {
  const supabase = useSupabaseAdmin()
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${candidateId}/${randomUUID()}-${safeName}`

  const { error } = await supabase.storage.from('resumes').upload(path, buffer, {
    contentType: mime,
    upsert: true,
  })

  if (error) throw error
  return path
}
