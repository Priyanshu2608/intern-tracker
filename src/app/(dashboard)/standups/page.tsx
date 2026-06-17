import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StandupClient } from './standup-client'

export const metadata = {
  title: 'Daily Standups | Turn2Law Intern Tracker',
  description: 'Log daily updates and view updates from your squad members.',
}

export default async function StandupsPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch current profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, teams(name)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  const myTeamId = profile.team_id
  const isIntern = profile.role === 'intern'
  const isLead = profile.role === 'lead'
  const isAdmin = profile.role === 'admin'

  // 3. Fetch all active members in the same squad (or all users if admin)
  let membersQuery = supabase
    .from('profiles')
    .select('*, teams(name)')
    .eq('status', 'active')

  if (!isAdmin && myTeamId) {
    membersQuery = membersQuery.eq('team_id', myTeamId)
  }

  const { data: teamMembers } = await membersQuery.order('name', { ascending: true })

  // 4. Fetch all standup entries for today (scoped to squad or all)
  let standupsQuery = supabase
    .from('standups')
    .select('*, profiles(id, name, role, team_id, teams(name))')
    .eq('date', todayStr)

  const { data: todayStandups, error: standupsError } = await standupsQuery

  if (standupsError) {
    console.error('Error fetching today\'s standups:', standupsError)
  }

  // Find if current user submitted today's standup
  const mySubmission = todayStandups?.find((s) => s.user_id === user.id) || null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0B1F3A]">Daily Standup</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Share your progress, outline tasks for today, and highlight any workflow blockers.
        </p>
      </div>

      <StandupClient
        currentUser={profile}
        mySubmission={mySubmission}
        todayStandups={todayStandups || []}
        teamMembers={teamMembers || []}
      />
    </div>
  )
}
