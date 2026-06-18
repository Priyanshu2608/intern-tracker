import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  Award,
  CalendarCheck,
  CheckCircle,
  Clock,
  Sparkles,
  Inbox,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Performance & Analytics | Turn2Law Intern Tracker',
  description: 'Intern task completion rates, standup streaks, and squad contributions.',
}

function calculateStandupStreak(userStandups: { date: string }[]): number {
  if (!userStandups || userStandups.length === 0) return 0

  // 1. Get unique sorted dates in descending order (e.g. ['2026-06-17', '2026-06-16', ...])
  const uniqueDates = Array.from(new Set(userStandups.map((s) => s.date))).sort().reverse()

  // Helper to parse date string YYYY-MM-DD to a local midnight Date object
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const dateObjects = uniqueDates.map(parseLocalDate)

  // 2. Get current date and yesterday's date at midnight local time
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // 3. Find the last standup date
  const lastStandup = dateObjects[0]

  // If the last standup is older than yesterday, the streak is 0
  if (lastStandup < yesterday) {
    return 0
  }

  // 4. Count consecutive days backwards
  let streak = 1
  for (let i = 0; i < dateObjects.length - 1; i++) {
    const current = dateObjects[i]
    const next = dateObjects[i + 1]
    const diffTime = current.getTime() - next.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      streak++
    } else if (diffDays > 1) {
      // Streak broken
      break
    }
  }

  return streak
}

