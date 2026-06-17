import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MeetingsClient } from './meetings-client'

export const metadata = {
  title: 'Meetings & Attendance | Turn2Law Intern Tracker',
  description: 'Schedule squad meetings and log attendee attendance.',
}

export default async function MeetingsPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, teams(name)')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const myTeamId = profile.team_id
  const isIntern = profile.role === 'intern'
  const isLead = profile.role === 'lead'
  const isAdmin = profile.role === 'admin'

  // 3. Fetch Meetings (role-scoped)
  let meetingsQuery = supabase
    .from('meetings')
    .select('*, teams(name)')

  if (!isAdmin) {
    if (myTeamId) {
      meetingsQuery = meetingsQuery.or(`team_id.eq.${myTeamId},team_id.is.null`)
    } else {
      meetingsQuery = meetingsQuery.is('team_id', null)
    }
  }

  const { data: meetings, error: meetingsError } = await meetingsQuery.order('start_time', { ascending: false })

  if (meetingsError) {
    console.error('Error fetching meetings:', meetingsError)
  }

  // 4. Fetch Attendance records for these meetings
  const { data: attendance } = await supabase
    .from('meeting_attendance')
    .select('*, profiles(name, role, team_id)')

  // 5. Fetch team members (who are eligible to attend)
  // Leads track their team members. Admins track all. Interns see their own team.
  let membersQuery = supabase
    .from('profiles')
    .select('id, name, role, team_id, teams(name)')
    .eq('status', 'active')

  if (!isAdmin && myTeamId) {
    membersQuery = membersQuery.eq('team_id', myTeamId)
  }

  const { data: activeMembers } = await membersQuery.order('name', { ascending: true })

  // Format activeMembers to prevent any PostgREST array type mismatch on the teams relation
  const formattedMembers = activeMembers?.map((member: any) => {
    const teamObj = Array.isArray(member.teams) ? member.teams[0] : member.teams
    return {
      id: member.id,
      name: member.name,
      role: member.role,
      team_id: member.team_id,
      teams: teamObj ? { name: teamObj.name } : null
    }
  }) || []

  // 6. Fetch Teams for scheduler
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">Meetings & Attendance</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Schedule new review sessions and track intern participation history.
          </p>
        </div>
      </div>

      <MeetingsClient
        currentUser={profile}
        meetings={meetings || []}
        attendance={attendance || []}
        members={formattedMembers}
        teams={teams || []}
      />
    </div>
  )
}
