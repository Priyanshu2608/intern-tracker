import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PeopleDirectory } from './people-directory'

export const metadata = {
  title: 'People & Teams Directory | Turn2Law Intern Tracker',
  description: 'Manage Turn2Law interns, supervisors, squads, and credentials.',
}

export default async function PeoplePage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Get current user's profile
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role, team_id, teams(name)')
    .eq('id', user.id)
    .single()

  if (!currentProfile) {
    redirect('/login')
  }

  const profileAny = currentProfile as any
  const isAdmin = profileAny.role === 'admin'
  const myTeamId = profileAny.team_id
  const myTeamName = Array.isArray(profileAny.teams)
    ? profileAny.teams[0]?.name
    : profileAny.teams?.name

  // 3. Fetch profiles — admins see everyone; leads/interns see only their squad
  let profilesQuery = supabase
    .from('profiles')
    .select('*, teams(id, name)')
    .order('name', { ascending: true })

  if (!isAdmin) {
    if (myTeamId) {
      profilesQuery = profilesQuery.eq('team_id', myTeamId).neq('role', 'admin')
    } else {
      profilesQuery = profilesQuery.eq('id', user.id)
    }
  }

  // 4. Fetch teams — admins see all; leads/interns see only their own squad
  let teamsQuery = supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true })

  if (!isAdmin) {
    if (myTeamId) {
      teamsQuery = teamsQuery.eq('id', myTeamId)
    } else {
      teamsQuery = teamsQuery.eq('id', '00000000-0000-0000-0000-000000000000')
    }
  }

  // Run queries concurrently to resolve waterfalls in production
  const [
    { data: profiles, error: profilesError },
    { data: teams, error: teamsError }
  ] = await Promise.all([
    profilesQuery,
    teamsQuery
  ])

  if (profilesError) {
    console.error('Error loading profiles:', profilesError)
  }

  if (teamsError) {
    console.error('Error loading teams:', teamsError)
  }

  const pageDescription = isAdmin
    ? 'Directory of all interns, leads, administrators, and squads.'
    : myTeamName
      ? `Members of ${myTeamName} — interns and squad leads in your team.`
      : 'Your profile — no squad assigned.'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">People & Teams</h1>
          <p className="text-slate-500 text-sm mt-1">
            {pageDescription}
          </p>
        </div>
      </div>

      <PeopleDirectory
        initialProfiles={profiles || []}
        teams={teams || []}
        isAdmin={isAdmin}
      />
    </div>
  )
}