export default async function PerformancePage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch current profile
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

  // 3. Fetch all active profiles (Leads see their squad, Admin/Intern see all for transparency or restricted to squad. Let's show squad-wide for Leads, and all for Admin. For Intern, they can view their squad as well to compare!)
  let profilesQuery = supabase
    .from('profiles')
    .select('id, name, role, team_id, teams(name)')
    .eq('status', 'active')

  if (!isAdmin && myTeamId) {
    profilesQuery = profilesQuery.eq('team_id', myTeamId)
  }
  const { data: dbProfiles } = await profilesQuery.order('name', { ascending: true })
  
  const profiles = dbProfiles?.map((p: any) => {
    const teamObj = Array.isArray(p.teams) ? p.teams[0] : p.teams
    return {
      ...p,
      teams: teamObj ? { name: teamObj.name } : null
    }
  }) || []
  
  const interns = profiles.filter((p) => p.role === 'intern')

  // 4. Fetch all tasks (scoped to team or all)
  let tasksQuery = supabase
    .from('tasks')
    .select('id, title, status, due_date, assignee_id, updated_at, team_id')

  if (!isAdmin && myTeamId) {
    tasksQuery = tasksQuery.eq('team_id', myTeamId)
  }

  const { data: tasks } = await tasksQuery
  const tasksList = (tasks || []) as any[]

  // 5. Fetch standups (scoped to team or all)
  let standupsQuery = supabase
    .from('standups')
    .select('id, user_id, date')

  const { data: standups } = await standupsQuery
  const standupsList = (standups || []) as any[]

  // 6. Fetch Contribution Feed (Recent 10 completed or updated tasks)
  let historyQuery = supabase
    .from('task_activity')
    .select('*, tasks(title, team_id), profiles(name, role)')
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: contributions } = await historyQuery

  // Filter contributions to squad if not Admin
  const filteredContributions = contributions?.filter((c: any) => {
    if (isAdmin) return true
    return c.tasks?.team_id === myTeamId
  }) || []

  // 7. Calculate stats per intern
  const internMetrics = interns.map((intern) => {
    const internTasks = tasksList.filter((t: any) => t.assignee_id === intern.id)
    const completedTasksCount = internTasks.filter((t: any) => t.status === 'done').length
    
    // On-Time completion: completed tasks where updated_at <= due_date (or due_date is null/not set)
    const onTimeTasks = internTasks.filter((t: any) => {
      if (t.status !== 'done') return false
      if (!t.due_date) return true // No due date = always on time
      const completedDate = new Date(t.updated_at)
      const dueDate = new Date(t.due_date + 'T23:59:59')
      return completedDate <= dueDate
    }).length

    const onTimeRate = completedTasksCount > 0 
      ? Math.round((onTimeTasks / completedTasksCount) * 100) 
      : 100 // default to 100% if no tasks completed yet

    // Standups count and streak
    const userStandups = standupsList.filter((s: any) => s.user_id === intern.id)
    const standupCount = userStandups.length
    const standupStreak = calculateStandupStreak(userStandups)

    return {
      profile: intern,
      totalTasks: internTasks.length,
      completedTasks: completedTasksCount,
      onTimeRate,
      standupCount,
      standupStreak
    }
  })

  // Global Org / Squad Metrics
  const totalTasksCount = tasksList.length
  const completedTasksCount = tasksList.filter((t: any) => t.status === 'done').length
  const globalCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#0B1F3A]">Performance & Analytics</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isAdmin && 'Org-wide overview of intern productivity, task deadlines, and logs.'}
          {!isAdmin && `Squad metrics and recent activity feed for ${profile.teams?.name || 'your team'}.`}
        </p>
      </div>

      {/* 2. Global scorecards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Squad Completion Average
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-[#C9952A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0B1F3A]">{globalCompletionRate}%</div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              {completedTasksCount} of {totalTasksCount} tasks completed
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total Standups Logged
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0B1F3A]">
              {standups?.length || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Accumulated async contributions
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Active Interns Tracked
            </CardTitle>
            <Award className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0B1F3A]">
              {interns.length}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Participating squad members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Bottom Columns: Scorecards leaderboard & contribution feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Intern Directory / Leaderboard (Takes 2 cols) */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#0B1F3A]">Intern Performance Directory</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Task delivery status, deadline compliance, and check-in volume.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {internMetrics.length > 0 ? (
              <>
                {/* Desktop View Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                        <th className="py-3.5 px-6">Name</th>
                        <th className="py-3.5 px-6 text-center">Tasks Completed</th>
                        <th className="py-3.5 px-6">On-Time rate</th>
                        <th className="py-3.5 px-6 text-center">Standup Check-ins</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {internMetrics.map(({ profile: intern, totalTasks, completedTasks, onTimeRate, standupCount, standupStreak }) => (
                        <tr key={intern.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-6 flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 flex items-center justify-center font-bold text-xs text-[#0B1F3A] uppercase shrink-0">
                              {intern.name.substring(0, 2)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-slate-800 truncate">{intern.name}</span>
                              <span className="text-[10px] text-slate-400 font-semibold truncate">
                                {intern.teams?.name || 'Unassigned Squad'}
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6 text-center font-bold text-slate-700">
                            {completedTasks} / {totalTasks}
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0">
                                <div
                                  className={cn(
                                    "h-1.5 rounded-full transition-all",
                                    onTimeRate >= 80 ? "bg-green-500" : onTimeRate >= 50 ? "bg-amber-500" : "bg-red-500"
                                  )}
                                  style={{ width: `${onTimeRate}%` }}
                                />
                              </div>
                              <span className={cn(
                                "font-bold shrink-0",
                                onTimeRate >= 80 ? "text-green-600" : onTimeRate >= 50 ? "text-amber-600" : "text-red-500"
                              )}>
                                {onTimeRate}%
                              </span>
                            </div>
                          </td>

                          <td className="py-4 px-6">
                            <div className="flex flex-col items-center">
                              <span className="font-bold text-slate-700">{standupCount} days</span>
                              {standupStreak > 0 ? (
                                <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5 mt-1 font-bold inline-flex items-center gap-0.5 animate-pulse">
                                  🔥 {standupStreak} day streak
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 mt-1 font-medium italic">No active streak</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="block md:hidden divide-y divide-slate-100 select-none">
                  {internMetrics.map(({ profile: intern, totalTasks, completedTasks, onTimeRate, standupCount, standupStreak }) => (
                    <div key={intern.id} className="p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors">
                      {/* Profile row */}
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 flex items-center justify-center font-bold text-xs text-[#0B1F3A] uppercase shrink-0">
                          {intern.name.substring(0, 2)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-xs text-slate-800 truncate">{intern.name}</span>
                          <span className="text-[9px] text-slate-400 font-semibold truncate">
                            {intern.teams?.name || 'Unassigned Squad'}
                          </span>
                        </div>
                      </div>

                      {/* Stat grid */}
                      <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                        <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg flex flex-col justify-center">
                          <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">Tasks Done</span>
                          <span className="font-bold text-slate-750 text-xs">{completedTasks} / {totalTasks}</span>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg flex flex-col justify-center">
                          <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">On-Time</span>
                          <span className={cn(
                            "font-extrabold text-xs",
                            onTimeRate >= 80 ? "text-green-600" : onTimeRate >= 50 ? "text-amber-600" : "text-red-500"
                          )}>
                            {onTimeRate}%
                          </span>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 p-2 rounded-lg flex flex-col justify-center items-center">
                          <span className="text-slate-400 font-bold uppercase text-[8px] tracking-wider mb-0.5">Check-ins</span>
                          <span className="font-bold text-slate-750 text-xs">{standupCount} days</span>
                        </div>
                      </div>

                      {/* Streak info */}
                      {standupStreak > 0 && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-lg py-1.5 px-2.5 text-[9px] font-bold text-amber-700 flex items-center justify-center gap-1">
                          🔥 Active {standupStreak} day standup streak!
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400 font-medium select-none">
                No active interns registered in this view.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Contribution Feed (Takes 1 col) */}
        <Card className="border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
                <Activity className="h-4 w-4 text-[#C9952A]" />
                Contribution Feed
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Real-time activity log from your team
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {filteredContributions.length > 0 ? (
                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                  {filteredContributions.map((item: any) => {
                    const ago = new Date(item.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div key={item.id} className="p-3.5 flex gap-2.5 hover:bg-slate-50/50 transition-colors">
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border",
                          item.change_type === 'creation' && "bg-green-50 border-green-200 text-green-600",
                          item.change_type === 'status_change' && "bg-amber-50 border-amber-200 text-amber-600",
                          item.change_type === 'edit' && "bg-blue-50 border-blue-200 text-blue-600"
                        )}>
                          <Sparkles className="h-3.5 w-3.5" />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] font-bold text-slate-800 leading-normal">
                            {item.profiles?.name}
                          </span>
                          <span className="text-[10px] text-slate-500 leading-snug mt-0.5">
                            {item.comment}
                          </span>
                          {item.tasks && (
                            <span className="text-[9px] text-[#C9952A] font-bold mt-1 uppercase">
                              Task: {item.tasks.title}
                            </span>
                          )}
                          <span className="text-[8px] text-slate-400 font-semibold mt-1">
                            {ago}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-12 px-4 text-center">
                  <Inbox className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 select-none">No recent activities recorded.</p>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  )
}
