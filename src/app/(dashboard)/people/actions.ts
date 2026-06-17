'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// Helper: Ensure the caller is an Admin in public.profiles
async function checkIsAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return profile?.role === 'admin'
}

export async function createUser(state: any, formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Unauthorized: Only administrators can create users.' }
  }

  const name = formData.get('name') as string
  const email = formData.get('email') as string
  const role = formData.get('role') as string
  const teamId = formData.get('teamId') as string
  const tempPassword = formData.get('tempPassword') as string

  if (!name || !email || !role || !tempPassword) {
    return { error: 'Name, Email, Role, and Temporary Password are required.' }
  }

  const adminClient = createAdminClient()

  // 1. Create user in Supabase Auth using admin API
  const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      name,
      role,
      team_id: teamId || null,
      must_reset_password: true
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  const newUserId = authData.user?.id

  // 2. The trigger `on_auth_user_created` should automatically create the public.profiles record.
  // Just in case, let's verify if the profile exists. If not, we insert it.
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', newUserId)
    .maybeSingle()

  if (!profile) {
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: newUserId,
        email,
        name,
        role,
        team_id: teamId || null,
        status: 'active',
        must_reset_password: true
      })
    
    if (profileError) {
      console.error('Error inserting profile fallback:', profileError)
      return { error: 'User created in auth, but profile creation failed: ' + profileError.message }
    }
  }

  revalidatePath('/people')
  revalidatePath('/')
  return { success: true }
}

export async function editUser(state: any, formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Unauthorized.' }
  }

  const userId = formData.get('userId') as string
  const name = formData.get('name') as string
  const role = formData.get('role') as string
  const teamId = formData.get('teamId') as string

  if (!userId || !name || !role) {
    return { error: 'User ID, Name, and Role are required.' }
  }

  const supabase = await createClient()
  const adminClient = createAdminClient()

  // 1. Update public.profiles
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      name,
      role,
      team_id: teamId || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (profileError) {
    return { error: profileError.message }
  }

  // 2. Update user metadata in Supabase Auth
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      name,
      role,
      team_id: teamId || null
    }
  })

  if (authError) {
    console.error('Auth metadata sync error:', authError)
  }

  revalidatePath('/people')
  revalidatePath('/')
  return { success: true }
}

export async function toggleUserStatus(userId: string, currentStatus: string) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    throw new Error('Unauthorized.')
  }

  const nextStatus = currentStatus === 'active' ? 'inactive' : 'active'
  const supabase = await createClient()

  // Update profiles status
  const { error } = await supabase
    .from('profiles')
    .update({ status: nextStatus })
    .eq('id', userId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/people')
  revalidatePath('/')
}

export async function adminResetPassword(state: any, formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Unauthorized.' }
  }

  const userId = formData.get('userId') as string
  const newPassword = formData.get('newPassword') as string

  if (!userId || !newPassword) {
    return { error: 'User ID and Password are required.' }
  }

  const adminClient = createAdminClient()
  const supabase = await createClient()

  // 1. Reset password in Auth and set must_reset_password: true
  const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
    user_metadata: {
      must_reset_password: true
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  // 2. Set must_reset_password: true in profiles
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ 
      must_reset_password: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)

  if (dbError) {
    console.error('Error updating DB password flag:', dbError)
  }

  revalidatePath('/people')
  return { success: true }
}

export async function createTeam(state: any, formData: FormData) {
  const isAdmin = await checkIsAdmin()
  if (!isAdmin) {
    return { error: 'Unauthorized: Only administrators can create teams.' }
  }

  const name = formData.get('name') as string
  if (!name || name.trim() === '') {
    return { error: 'Team name is required.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('teams')
    .insert({ name })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/people')
  return { success: true }
}
