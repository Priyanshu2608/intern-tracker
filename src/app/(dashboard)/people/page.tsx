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

  // 2. Get current user's profile role
  const { data: currentProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!currentProfile) {
    redirect('/login')
  }

  const isAdmin = currentProfile.role === 'admin'

  // 3. Fetch all profiles with their associated team names
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*, teams(id, name)')
    .order('name', { ascending: true })

  if (profilesError) {
    console.error('Error loading profiles:', profilesError)
  }

  // 4. Fetch all teams for user assignment
  const { data: teams, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true })

  if (teamsError) {
    console.error('Error loading teams:', teamsError)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">People & Teams</h1>
          <p className="text-slate-500 text-sm mt-1">
            Directory of all interns, leads, administrators, and squads.
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
