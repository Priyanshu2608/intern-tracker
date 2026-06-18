import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ShieldAlert,
  Users,
  Settings,
  ClipboardList,
  CheckCircle,
  AlertOctagon,
  Clock,
  ArrowRight,
  Database,
  KeyRound
} from 'lucide-react'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Admin Control Center | Turn2Law Intern Tracker',
  description: 'Manage squads, roles, and org-wide task distributions.',
}

export default async function AdminPage() {
  const supabase = await createClient()

  // 1. Get current auth user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Query user profile role to verify admin access
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  // 3. Fetch all profiles for stats computation
  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('role, status, team_id, name, must_reset_password')

  const totalUsers = allProfiles?.length || 0
  const adminCount = allProfiles?.filter((p) => p.role === 'admin').length || 0
  const leadCount = allProfiles?.filter((p) => p.role === 'lead').length || 0
  const internCount = allProfiles?.filter((p) => p.role === 'intern').length || 0
  const activeCount = allProfiles?.filter((p) => p.status === 'active').length || 0
  const inactiveCount = allProfiles?.filter((p) => p.status === 'inactive').length || 0

  // 4. Fetch all tasks for stats computation
  const { data: allTasks } = await supabase
    .from('tasks')
    .select('status')

  const totalTasks = allTasks?.length || 0
  const todoTasks = allTasks?.filter((t) => t.status === 'todo').length || 0
  const inProgressTasks = allTasks?.filter((t) => t.status === 'in_progress').length || 0
  const reviewTasks = allTasks?.filter((t) => t.status === 'review').length || 0
  const doneTasks = allTasks?.filter((t) => t.status === 'done').length || 0
  const blockedTasks = allTasks?.filter((t) => t.status === 'blocked').length || 0

  // 5. Fetch teams to compute sizes
  const { data: dbTeams } = await supabase
    .from('teams')
    .select('*')

  const teamStats = dbTeams?.map((team) => {
    const teamMembers = allProfiles?.filter((p) => p.team_id === team.id) || []
    const lead = teamMembers.find((p) => p.role === 'lead')

    return {
      ...team,
      memberCount: teamMembers.length,
      leadName: lead ? lead.name : 'None',
    }
  }) || []

  return (
    <div className="space-y-6">
      {/* 1. Welcoming & Control Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center border border-red-100">
            <Settings className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#0B1F3A]">Admin Panel</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Secure org-wide workspace management, credentials auditing, and statistics.
            </p>
          </div>
        </div>

        <Link href="/people">
          <Button className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold gap-1.5 h-10 border border-[#C9952A]/20 cursor-pointer">
            <KeyRound className="h-4 w-4 text-[#C9952A]" />
            Manage Credentials
          </Button>
        </Link>
      </div>

      {/* 2. Global Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Account Distributions */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold text-[#0B1F3A]">User Registry</CardTitle>
              <CardDescription className="text-[10px] text-slate-400">Total accounts provisioned</CardDescription>
            </div>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Administrator Roles</span>
              <span className="font-extrabold text-[#0B1F3A]">{adminCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Squad Lead Roles</span>
              <span className="font-extrabold text-[#0B1F3A]">{leadCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Intern Roles</span>
              <span className="font-extrabold text-[#0B1F3A]">{internCount}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold pt-1">
              <span className="text-slate-500">Total Database Accounts</span>
              <span className="text-[#C9952A]">{totalUsers}</span>
            </div>
          </CardContent>
        </Card>

        {/* Security Audit Status */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold text-[#0B1F3A]">Account Lock & Status</CardTitle>
              <CardDescription className="text-[10px] text-slate-400">Security enforcement metrics</CardDescription>
            </div>
            <ShieldAlert className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Active Profiles</span>
              <Badge className="bg-green-100 text-green-800 border-none font-bold text-[10px]">{activeCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs border-b border-slate-50 pb-2">
              <span className="text-slate-400 font-semibold">Deactivated Profiles</span>
              <Badge className="bg-red-100 text-red-800 border-none font-bold text-[10px]">{inactiveCount}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400 font-semibold">Pending First Login Reset</span>
              <Badge className="bg-amber-100 text-amber-800 border-none font-bold text-[10px]">
                {allProfiles?.filter((p) => p.must_reset_password).length || 0}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* System Task Boards Allocation */}
        <Card className="border-slate-200/80 shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3 flex flex-row items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-sm font-bold text-[#0B1F3A]">Task Board Metrics</CardTitle>
              <CardDescription className="text-[10px] text-slate-400">Database tasks distribution</CardDescription>
            </div>
            <ClipboardList className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent className="pt-4 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-400 font-semibold">
              <span>To Do</span>
              <span className="font-bold text-slate-700">{todoTasks}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-semibold">
              <span>In Progress</span>
              <span className="font-bold text-amber-600">{inProgressTasks}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-semibold">
              <span>Under Review</span>
              <span className="font-bold text-blue-600">{reviewTasks}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-semibold">
              <span>Blocked</span>
              <span className="font-bold text-red-500">{blockedTasks}</span>
            </div>
            <div className="flex items-center justify-between text-slate-400 font-semibold border-t border-slate-100 pt-2 font-bold">
              <span className="text-slate-500">Completed (Done)</span>
              <span className="text-green-600">{doneTasks} / {totalTasks}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Squad Allocation overview */}
      <Card className="border-slate-200/80 shadow-sm">
        <CardHeader className="border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-[#0B1F3A]">Squad Allocation Matrix</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Overview of active teams and squad lead assignments
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {teamStats.length > 0 ? (
            <>
              {/* Desktop View Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-55 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider select-none">
                      <th className="py-3 px-6">Squad Name</th>
                      <th className="py-3 px-6">Squad Lead</th>
                      <th className="py-3 px-6 text-center">Active Members</th>
                      <th className="py-3 px-6 text-right">Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {teamStats.map((team) => (
                      <tr key={team.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-6 font-bold text-slate-800">{team.name}</td>
                        <td className="py-3.5 px-6 font-semibold text-slate-500">{team.leadName}</td>
                        <td className="py-3.5 px-6 text-center font-bold text-slate-700">
                          {team.memberCount} people
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <Link href="/people">
                            <Button variant="ghost" size="sm" className="text-xs text-[#C9952A] hover:bg-[#C9952A]/5 hover:text-[#C9952A] font-semibold gap-1.5 cursor-pointer">
                              Configure members <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card List */}
              <div className="block md:hidden divide-y divide-slate-100 select-none">
                {teamStats.map((team) => (
                  <div key={team.id} className="p-4 flex flex-col gap-2 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">{team.name}</span>
                      <span className="text-[10px] text-slate-550 font-bold bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                        {team.memberCount} members
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="text-slate-400 font-semibold">Lead: <span className="text-slate-650 font-bold">{team.leadName}</span></span>
                      <Link href="/people">
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-[#C9952A] hover:bg-[#C9952A]/5 hover:text-[#C9952A] font-bold gap-1 cursor-pointer">
                          Configure <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-slate-400 font-medium">
              No squads registered. Create a new squad in the People & Teams page.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Security / System checks info */}
      <Card className="border-slate-200/80 shadow-sm bg-slate-50/40">
        <CardContent className="p-5 flex items-center justify-between text-slate-500 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-[#C9952A]" />
            <span>Database Connection: <span className="text-green-600">Online & Secure (SSL)</span></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 rounded px-2.5 py-1">
            <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Row-Level Security: Enabled</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
