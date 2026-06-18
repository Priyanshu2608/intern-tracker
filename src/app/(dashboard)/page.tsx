import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  ChevronRight,
  ClipboardList,
  Plus,
  Users,
  Check,
  TrendingUp,
  Inbox
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Get current auth user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Query user profile
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

  // Fetch open tasks (exclude done, order by closest due date)
  let tasksQuery = supabase.from('tasks').select('*, assignee:profiles!tasks_assignee_id_fkey(name)')
  if (isIntern) {
    tasksQuery = tasksQuery.eq('assignee_id', user.id)
  } else if (isLead && myTeamId) {
    tasksQuery = tasksQuery.eq('team_id', myTeamId)
  }
  const { data: openTasks } = await tasksQuery
    .neq('status', 'done')
    .order('due_date', { ascending: true })
    .limit(5)
  const openTasksList = (openTasks || []) as any[]

  // Fetch today's standup submission
  const todayStr = new Date().toLocaleDateString('en-CA') // YYYY-MM-DD
  const { data: todayStandup } = await supabase
    .from('standups')
    .select('*')
    .eq('user_id', user.id)
    .eq('date', todayStr)
    .maybeSingle()

  // Fetch upcoming meetings
  let meetingsQuery = supabase.from('meetings').select('*')
  if (myTeamId) {
    meetingsQuery = meetingsQuery.or(`team_id.eq.${myTeamId},team_id.is.null`)
  } else {
    meetingsQuery = meetingsQuery.is('team_id', null)
  }
  const { data: upcomingMeetings } = await meetingsQuery
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })
    .limit(3)
  const upcomingMeetingsList = (upcomingMeetings || []) as any[]

  // Fetch all tasks for stats
  let statsTasksQuery = supabase.from('tasks').select('status, due_date')
  if (isIntern) {
    statsTasksQuery = statsTasksQuery.eq('assignee_id', user.id)
  } else if (isLead && myTeamId) {
    statsTasksQuery = statsTasksQuery.eq('team_id', myTeamId)
  }
  const { data: statsTasks } = await statsTasksQuery
  const statsTasksList = (statsTasks || []) as any[]
  const totalTasks = statsTasksList.length
  const completedTasks = statsTasksList.filter((t: any) => t.status === 'done').length
  const overdueTasks =
    statsTasksList.filter(
      (t: any) =>
        t.status !== 'done' &&
        t.due_date &&
        new Date(t.due_date + 'T23:59:59') < new Date()
    ).length

  // Fetch active squad members
  let teamSize = 0
  if (myTeamId) {
    const { count } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', myTeamId)
      .eq('status', 'active')
    teamSize = count || 0
  }

  // Calculate task completion percentage
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  return (
    <div className="space-y-6">
      {/* 1. Welcoming & Banner Alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-[#0B1F3A]">
            Welcome back, {profile.name}!
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {isIntern && "Here's a breakdown of your current tasks and team status."}
            {isLead && `Managing ${profile.teams?.name || 'your team'} and squad activities.`}
            {isAdmin && 'Manager overview — monitoring updates from interns and squad leaders.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {todayStandup ? (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-4 py-2 rounded-lg text-green-700 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span>Standup Submitted Today</span>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-amber-700 text-xs font-semibold">
                <AlertCircle className="h-4 w-4 text-amber-600 animate-pulse" />
                <span>Standup Missing Today</span>
              </div>
              <Link href="/standups">
                <Button className="bg-[#C9952A] hover:bg-[#C9952A]/90 text-white font-semibold text-xs h-9 cursor-pointer">
                  Submit Standup
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 2. Key Metrics Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Task Completion Rate */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Task Completion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-[#C9952A]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0B1F3A]">{completionRate}%</div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {completedTasks} of {totalTasks} tasks completed
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#0B1F3A] to-[#C9952A] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Open Tasks */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Open Tasks
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0B1F3A]">
              {openTasks?.length || 0}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Awaiting review or in progress
            </p>
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Tasks
            </CardTitle>
            <Clock className={cn("h-4 w-4", overdueTasks > 0 ? "text-red-500 animate-pulse" : "text-slate-400")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold", overdueTasks > 0 ? "text-red-600" : "text-[#0B1F3A]")}>
              {overdueTasks}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Tasks past their target due date
            </p>
          </CardContent>
        </Card>

        {/* Squad Members */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Squad Members
            </CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#0B1F3A]">
              {isAdmin ? 'ALL' : teamSize}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              {isAdmin ? 'Access to whole directory' : 'Active team size in your squad'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Bottom Grid: Open Tasks & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open Tasks List (Takes 2 cols) */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-[#0B1F3A]">
                {isAdmin ? 'All Open Tasks' : 'My Open Tasks'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {isAdmin ? 'Tasks across all squads and teams' : 'Tasks currently assigned to you or your team'}
              </CardDescription>
            </div>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="text-xs text-[#C9952A] hover:text-[#C9952A]/90 hover:bg-[#C9952A]/5 font-semibold gap-1 cursor-pointer">
                View Board <ChevronRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {openTasksList.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {openTasksList.map((task: any) => {
                  const isOverdue = task.due_date && new Date(task.due_date + 'T23:59:59') < new Date()

                  return (
                    <div
                      key={task.id}
                      className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex flex-col gap-1 pr-4 min-w-0">
                        <Link
                          href="/tasks"
                          className="font-semibold text-sm text-[#0B1F3A] hover:underline truncate"
                        >
                          {task.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              task.status === 'blocked' && "bg-red-50 text-red-700 border border-red-200",
                              task.status === 'todo' && "bg-slate-100 text-slate-700",
                              task.status === 'in_progress' && "bg-amber-50 text-amber-700 border border-amber-200",
                              task.status === 'review' && "bg-blue-50 text-blue-700 border border-blue-200"
                            )}
                          >
                            {task.status.replace('_', ' ')}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wider",
                              task.priority === 'urgent' && "bg-red-100 text-red-800",
                              task.priority === 'high' && "bg-amber-100 text-amber-800",
                              task.priority === 'medium' && "bg-blue-100 text-blue-800",
                              task.priority === 'low' && "bg-slate-100 text-slate-800"
                            )}
                          >
                            {task.priority}
                          </Badge>
                          {task.assignee && (
                            <span className="text-slate-400 font-medium truncate max-w-[120px]">
                              Assigned to: {task.assignee.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {task.due_date && (
                          <div className={cn(
                            "flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded",
                            isOverdue
                              ? "bg-red-50 text-red-600 border border-red-100"
                              : "text-slate-500 bg-slate-50"
                          )}>
                            <Clock className="h-3 w-3" />
                            <span>{new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <Inbox className="h-10 w-10 text-slate-300 mb-2" />
                <h3 className="font-semibold text-sm text-[#0B1F3A]">All tasks completed!</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  You don't have any open tasks waiting for your input. Take a look at the Task Board to claim a new card.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings (Takes 1 col) */}
        <Card className="border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#C9952A]" />
                Upcoming Meetings
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Squad check-ins and all-hands reviews
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingMeetingsList.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {upcomingMeetingsList.map((meeting: any) => {
                    const start = new Date(meeting.start_time)
                    const timeStr = start.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const dateStr = start.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })

                    return (
                      <div key={meeting.id} className="p-4 flex gap-3 hover:bg-slate-50/50 transition-colors">
                        <div className="flex flex-col items-center justify-center bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 text-[#0B1F3A] rounded-lg p-2 h-12 w-12 text-center shrink-0">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 leading-none">
                            {start.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-sm font-extrabold mt-0.5 leading-none">
                            {start.getDate()}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-semibold text-xs text-[#0B1F3A] truncate">
                            {meeting.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {meeting.team_id ? 'Squad Meeting' : 'All-Hands Briefing'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold mt-1 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded w-max">
                            {timeStr}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <Calendar className="h-10 w-10 text-slate-300 mb-2" />
                  <h3 className="font-semibold text-sm text-[#0B1F3A]">No upcoming meetings</h3>
                  <p className="text-xs text-slate-400 max-w-[200px] mt-1">
                    There are no scheduled team syncs in your calendar.
                  </p>
                </div>
              )}
            </CardContent>
          </div>

          <div className="p-4 border-t border-slate-100 shrink-0">
            <Link href="/meetings" className="w-full block">
              <Button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold h-9 shadow-none cursor-pointer">
                View Calendar
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
