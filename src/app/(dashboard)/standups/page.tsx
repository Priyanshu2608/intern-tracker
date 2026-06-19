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

  let standupsQuery = supabase
    .from('standups')
    .select('*')
    .eq('date', todayStr)

  // Run queries concurrently to resolve waterfalls in production
  const [
    { data: teamMembers },
    { data: todayStandups, error: standupsError },
    { data: allProfiles }
  ] = await Promise.all([
    membersQuery.order('name', { ascending: true }),
    standupsQuery,
    supabase.from('profiles').select('*, teams(name)')
  ])

  if (standupsError) {
    console.error('Error fetching today\'s standups:', standupsError)
  }

  // Stitch profiles onto standups
  const stitchedStandups = (todayStandups || []).map((standup: any) => {
    const p = allProfiles?.find((prof: any) => prof.id === standup.user_id) || null
    return {
      ...standup,
      profiles: p
    }
  })

  // Filter standups to squad members only if current user is not admin
  let displayStandups = stitchedStandups
  if (!isAdmin && myTeamId) {
    displayStandups = stitchedStandups.filter((s: any) => s.profiles?.team_id === myTeamId)
  }

  // Find if current user submitted today's standup
  const mySubmission = displayStandups.find((s: any) => s.user_id === user.id) || null

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
        todayStandups={displayStandups}
        teamMembers={teamMembers || []}
      />
    </div>
  )
}
