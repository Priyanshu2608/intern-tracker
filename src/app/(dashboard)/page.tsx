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
  Inbox,
  Flame,
  User,
  AlertOctagon,
  CalendarDays
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
  } else {
    // Lead or Admin: Show both tasks assigned to them AND tasks created by them (given tasks)
    tasksQuery = tasksQuery.or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
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

  // Fetch all tasks for stats (aligned with what they can view)
  let statsTasksQuery = supabase.from('tasks').select('status, due_date')
  if (isIntern) {
    statsTasksQuery = statsTasksQuery.eq('assignee_id', user.id)
  } else {
    statsTasksQuery = statsTasksQuery.or(`assignee_id.eq.${user.id},created_by.eq.${user.id}`)
  }
  const { data: statsTasks } = await statsTasksQuery
  const statsTasksList = (statsTasks || []) as any[]
  const totalTasks = statsTasksList.length
  const completedTasks = statsTasksList.filter((t: any) => t.status === 'done').length
  
  const totalOpenTasks = statsTasksList.filter((t: any) => t.status !== 'done').length

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

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6 select-none">
      {/* 1. Welcoming & Banner Alert - Overhauled for Premium aesthetic */}
      <div className="relative overflow-hidden bg-gradient-to-r from-[#0B1F3A] to-[#1A365D] text-white rounded-2xl p-6 md:p-8 shadow-xl border border-[#C9952A]/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#C9952A]/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {profile.name}!
            </h1>
            <p className="text-slate-350 text-sm max-w-xl font-medium leading-relaxed">
              {isIntern && "Track your assigned task pipeline, log daily milestones, and verify squad alignment."}
              {isLead && `Supervising ${profile.teams?.name || 'your team'} activities. Monitor squad updates and tasks below.`}
              {isAdmin && 'Manager Administration Console — overviewing task workflows and check-in metrics.'}
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            {todayStandup ? (
              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 px-4 py-2.5 rounded-xl text-emerald-450 text-xs font-bold shadow-sm backdrop-blur-md">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400" />
                <span>Standup Submitted Today</span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 rounded-xl text-amber-400 text-xs font-bold backdrop-blur-md">
                  <AlertCircle className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                  <span>Standup Missing Today</span>
                </div>
                <Link href="/standups">
                  <Button className="bg-[#C9952A] hover:bg-[#C9952A]/90 text-[#0B1F3A] font-extrabold text-xs h-10 px-4 rounded-xl cursor-pointer shadow-md transition-all duration-200 hover:-translate-y-0.5">
                    Submit Standup
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Widgets - Refined with hover lifts and custom styles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Task Completion Rate */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#C9952A]" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Task Completion Rate
            </CardTitle>
            <TrendingUp className="h-4.5 w-4.5 text-[#C9952A] transition-transform group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0B1F3A]">{completionRate}%</div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              {completedTasks} of {totalTasks} tasks completed
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#0B1F3A] to-[#C9952A] h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Open Tasks */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue-505 bg-blue-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Open Tasks
            </CardTitle>
            <ClipboardList className="h-4.5 w-4.5 text-blue-600 transition-transform group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0B1F3A]">
              {totalOpenTasks}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Active assigned / given tasks
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3.5 overflow-hidden">
              <div className="bg-blue-550 bg-blue-500 h-1.5 rounded-full" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Overdue Tasks
            </CardTitle>
            <Clock className={cn("h-4.5 w-4.5 transition-transform group-hover:scale-110", overdueTasks > 0 ? "text-red-500 animate-pulse" : "text-slate-450")} />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-extrabold", overdueTasks > 0 ? "text-red-600" : "text-[#0B1F3A]")}>
              {overdueTasks}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              Tasks past their target due date
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3.5 overflow-hidden">
              <div className={cn("h-1.5 rounded-full", overdueTasks > 0 ? "bg-red-500" : "bg-slate-200")} style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>

        {/* Squad Members */}
        <Card className="border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden relative group">
          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Squad Members
            </CardTitle>
            <Users className="h-4.5 w-4.5 text-emerald-600 transition-transform group-hover:scale-110" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-[#0B1F3A]">
              {isAdmin ? 'ALL' : teamSize}
            </div>
            <p className="text-xs text-slate-400 mt-1 font-semibold">
              {isAdmin ? 'Access to whole directory' : 'Active team size in squad'}
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '100%' }} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Bottom Grid: Open Tasks & Meetings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Open Tasks List (Takes 2 cols) - Upgraded with clean rows & custom avatars */}
        <Card className="lg:col-span-2 border-slate-200/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <CardTitle className="text-base font-bold text-[#0B1F3A]">
                {isIntern ? 'My Open Tasks' : 'My Open & Given Tasks'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {isIntern ? 'Tasks currently assigned to you' : 'Tasks assigned to you or created by you'}
              </CardDescription>
            </div>
            <Link href="/tasks">
              <Button variant="ghost" size="sm" className="text-xs text-[#C9952A] hover:text-[#C9952A]/90 hover:bg-[#C9952A]/5 font-semibold gap-1 cursor-pointer">
                View Board <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {openTasksList.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {openTasksList.map((task: any) => {
                  const isOverdue = task.due_date && new Date(task.due_date + 'T23:59:59') < new Date()
                  const isCreatedByMe = task.created_by === user.id && task.assignee_id !== user.id

                  return (
                    <div
                      key={task.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Status/Initials Avatar of assignee */}
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#0B1F3A] to-[#1A365D] border border-[#C9952A]/20 flex items-center justify-center font-extrabold text-[10px] text-[#C9952A] uppercase shrink-0 shadow-sm">
                          {getInitials(task.assignee?.name)}
                        </div>
                        
                        <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href="/tasks"
                              className="font-bold text-sm text-[#0B1F3A] hover:underline truncate max-w-[280px]"
                            >
                              {task.title}
                            </Link>
                            {isCreatedByMe && (
                              <Badge className="bg-slate-100 text-slate-600 border border-slate-200 text-[8px] font-bold uppercase tracking-wider scale-90 px-1.5 py-0.5">
                                Given Task
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-medium">
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[9px] font-bold uppercase tracking-wider scale-95",
                                task.status === 'blocked' && "bg-red-50 text-red-700 border border-red-200",
                                task.status === 'todo' && "bg-slate-100 text-slate-700 border border-slate-200",
                                task.status === 'in_progress' && "bg-amber-50 text-amber-700 border border-amber-200",
                                task.status === 'review' && "bg-blue-50 text-blue-700 border border-blue-200"
                              )}
                            >
                              {task.status.replace('_', ' ')}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[9px] font-bold uppercase tracking-wider scale-95",
                                task.priority === 'urgent' && "bg-red-100 text-red-800 border border-red-250",
                                task.priority === 'high' && "bg-amber-100 text-amber-800 border border-amber-250",
                                task.priority === 'medium' && "bg-blue-100 text-blue-800 border border-blue-250",
                                task.priority === 'low' && "bg-slate-105 bg-slate-100 text-slate-800 border border-slate-200"
                              )}
                            >
                              {task.priority}
                            </Badge>
                            <span className="truncate max-w-[150px] font-semibold text-slate-500">
                              {task.assignee ? `Assignee: ${task.assignee.name}` : 'Unassigned'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        {task.due_date && (
                          <div className={cn(
                            "flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border",
                            isOverdue
                              ? "bg-red-50 text-red-650 border-red-200 animate-pulse"
                              : "text-slate-500 bg-slate-50 border-slate-200"
                          )}>
                            <CalendarDays className="h-3.5 w-3.5" />
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
                <Inbox className="h-10 w-10 text-slate-300 mb-2 animate-bounce" />
                <h3 className="font-bold text-sm text-[#0B1F3A]">All tasks completed!</h3>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  You don't have any open tasks waiting. Take a look at the Task Board to view complete backlogs.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Meetings (Takes 1 col) - Overhauled for a calendar block design */}
        <Card className="border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-100 pb-4">
              <CardTitle className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
                <Calendar className="h-4.5 w-4.5 text-[#C9952A]" />
                Upcoming Meetings
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Squad check-ins and all-hands reviews
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingMeetingsList.length > 0 ? (
                <div className="divide-y divide-slate-100 select-none">
                  {upcomingMeetingsList.map((meeting: any) => {
                    const start = new Date(meeting.start_time)
                    const timeStr = start.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div key={meeting.id} className="p-4 flex gap-4 hover:bg-slate-50/50 transition-colors">
                        {/* Physical Date Block */}
                        <div className="flex flex-col items-center justify-center bg-white border border-[#C9952A]/30 text-[#0B1F3A] rounded-xl p-2.5 h-14 w-14 text-center shrink-0 shadow-sm relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-[#C9952A]" />
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 leading-none">
                            {start.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-base font-extrabold mt-1 leading-none text-[#0B1F3A]">
                            {start.getDate()}
                          </span>
                        </div>
                        
                        <div className="flex flex-col gap-0.5 min-w-0 justify-center">
                          <span className="font-bold text-xs text-[#0B1F3A] truncate leading-tight">
                            {meeting.title}
                          </span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={cn(
                              "text-[8px] px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wider",
                              meeting.team_id ? "bg-amber-50 text-amber-700 border border-amber-200" : "bg-[#0B1F3A]/5 text-[#0B1F3A] border border-[#0B1F3A]/10"
                            )}>
                              {meeting.team_id ? 'Squad' : 'All-Hands'}
                            </span>
                            <span className="text-[9px] text-slate-450 font-semibold">
                              {timeStr}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <CalendarDays className="h-10 w-10 text-slate-300 mb-2" />
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
              <Button className="w-full bg-[#0B1F3A]/5 hover:bg-[#0B1F3A]/10 text-[#0B1F3A] border border-[#0B1F3A]/10 text-xs font-bold h-10 shadow-none cursor-pointer rounded-xl transition-all">
                View Calendar
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
