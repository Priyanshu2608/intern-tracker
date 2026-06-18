'use client'

import { useState, useActionState, useTransition } from 'react'
import { submitStandup } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  AlertCircle,
  Users,
  Send,
  Loader2,
  AlertOctagon,
  CalendarDays,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Profile {
  id: string
  name: string
  role: 'admin' | 'lead' | 'intern'
  team_id: string | null
  teams: { name: string } | null
}

interface Standup {
  id: string
  user_id: string
  date: string
  did_yesterday: string
  doing_today: string
  blockers: string | null
  created_at: string
  profiles: {
    id: string
    name: string
    role: string
    team_id: string | null
    teams: { name: string } | null
  } | null
}

interface StandupClientProps {
  currentUser: Profile
  mySubmission: Standup | null
  todayStandups: Standup[]
  teamMembers: Profile[]
}

export function StandupClient({
  currentUser,
  mySubmission,
  todayStandups,
  teamMembers,
}: StandupClientProps) {
  const [state, formAction, isPending] = useActionState(submitStandup, null)
  
  // Admin Filter State
  const [selectedTeamFilter, setSelectedTeamFilter] = useState<string>('all')

  // Get unique teams from teamMembers for the Admin filter dropdown
  const uniqueTeams = Array.from(
    new Map(
      teamMembers
        .filter((m) => m.teams)
        .map((m) => [m.team_id, m.teams])
    ).entries()
  )

  // Filter team members and standups based on selected team filter (primarily for Admin view)
  const filteredMembers = teamMembers.filter((m) => {
    if (selectedTeamFilter === 'all') return true
    return m.team_id === selectedTeamFilter
  })

  const filteredStandups = todayStandups.filter((s) => {
    if (selectedTeamFilter === 'all') return true
    return s.profiles?.team_id === selectedTeamFilter
  })

  // Separate members who posted vs pending
  const postedUserIds = new Set(filteredStandups.map((s) => s.user_id))
  
  const pendingMembers = filteredMembers.filter(
    (member) => !postedUserIds.has(member.id)
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* LEFT COLUMN: Submit Standup Form (Takes 2 cols) */}
      <div className="lg:col-span-2 space-y-6">
        {mySubmission ? (
          /* Already Submitted Card */
          <Card className="border-green-200/80 shadow-md bg-green-50/10 overflow-hidden">
            <div className="h-1.5 bg-green-500" />
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Standup Logged
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                You have logged your updates for today. Excellent work!
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Did Yesterday
                </span>
                <p className="text-slate-700 bg-white border border-slate-200/60 p-3 rounded-lg text-xs leading-normal">
                  {mySubmission.did_yesterday}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Doing Today
                </span>
                <p className="text-slate-700 bg-white border border-slate-200/60 p-3 rounded-lg text-xs leading-normal">
                  {mySubmission.doing_today}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                  Blockers
                </span>
                {mySubmission.blockers ? (
                  <p className="text-red-700 bg-red-50/50 border border-red-150 p-3 rounded-lg text-xs leading-normal flex items-start gap-1.5">
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                    <span>{mySubmission.blockers}</span>
                  </p>
                ) : (
                  <p className="text-slate-400 text-xs italic">No blockers reported.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Submission Form */
          <Card className="border-slate-200 shadow-md">
            <div className="h-1.5 bg-[#0B1F3A]" />
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-bold text-[#0B1F3A] flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#C9952A]" />
                Daily Update
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Log your daily activity update to keep the squad in sync.
              </CardDescription>
            </CardHeader>

            <form action={formAction}>
              <CardContent className="space-y-4 pt-0">
                {state?.error && (
                  <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium">
                    {state.error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="didYesterday" className="text-xs font-bold text-slate-600">
                    What did you accomplish yesterday?
                  </Label>
                  <textarea
                    id="didYesterday"
                    name="didYesterday"
                    required
                    rows={4}
                    placeholder="Describe tasks completed, reviews requested, meetings held..."
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] bg-slate-50/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="doingToday" className="text-xs font-bold text-slate-600">
                    What are you working on today?
                  </Label>
                  <textarea
                    id="doingToday"
                    name="doingToday"
                    required
                    rows={4}
                    placeholder="Outline your priorities, commits planned, meetings scheduled..."
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] bg-slate-50/30"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="blockers" className="text-xs font-bold text-slate-600 flex items-center gap-1">
                    Workflow Blockers (Optional)
                  </Label>
                  <textarea
                    id="blockers"
                    name="blockers"
                    rows={2}
                    placeholder="Do you have any dependency locks, hardware issues, or support requests?"
                    className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] bg-slate-50/30"
                  />
                </div>
              </CardContent>

              <CardContent className="pt-0 pb-6">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-11 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold rounded-lg shadow-md border border-[#C9952A]/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-[#C9952A]" />
                      Logging update...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Submit Log
                    </>
                  )}
                </Button>
              </CardContent>
            </form>
          </Card>
        )}
      </div>

      {/* RIGHT COLUMN: Team Standups Feed (Takes 3 cols) */}
      <div className="lg:col-span-3 space-y-4">
        {/* Filters & Selector for Managers/Admin */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 select-none">
            <Users className="h-5 w-5 text-[#C9952A]" />
            <h3 className="font-bold text-[#0B1F3A] text-sm">Squad Updates</h3>
          </div>

          {currentUser.role === 'admin' && (
            <Select value={selectedTeamFilter} onValueChange={(val) => setSelectedTeamFilter(val || 'all')}>
              <SelectTrigger className="w-full sm:w-48 h-9 border-slate-200 text-xs">
                <SelectValue placeholder="Filter by Squad">
                  {(value) => {
                    if (value === 'all') return "All Squads"
                    const team = uniqueTeams.find(([id]) => id === value)
                    return team && team[1] ? team[1].name : "Filter by Squad"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Squads</SelectItem>
                {uniqueTeams.map(([teamId, teamObj]) => (
                  <SelectItem key={teamId} value={teamId!}>
                    {teamObj?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Posted vs Pending Tabs */}
        <Tabs defaultValue="posted" className="w-full">
          <TabsList className="grid grid-cols-2 w-full h-11 bg-slate-100 border border-slate-200/60 p-1 rounded-lg">
            <TabsTrigger value="posted" className="text-xs font-semibold cursor-pointer">
              Posted Today ({filteredStandups.length})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs font-semibold cursor-pointer">
              Pending ({pendingMembers.length})
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: Posted Today */}
          <TabsContent value="posted" className="mt-4 space-y-4 focus:outline-none">
            {filteredStandups.length > 0 ? (
              filteredStandups.map((standup) => (
                <Card key={standup.id} className="border-slate-200 shadow-sm overflow-hidden bg-white hover:shadow-md transition-shadow">
                  <CardHeader className="bg-slate-50/50 p-4 border-b border-slate-100 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[#0B1F3A] flex items-center justify-center font-bold text-xs text-white uppercase shrink-0 shadow-inner">
                        {standup.profiles?.name.substring(0, 2)}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-[#0B1F3A] truncate">
                          {standup.profiles?.name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] text-slate-400 font-semibold uppercase">
                            {standup.profiles?.role}
                          </span>
                          {standup.profiles?.teams?.name && (
                            <span className="text-[9px] text-[#C9952A] font-bold">
                              • {standup.profiles.teams.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <span className="text-[9px] text-slate-400 font-semibold">
                      {new Date(standup.created_at).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3.5 text-xs text-slate-700 leading-normal">
                    {/* Yesterday */}
                    <div>
                      <span className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wider block mb-0.5">
                        Did Yesterday
                      </span>
                      <p className="whitespace-pre-wrap">{standup.did_yesterday}</p>
                    </div>

                    {/* Today */}
                    <div>
                      <span className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wider block mb-0.5">
                        Doing Today
                      </span>
                      <p className="whitespace-pre-wrap">{standup.doing_today}</p>
                    </div>

                    {/* Blockers */}
                    {standup.blockers && (
                      <div className="bg-red-50 border border-red-150 p-2.5 rounded-lg text-red-800 flex items-start gap-1.5">
                        <AlertOctagon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-[9px] uppercase tracking-wider block text-red-700">
                            Blockers
                          </span>
                          <p className="mt-0.5 font-medium">{standup.blockers}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl py-12 px-4 text-center">
                <Activity className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-[#0B1F3A]">No updates logged today</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Check back later to see updates from your team members as they check in.
                </p>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: Pending Submission */}
          <TabsContent value="pending" className="mt-4 space-y-2.5 focus:outline-none">
            {pendingMembers.length > 0 ? (
              pendingMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-500 uppercase shrink-0">
                      {member.name.substring(0, 2)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs text-[#0B1F3A] truncate">{member.name}</span>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase">
                        {member.role}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] bg-amber-50 text-amber-600 border border-amber-100 rounded px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Pending
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl py-12 px-4 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm text-[#0B1F3A]">All squad members logged in!</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  Excellent! Everyone in your squad has successfully submitted their daily standup update.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
