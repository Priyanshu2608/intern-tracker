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
  Activity,
  Flame,
  Trophy,
  BarChart3,
  Target,
  ListTodo,
  CheckSquare,
  AlertCircle,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

function calculateStandupStreak(userStandups: { date: string }[]): number {
  if (!userStandups || userStandups.length === 0) return 0

  const uniqueDates = Array.from(new Set(userStandups.map((s) => s.date))).sort().reverse()

  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number)
    return new Date(year, month - 1, day)
  }

  const dateObjects = uniqueDates.map(parseLocalDate)

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const lastStandup = dateObjects[0]

  if (lastStandup < yesterday) {
    return 0
  }

  let streak = 1
  for (let i = 0; i < dateObjects.length - 1; i++) {
    const current = dateObjects[i]
    const next = dateObjects[i + 1]
    const diffTime = current.getTime() - next.getTime()
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      streak++
    } else if (diffDays > 1) {
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

  // 3. Construct queries
  let profilesQuery = supabase
    .from('profiles')
    .select('id, name, role, team_id, teams(name)')
    .eq('status', 'active')

  if (!isAdmin && myTeamId) {
    profilesQuery = profilesQuery.eq('team_id', myTeamId)
  }

  // 4. Construct tasks query
  let tasksQuery = supabase
    .from('tasks')
    .select('id, title, status, due_date, assignee_id, updated_at, team_id, priority')

  if (!isAdmin && myTeamId) {
    tasksQuery = tasksQuery.eq('team_id', myTeamId)
  }

  // 5. Construct standups query
  let standupsQuery = supabase
    .from('standups')
    .select('id, user_id, date')

  // 6. Construct history query
  let historyQuery = supabase
    .from('task_activity')
    .select('*, tasks(title, team_id), profiles(name, role)')
    .order('created_at', { ascending: false })
    .limit(10)

  // Fetch concurrently using Promise.all to prevent sequential blocking waterfalls
  const [
    { data: dbProfiles },
    { data: tasks },
    { data: standups },
    { data: contributions }
  ] = await Promise.all([
    profilesQuery.order('name', { ascending: true }),
    tasksQuery,
    standupsQuery,
    historyQuery
  ])
  
  const profiles = dbProfiles?.map((p: any) => {
    const teamObj = Array.isArray(p.teams) ? p.teams[0] : p.teams
    return {
      ...p,
      teams: teamObj ? { name: teamObj.name } : null
    }
  }) || []
  
  const interns = profiles.filter((p: any) => p.role === 'intern')
  const tasksList = (tasks || []) as any[]
  const standupsList = (standups || []) as any[]

  // Filter contributions: Admin sees all; Lead and Intern see only their own
  const filteredContributions = contributions?.filter((c: any) => {
    if (isAdmin) return true
    return c.changed_by === user.id
  }) || []

  const feedTitle = isAdmin ? "System Activity Ledger" : "My Activity Timeline"
  const feedDescription = isAdmin ? "Real-time activity log from all users" : "Personal log of your modifications"

  // 7. Calculate stats per intern
  const internMetrics = interns.map((intern: any) => {
    const internTasks = tasksList.filter((t: any) => t.assignee_id === intern.id)
    const completedTasksCount = internTasks.filter((t: any) => t.status === 'done').length
    
    // On-Time completion: completed tasks where updated_at <= due_date (or due_date is null/not set)
    const onTimeTasks = internTasks.filter((t: any) => {
      if (t.status !== 'done') return false
      if (!t.due_date) return true
      const completedDate = new Date(t.updated_at)
      const dueDate = new Date(t.due_date + 'T23:59:59')
      return completedDate <= dueDate
    }).length

    const onTimeRate = completedTasksCount > 0 
      ? Math.round((onTimeTasks / completedTasksCount) * 100) 
      : 100

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

  // Calculate task status distribution for Leads/Admins
  const taskDistribution = {
    todo: tasksList.filter((t: any) => t.status === 'todo').length,
    inProgress: tasksList.filter((t: any) => t.status === 'in_progress').length,
    review: tasksList.filter((t: any) => t.status === 'review').length,
    blocked: tasksList.filter((t: any) => t.status === 'blocked').length,
    done: tasksList.filter((t: any) => t.status === 'done').length,
  }

  // Calculate stats for the current user (if intern)
  const myTasks = tasksList.filter((t: any) => t.assignee_id === user.id)
  const myCompletedTasksCount = myTasks.filter((t: any) => t.status === 'done').length
  const myTotalTasksCount = myTasks.length
  const myCompletionRate = myTotalTasksCount > 0 ? Math.round((myCompletedTasksCount / myTotalTasksCount) * 100) : 0

  const myOnTimeTasks = myTasks.filter((t: any) => {
    if (t.status !== 'done') return false
    if (!t.due_date) return true
    const completedDate = new Date(t.updated_at)
    const dueDate = new Date(t.due_date + 'T23:59:59')
    return completedDate <= dueDate
  }).length

  const myOnTimeRate = myCompletedTasksCount > 0 
    ? Math.round((myOnTimeTasks / myCompletedTasksCount) * 100) 
    : 100

  const myUserStandups = standupsList.filter((s: any) => s.user_id === user.id)
  const myStandupCount = myUserStandups.length
  const myStandupStreak = calculateStandupStreak(myUserStandups)

  const myTaskDistribution = {
    todo: myTasks.filter((t: any) => t.status === 'todo').length,
    inProgress: myTasks.filter((t: any) => t.status === 'in_progress').length,
    review: myTasks.filter((t: any) => t.status === 'review').length,
    blocked: myTasks.filter((t: any) => t.status === 'blocked').length,
    done: myTasks.filter((t: any) => t.status === 'done').length,
  }

  // Earned Achievements (Milestones)
  const achievements = []
  if (myStandupStreak >= 3) {
    achievements.push({
      title: 'Streak Star',
      description: 'Logged standups for 3+ consecutive days',
      icon: Flame,
      color: 'bg-orange-50 border-orange-200 text-orange-600'
    })
  }
  if (myOnTimeRate >= 80 && myCompletedTasksCount > 0) {
    achievements.push({
      title: 'On-Time Champion',
      description: 'Maintained an 80%+ on-time completion rate',
      icon: Target,
      color: 'bg-green-50 border-green-200 text-green-600'
    })
  }
  if (myCompletedTasksCount >= 3) {
    achievements.push({
      title: 'Task Crusher',
      description: 'Successfully completed 3 or more tasks',
      icon: Trophy,
      color: 'bg-yellow-50 border-yellow-250 text-yellow-600'
    })
  }
  if (achievements.length === 0) {
    achievements.push({
      title: 'Rising Star',
      description: 'Beginning your productivity tracking journey',
      icon: Sparkles,
      color: 'bg-blue-50 border-blue-200 text-blue-600'
    })
  }

  return (
    <div className="space-y-6 select-none">
      {/* 1. Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A] flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#C9952A]" />
            Performance & Analytics
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {isAdmin && 'Org-wide overview of intern productivity, task deadlines, and logs.'}
            {isLead && `Squad metrics and recent activity feed for ${profile.teams?.name || 'your team'}.`}
            {isIntern && 'Your personal performance history and squad contributions.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/10 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider">
            {profile.role === 'admin' ? 'manager' : profile.role} view
          </span>
        </div>
      </div>

      {/* 2. PERSONAL DASHBOARD FOR INTERNS */}
      {isIntern && (
        <div className="bg-gradient-to-br from-[#0B1F3A] to-[#1A365D] text-white rounded-2xl p-6 shadow-xl border border-[#C9952A]/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#C9952A]/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm text-[#C9952A] border border-[#C9952A]/30 uppercase">
                  {profile.name.substring(0, 2)}
                </div>
                <div>
                  <h2 className="text-lg font-bold">My Performance Summary</h2>
                  <p className="text-xs text-slate-350">Real-time statistics for {profile.name}</p>
                </div>
              </div>
              <Badge className="bg-[#C9952A] hover:bg-[#C9952A]/90 text-[#0B1F3A] font-extrabold text-[10px] uppercase px-2.5 py-1">
                Active Streak: {myStandupStreak} Days
              </Badge>
            </div>

            {/* Core Personal Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Task Completion Rate */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Task Completion</span>
                  <CheckSquare className="h-4 w-4 text-[#C9952A]" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold">{myCompletionRate}%</div>
                  <p className="text-xs text-slate-400 mt-1">{myCompletedTasksCount} of {myTotalTasksCount} tasks completed</p>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-3.5 overflow-hidden">
                    <div
                      className="bg-[#C9952A] h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${myCompletionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* On-Time Rate */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">On-Time Delivery</span>
                  <Clock className="h-4 w-4 text-emerald-450" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold">{myOnTimeRate}%</div>
                  <p className="text-xs text-slate-400 mt-1">Completion compliance to deadlines</p>
                  <div className="w-full bg-white/10 h-1.5 rounded-full mt-3.5 overflow-hidden">
                    <div
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        myOnTimeRate >= 80 ? "bg-emerald-500" : myOnTimeRate >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${myOnTimeRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Standup Streak Info */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold uppercase tracking-wider">Daily Standups</span>
                  <Flame className="h-4 w-4 text-orange-500" />
                </div>
                <div className="mt-4">
                  <div className="text-3xl font-extrabold flex items-center gap-1.5">
                    {myStandupCount} <span className="text-xs text-slate-400 font-medium">Logged</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    {myStandupStreak > 0 ? (
                      <span className="text-[10px] text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full font-bold flex items-center gap-0.5 animate-pulse">
                        🔥 Active {myStandupStreak} day streak
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">No active streak currently</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2.5">Keep posting daily standups to maintain your streak!</p>
                </div>
              </div>
            </div>

            {/* Intern Specific task distribution and Badges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
              {/* Task Breakdown */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">My Task Distribution</h3>
                  <ListTodo className="h-4 w-4 text-slate-400" />
                </div>
                
                {/* Horizontal Segmented Progress Bar */}
                {myTotalTasksCount > 0 ? (
                  <div className="space-y-3">
                    <div className="w-full h-3 bg-white/10 rounded-full flex overflow-hidden border border-white/5">
                      <div className="bg-slate-400 h-full" style={{ width: `${(myTaskDistribution.todo / myTotalTasksCount) * 100}%` }} title="Todo" />
                      <div className="bg-amber-500 h-full" style={{ width: `${(myTaskDistribution.inProgress / myTotalTasksCount) * 100}%` }} title="In Progress" />
                      <div className="bg-sky-500 h-full" style={{ width: `${(myTaskDistribution.review / myTotalTasksCount) * 100}%` }} title="In Review" />
                      <div className="bg-red-500 h-full" style={{ width: `${(myTaskDistribution.blocked / myTotalTasksCount) * 100}%` }} title="Blocked" />
                      <div className="bg-emerald-500 h-full" style={{ width: `${(myTaskDistribution.done / myTotalTasksCount) * 100}%` }} title="Done" />
                    </div>

                    <div className="grid grid-cols-5 gap-1 text-[10px] font-bold text-center text-slate-300 select-none">
                      <div className="flex flex-col items-center bg-white/5 border border-white/5 p-1 rounded">
                        <span className="text-slate-450 uppercase text-[8px]">Todo</span>
                        <span className="text-sm mt-0.5">{myTaskDistribution.todo}</span>
                      </div>
                      <div className="flex flex-col items-center bg-white/5 border border-white/5 p-1 rounded">
                        <span className="text-amber-400 uppercase text-[8px]">Active</span>
                        <span className="text-sm text-amber-300 mt-0.5">{myTaskDistribution.inProgress}</span>
                      </div>
                      <div className="flex flex-col items-center bg-white/5 border border-white/5 p-1 rounded">
                        <span className="text-sky-400 uppercase text-[8px]">Review</span>
                        <span className="text-sm text-sky-350 mt-0.5">{myTaskDistribution.review}</span>
                      </div>
                      <div className="flex flex-col items-center bg-white/5 border border-white/5 p-1 rounded">
                        <span className="text-red-400 uppercase text-[8px]">Blocked</span>
                        <span className="text-sm text-red-350 mt-0.5">{myTaskDistribution.blocked}</span>
                      </div>
                      <div className="flex flex-col items-center bg-white/5 border border-white/5 p-1 rounded">
                        <span className="text-emerald-450 uppercase text-[8px]">Done</span>
                        <span className="text-sm text-emerald-350 mt-0.5">{myTaskDistribution.done}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-450 text-xs italic">
                    No tasks assigned yet.
                  </div>
                )}
              </div>

              {/* Achievements Feed */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Earned Milestones & Badges</h3>
                  <Award className="h-4 w-4 text-[#C9952A]" />
                </div>
                <div className="space-y-2 max-h-[140px] overflow-y-auto">
                  {achievements.map((badge, idx) => {
                    const IconComponent = badge.icon
                    return (
                      <div key={idx} className={cn("p-2.5 rounded-lg border flex items-center gap-3 transition-colors text-xs text-white", badge.color.replace('bg-', 'bg-opacity-10 bg-').replace('text-', 'text-'))}>
                        <div className={cn("h-7 w-7 rounded-full flex items-center justify-center border shrink-0 bg-white/10")}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs">{badge.title}</h4>
                          <p className="text-[10px] text-slate-300 mt-0.5">{badge.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MANAGER/ADMIN ANALYTICS AND METRIC CHARTS */}
      {(isLead || isAdmin) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Analytics metrics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Scorecard grids */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-[#C9952A] h-1.5 rounded-full" style={{ width: `${globalCompletionRate}%` }} />
                  </div>
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
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200/80 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Active Interns Tracked
                  </CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-extrabold text-[#0B1F3A]">
                    {interns.length}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    Participating squad members
                  </p>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '100%' }} />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Task state breakdown custom charts */}
            <Card className="border-slate-200/80 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-[#0B1F3A] flex items-center justify-between">
                  <span>Task Distribution & Progress Analytics</span>
                  <BarChart3 className="h-4 w-4 text-[#C9952A]" />
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Visual categorization of tasks logged in Supabase for your squad
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4">
                {totalTasksCount > 0 ? (
                  <div className="space-y-4">
                    {/* Segmented Bar Chart */}
                    <div className="w-full h-4 bg-slate-100 rounded-full flex overflow-hidden border border-slate-200/60 shadow-inner">
                      <div className="bg-slate-400 h-full transition-all duration-300" style={{ width: `${(taskDistribution.todo / totalTasksCount) * 100}%` }} title="Todo" />
                      <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${(taskDistribution.inProgress / totalTasksCount) * 100}%` }} title="In Progress" />
                      <div className="bg-sky-500 h-full transition-all duration-300" style={{ width: `${(taskDistribution.review / totalTasksCount) * 100}%` }} title="In Review" />
                      <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${(taskDistribution.blocked / totalTasksCount) * 100}%` }} title="Blocked" />
                      <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${(taskDistribution.done / totalTasksCount) * 100}%` }} title="Done" />
                    </div>

                    {/* Stat Breakdown Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                      <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-lg flex flex-col justify-center shadow-sm">
                        <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider">Todo</span>
                        <div className="flex items-baseline justify-between mt-1 select-none">
                          <span className="text-lg font-bold text-slate-700">{taskDistribution.todo}</span>
                          <span className="text-[10px] text-slate-400 font-bold">{Math.round((taskDistribution.todo / totalTasksCount) * 100)}%</span>
                        </div>
                      </div>

                      <div className="bg-amber-50/20 border border-amber-200/50 p-3 rounded-lg flex flex-col justify-center shadow-sm">
                        <span className="text-[9px] text-amber-600 font-extrabold uppercase tracking-wider">In Progress</span>
                        <div className="flex items-baseline justify-between mt-1 select-none">
                          <span className="text-lg font-bold text-amber-700">{taskDistribution.inProgress}</span>
                          <span className="text-[10px] text-amber-550 font-bold">{Math.round((taskDistribution.inProgress / totalTasksCount) * 100)}%</span>
                        </div>
                      </div>

                      <div className="bg-sky-50/20 border border-sky-200/50 p-3 rounded-lg flex flex-col justify-center shadow-sm">
                        <span className="text-[9px] text-sky-650 font-extrabold uppercase tracking-wider">In Review</span>
                        <div className="flex items-baseline justify-between mt-1 select-none">
                          <span className="text-lg font-bold text-sky-700">{taskDistribution.review}</span>
                          <span className="text-[10px] text-sky-500 font-bold">{Math.round((taskDistribution.review / totalTasksCount) * 100)}%</span>
                        </div>
                      </div>

                      <div className="bg-red-50/20 border border-red-200/50 p-3 rounded-lg flex flex-col justify-center shadow-sm">
                        <span className="text-[9px] text-red-650 font-extrabold uppercase tracking-wider">Blocked</span>
                        <div className="flex items-baseline justify-between mt-1 select-none">
                          <span className="text-lg font-bold text-red-700">{taskDistribution.blocked}</span>
                          <span className="text-[10px] text-red-550 font-bold">{Math.round((taskDistribution.blocked / totalTasksCount) * 100)}%</span>
                        </div>
                      </div>

                      <div className="bg-emerald-50/20 border border-emerald-250/50 p-3 rounded-lg flex flex-col justify-center shadow-sm col-span-2 sm:col-span-1">
                        <span className="text-[9px] text-emerald-650 font-extrabold uppercase tracking-wider">Completed</span>
                        <div className="flex items-baseline justify-between mt-1 select-none">
                          <span className="text-lg font-bold text-emerald-700">{taskDistribution.done}</span>
                          <span className="text-[10px] text-emerald-550 font-bold">{Math.round((taskDistribution.done / totalTasksCount) * 100)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Inbox className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 italic">No tasks logged to analyze status distributions.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Compliance & Streaks */}
          <Card className="border-slate-200/80 shadow-sm flex flex-col justify-between">
            <div>
              <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-sm font-bold text-[#0B1F3A] flex items-center gap-2">
                  <Award className="h-4 w-4 text-[#C9952A]" />
                  Standup Streak Leaderboard
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Top consecutive check-in counts in your squad
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {internMetrics.length > 0 ? (
                  <div className="divide-y divide-slate-100 select-none">
                    {internMetrics
                      .sort((a: any, b: any) => b.standupStreak - a.standupStreak)
                      .slice(0, 5)
                      .map(({ profile: intern, standupStreak }: any, idx: number) => (
                        <div key={intern.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                            <div className="h-8 w-8 rounded-full bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 flex items-center justify-center font-bold text-xs text-[#0B1F3A] uppercase shrink-0">
                              {intern.name.substring(0, 2)}
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-bold text-xs text-[#0B1F3A] truncate">{intern.name}</span>
                              <span className="text-[9px] text-slate-400 font-semibold uppercase">{intern.teams?.name || 'Squad'}</span>
                            </div>
                          </div>
                          {standupStreak > 0 ? (
                            <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2.5 py-0.5 font-bold flex items-center gap-0.5 animate-pulse">
                              🔥 {standupStreak} Days
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-medium italic">No active streak</span>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="py-12 px-4 text-center">
                    <Flame className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 italic">No standup logs recorded.</p>
                  </div>
                )}
              </CardContent>
            </div>
          </Card>
        </div>
      )}

      {/* 4. BOTTOM GRID: SQUAD LEADERBOARD & CONTRIBUTION FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Intern Directory / Leaderboard (Takes 2 cols) */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-bold text-[#0B1F3A]">Squad Performance Directory</CardTitle>
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
                      {internMetrics.map(({ profile: intern, totalTasks, completedTasks, onTimeRate, standupCount, standupStreak }: any) => {
                        const isSelf = intern.id === user.id
                        return (
                          <tr
                            key={intern.id}
                            className={cn(
                              "hover:bg-slate-50/50 transition-colors",
                              isSelf && "bg-[#C9952A]/5 border-l-2 border-[#C9952A]"
                            )}
                          >
                            <td className="py-4 px-6 flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 flex items-center justify-center font-bold text-xs text-[#0B1F3A] uppercase shrink-0">
                                {intern.name.substring(0, 2)}
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-slate-800 truncate flex items-center gap-1.5">
                                  {intern.name}
                                  {isSelf && <span className="bg-[#0B1F3A] text-white text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider scale-90">you</span>}
                                </span>
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
                                  <span className="text-[10px] text-orange-600 bg-orange-50 border border-orange-100 rounded-full px-2 py-0.5 mt-1 font-bold inline-flex items-center gap-0.5 animate-pulse">
                                    🔥 {standupStreak} day streak
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 mt-1 font-medium italic">No active streak</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View Card List */}
                <div className="block md:hidden divide-y divide-slate-100 select-none">
                  {internMetrics.map(({ profile: intern, totalTasks, completedTasks, onTimeRate, standupCount, standupStreak }: any) => {
                    const isSelf = intern.id === user.id
                    return (
                      <div
                        key={intern.id}
                        className={cn(
                          "p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors",
                          isSelf && "bg-[#C9952A]/5 border-l-2 border-[#C9952A]"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 flex items-center justify-center font-bold text-xs text-[#0B1F3A] uppercase shrink-0">
                            {intern.name.substring(0, 2)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-slate-800 truncate flex items-center gap-1.5">
                              {intern.name}
                              {isSelf && <span className="bg-[#0B1F3A] text-white text-[8px] px-1 py-0.5 rounded font-extrabold uppercase scale-90">you</span>}
                            </span>
                            <span className="text-[9px] text-slate-400 font-semibold truncate">
                              {intern.teams?.name || 'Unassigned Squad'}
                            </span>
                          </div>
                        </div>

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

                        {standupStreak > 0 && (
                          <div className="bg-orange-50 border border-orange-100 rounded-lg py-1.5 px-2.5 text-[9px] font-bold text-orange-700 flex items-center justify-center gap-1">
                            🔥 Active {standupStreak} day standup streak!
                          </div>
                        )}
                      </div>
                    )
                  })}
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
                {feedTitle}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {feedDescription}
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
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 border animate-pulse",
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
