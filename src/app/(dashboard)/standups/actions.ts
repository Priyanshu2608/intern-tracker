'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitStandup(state: any, formData: FormData) {
  const supabase = await createClient()

  // 1. Get current auth user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Unauthorized: Session not found.' }
  }

  // 2. Fetch user profile to verify status
  const { data: profile } = await supabase
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (profile?.status !== 'active') {
    return { error: 'Unauthorized: Your account is inactive.' }
  }

  const didYesterday = formData.get('didYesterday') as string
  const doingToday = formData.get('doingToday') as string
  const blockers = formData.get('blockers') as string

  if (!didYesterday || !doingToday) {
    return { error: 'All fields (Did Yesterday, Doing Today) are required.' }
  }

  // Use local date format YYYY-MM-DD
  const localDateStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD format

  // 3. Insert standup (handled in SQL to prevent duplicates via UNIQUE constraint on (user_id, date))
  const { error } = await supabase
    .from('standups')
    .insert({
      user_id: user.id,
      date: localDateStr,
      did_yesterday: didYesterday,
      doing_today: doingToday,
      blockers: blockers || null
    })

  if (error) {
    if (error.code === '23505') {
      return { error: 'You have already submitted a standup for today.' }
    }
    return { error: error.message }
  }

  revalidatePath('/standups')
  revalidatePath('/')
  return { success: true }
}
