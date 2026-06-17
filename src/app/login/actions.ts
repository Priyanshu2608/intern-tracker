'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function login(state: any, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function resetPassword(state: any, formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'All fields are required.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  const supabase = await createClient()

  // 1. Get current logged in user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'User session not found. Please log in again.' }
  }

  // 2. Update Auth password and clear must_reset_password in metadata
  const { error: authError } = await supabase.auth.updateUser({
    password: password,
    data: {
      must_reset_password: false
    }
  })

  if (authError) {
    return { error: authError.message }
  }

  // 3. Update public.profiles table
  const { error: dbError } = await supabase
    .from('profiles')
    .update({ 
      must_reset_password: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', user.id)

  if (dbError) {
    console.error('Error updating DB profile password flag:', dbError)
    // Even if DB fails, auth has changed. But we want to fail or report
    return { error: 'Failed to update database profile status: ' + dbError.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}
