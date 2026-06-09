import {
  normalizeCredentials,
  normalizeEducation,
  normalizeEmployers,
} from '~/server/utils/normalizeCandidate'

const DRAFT_SELECT = [
  'id',
  'status',
  'updated_at',
  'first_name',
  'last_name',
  'email',
  'phone',
  'license_number',
  'license_state',
  'specialties',
  'credentials',
  'employers',
  'education',
  'years_nursing_experience',
  'compact_license_status',
  'average_patient_ratios',
  'specialized_medical_equipment',
  'emr_system',
].join(', ')

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Candidate id required' })
  }

  await requireInviteForCandidate(event, id)
  const supabase = useSupabaseAdmin()

  const { data, error } = await supabase
    .from('candidates')
    .select(DRAFT_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  if (!data) {
    throw createError({ statusCode: 404, statusMessage: 'Candidate not found' })
  }

  if (data.status === 'submitted' || data.status === 'confirmed') {
    return {
      id: data.id,
      status: data.status,
    }
  }

  return {
    id: data.id,
    status: data.status,
    updated_at: data.updated_at,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    phone: data.phone,
    license_number: data.license_number,
    license_state: data.license_state,
    emr_system: data.emr_system,
    specialties: data.specialties,
    credentials: data.credentials ? normalizeCredentials(data.credentials) : null,
    employers: data.employers ? normalizeEmployers(data.employers) : null,
    education: data.education ? normalizeEducation(data.education) : null,
    years_nursing_experience: data.years_nursing_experience,
    compact_license_status: data.compact_license_status,
    average_patient_ratios: data.average_patient_ratios,
    specialized_medical_equipment: data.specialized_medical_equipment,
  }
})
