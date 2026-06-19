import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KanbanBoard } from './kanban-board'

export const metadata = {
  title: 'Task Kanban Board | Turn2Law Intern Tracker',
  description: 'Manage, assign, and track intern tasks and history logs.',
}

export default async function TasksPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Query current user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/login')
  }

  const myTeamId = profile.team_id
  const isIntern = profile.role === 'intern'
  const isLead = profile.role === 'lead'
  const isAdmin = profile.role === 'admin'

  // 3. Fetch Tasks (role-scoped)
  let tasksQuery = supabase
    .from('tasks')
    .select('*, assignee:profiles!tasks_assignee_id_fkey(id, name, email, role)')

  if (isIntern) {
    // Interns only see tasks allotted to them
    tasksQuery = tasksQuery.eq('assignee_id', user.id)
  } else if (isLead) {
    // Leads manage tasks for their own squad
    if (myTeamId) {
      tasksQuery = tasksQuery.eq('team_id', myTeamId)
    } else {
      // If a lead is not assigned to a team, show only their own tasks
      tasksQuery = tasksQuery.eq('assignee_id', user.id)
    }
  }
  // Admins see all tasks

  const { data: tasks, error: tasksError } = await tasksQuery.order('created_at', { ascending: false })

  if (tasksError) {
    console.error('Error fetching tasks:', tasksError)
  }

  // 4. Fetch list of eligible assignees (active users)
  // Admin is never assignable (they are managers/observers only).
  // Leads can only assign to interns in their own team.
  // Admins (when creating tasks) can assign to any lead or intern.
  let assigneesQuery = supabase
    .from('profiles')
    .select('id, name, role, team_id')
    .eq('status', 'active')
    .neq('role', 'admin') // Never allow assigning to admin

  if (isLead && myTeamId) {
    // Leads can only assign to interns on their team
    assigneesQuery = assigneesQuery.eq('team_id', myTeamId).eq('role', 'intern')
  }

  const { data: assignees } = await assigneesQuery.order('name', { ascending: true })

  // 5. Fetch all teams (for admins or squad references)
  const { data: teams } = await supabase
    .from('teams')
    .select('*')
    .order('name', { ascending: true })

  return (
    <div className="space-y-6 flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">
            {isAdmin ? 'Task Board — All Squads' : 'Task Board'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isAdmin
              ? 'Overview of all squad workloads and task progress across teams.'
              : 'Manage squad workloads, transition status via drag-and-drop, and monitor modification history.'}
          </p>
        </div>
      </div>

      <KanbanBoard
        initialTasks={tasks || []}
        assignees={assignees || []}
        teams={teams || []}
        currentUser={profile}
      />
    </div>
  )
}
