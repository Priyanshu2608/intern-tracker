'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper: Verify session & check role
async function checkAuthManager() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'admin' || profile?.role === 'lead') {
    return profile
  }
  return null
}

export async function scheduleMeeting(state: any, formData: FormData) {
  const profile = await checkAuthManager()
  if (!profile) {
    return { error: 'Unauthorized: Only leads and admins can schedule meetings.' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const startTime = formData.get('startTime') as string
  const endTime = formData.get('endTime') as string
  const teamId = formData.get('teamId') as string // null means All-Hands

  if (!title || !startTime || !endTime) {
    return { error: 'Title, Start Time, and End Time are required.' }
  }

  const supabase = await createClient()

  // Verify dates
  if (new Date(startTime) >= new Date(endTime)) {
    return { error: 'End time must be after start time.' }
  }

  const { error } = await supabase
    .from('meetings')
    .insert({
      title,
      description: description || null,
      start_time: startTime,
      end_time: endTime,
      team_id: teamId || null,
      created_by: profile.id
    })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/meetings')
  revalidatePath('/')
  return { success: true }
}

export async function markAttendance(meetingId: string, userId: string, status: 'present' | 'absent' | 'excused') {
  const profile = await checkAuthManager()
  if (!profile) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  // Upsert attendance record
  const { error } = await supabase
    .from('meeting_attendance')
    .upsert(
      {
        meeting_id: meetingId,
        user_id: userId,
        status,
        updated_at: new Date().toISOString()
      },
      { onConflict: 'meeting_id,user_id' }
    )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/meetings')
}
