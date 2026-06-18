'use client'

import { useState, useActionState, useTransition } from 'react'
import { scheduleMeeting, markAttendance } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Clock,
  Plus,
  Users,
  Video,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  HelpCircle,
  Loader2,
  CalendarCheck,
  Award
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Team {
  id: string
  name: string
}

interface Profile {
  id: string
  name: string
  role: 'admin' | 'lead' | 'intern'
  team_id: string | null
  teams: { name: string } | null
}

interface Meeting {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  team_id: string | null
  created_by: string | null
  created_at: string
  teams: { name: string } | null
}

interface AttendanceRecord {
  id: string
  meeting_id: string
  user_id: string
  status: 'present' | 'absent' | 'excused'
  updated_at: string
  profiles: {
    name: string
    role: string
    team_id: string | null
  } | null
}

interface MeetingsClientProps {
  currentUser: Profile
  meetings: Meeting[]
  attendance: AttendanceRecord[]
  members: Profile[]
  teams: Team[]
}

export function MeetingsClient({
  currentUser,
  meetings,
  attendance,
  members,
  teams,
}: MeetingsClientProps) {
  const [state, formAction, isPendingForm] = useActionState(scheduleMeeting, null)
  const [isPendingAttendance, startAttendanceTransition] = useTransition()

  // Selection states
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(
    meetings.length > 0 ? meetings[0] : null
  )

  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Map attendance status quickly
  const getAttendanceStatus = (meetingId: string, userId: string) => {
    const record = attendance.find(
      (a) => a.meeting_id === meetingId && a.user_id === userId
    )
    return record?.status || null
  }

  // Handle marking attendance
  const handleMarkAttendance = (userId: string, status: 'present' | 'absent' | 'excused') => {
    if (!selectedMeeting) return

    startAttendanceTransition(async () => {
      try {
        await markAttendance(selectedMeeting.id, userId, status)
      } catch (err: any) {
        alert(err.message || 'Failed to update attendance.')
      }
    })
  }

  // Form submit handler
  const handleScheduleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)
    const res = await scheduleMeeting(null, formData)

    setIsSubmitting(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setIsScheduleOpen(false)
      e.currentTarget.reset()
    }
  }

  // Calculate stats for current Intern
  const isIntern = currentUser.role === 'intern'
  const isManager = currentUser.role === 'admin' || currentUser.role === 'lead'

  // Filter meetings that the intern should have attended
  const internMeetings = meetings.filter(
    (m) => m.team_id === currentUser.team_id || m.team_id === null
  )
  const internAttendance = attendance.filter((a) => a.user_id === currentUser.id)
  
  const presentCount = internAttendance.filter((a) => a.status === 'present').length
  const excusedCount = internAttendance.filter((a) => a.status === 'excused').length
  const absentCount = internAttendance.filter((a) => a.status === 'absent').length
  
  const attendanceRate =
    internMeetings.length > 0
      ? Math.round(
          ((presentCount + excusedCount) / internMeetings.length) * 100
        )
      : 100

  return (
    <div className="space-y-6">
      {/* 1. Header & Stats Widget */}
      {isIntern && (
        <Card className="border-slate-200/80 shadow-sm bg-gradient-to-r from-[#0B1F3A]/5 to-[#C9952A]/5 overflow-hidden">
          <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#0B1F3A] flex items-center justify-center text-[#C9952A] border border-[#C9952A]/20 shadow-md">
                <Award className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-[#0B1F3A] text-sm md:text-base">Your Attendance Score</h3>
                <p className="text-xs text-slate-400 font-medium">Excused absences do not count against your rate.</p>
              </div>
            </div>

            <div className="flex items-center gap-6 divide-x divide-slate-200">
              <div className="text-center px-4">
                <span className="text-2xl font-bold text-[#0B1F3A]">{attendanceRate}%</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mt-0.5">Rate</span>
              </div>
              <div className="text-center px-6">
                <span className="text-xl font-bold text-green-600">{presentCount}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mt-0.5">Present</span>
              </div>
              <div className="text-center px-6">
                <span className="text-xl font-bold text-amber-600">{excusedCount}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mt-0.5">Excused</span>
              </div>
              <div className="text-center px-6">
                <span className="text-xl font-bold text-red-500">{absentCount}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold mt-0.5">Absent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 2. Action Panel */}
      {isManager && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-[#C9952A]" />
            <h3 className="font-bold text-[#0B1F3A] text-sm">Schedule & Track</h3>
          </div>
          <Button
            onClick={() => setIsScheduleOpen(true)}
            className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold h-10 border border-[#C9952A]/20 gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4 text-[#C9952A]" />
            Schedule Meeting
          </Button>
        </div>
      )}

      {/* 3. Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column: Meetings list (Takes 2 cols) - hidden on mobile when a meeting is selected */}
        <div className={cn(
          "lg:col-span-2 space-y-3",
          selectedMeeting ? "hidden lg:block" : "block"
        )}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block select-none">
            Timeline
          </span>

          {meetings.length > 0 ? (
            <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-16rem)]">
              {meetings.map((meeting) => {
                const start = new Date(meeting.start_time)
                const isSelected = selectedMeeting?.id === meeting.id

                return (
                  <Card
                    key={meeting.id}
                    onClick={() => setSelectedMeeting(meeting)}
                    className={cn(
                      "border-slate-200/80 shadow-sm hover:shadow transition-all cursor-pointer overflow-hidden relative",
                      isSelected
                        ? "border-[#C9952A] bg-slate-50/30 ring-1 ring-[#C9952A]/10"
                        : "bg-white"
                    )}
                  >
                    {isSelected && <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#C9952A]" />}
                    <CardHeader className="p-4 flex flex-row items-center gap-3 justify-between pb-3 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-[#0B1F3A]/5 border border-[#0B1F3A]/10 text-[#0B1F3A] flex flex-col items-center justify-center shrink-0 text-center">
                          <span className="text-[9px] font-extrabold uppercase text-slate-400 leading-none">
                            {start.toLocaleDateString('en-US', { weekday: 'short' })}
                          </span>
                          <span className="text-sm font-extrabold mt-0.5 leading-none">
                            {start.getDate()}
                          </span>
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="font-bold text-xs text-[#0B1F3A] truncate leading-snug">
                            {meeting.title}
                          </h4>
                          <span className="text-[9px] text-slate-400 font-semibold mt-0.5">
                            {meeting.teams ? meeting.teams.name : 'All-Hands Sync'}
                          </span>
                        </div>
                      </div>

                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-wider px-2 py-0",
                          new Date(meeting.end_time) < new Date()
                            ? "bg-slate-100 text-slate-600"
                            : "bg-amber-50 text-amber-700 border border-amber-100 animate-pulse"
                        )}
                      >
                        {new Date(meeting.end_time) < new Date() ? 'Finished' : 'Upcoming'}
                      </Badge>
                    </CardHeader>

                    <CardContent className="p-4 pt-3 text-[11px] text-slate-500 font-medium flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {start.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          -{' '}
                          {new Date(meeting.end_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="border-slate-200 py-12 text-center">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-[#0B1F3A]">No meetings scheduled</h4>
            </Card>
          )}
        </div>

        {/* Right Column: Attendance detail (Takes 3 cols) - hidden on mobile when no meeting is selected */}
        <div className={cn(
          "lg:col-span-3 space-y-3",
          selectedMeeting ? "block" : "hidden lg:block"
        )}>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block select-none">
            Attendance Log
          </span>

          {selectedMeeting ? (
            <Card className="border-slate-200/80 shadow-md bg-white">
              <CardHeader className="border-b border-slate-100 pb-4">
                {/* Mobile Back Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMeeting(null)}
                  className="lg:hidden -ml-2 mb-2 h-8 text-xs text-slate-500 hover:text-[#0B1F3A] hover:bg-slate-55 flex items-center gap-1 cursor-pointer w-fit"
                >
                  ← Back to Meetings
                </Button>

                <CardTitle className="text-base font-bold text-[#0B1F3A]">
                  {selectedMeeting.title}
                </CardTitle>
                {selectedMeeting.description && (
                  <CardDescription className="text-xs mt-1 text-slate-500 whitespace-pre-wrap leading-relaxed">
                    {selectedMeeting.description}
                  </CardDescription>
                )}
                <div className="flex items-center gap-4 text-xs text-slate-400 font-semibold pt-2">
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {new Date(selectedMeeting.start_time).toLocaleDateString()}{' '}
                      at{' '}
                      {new Date(selectedMeeting.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      {selectedMeeting.teams ? selectedMeeting.teams.name : 'All-Hands'}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-0">
                <div className="divide-y divide-slate-100 max-h-[calc(100vh-22rem)] overflow-y-auto">
                  {members.map((member) => {
                    const status = getAttendanceStatus(selectedMeeting.id, member.id)

                    return (
                      <div
                        key={member.id}
                        className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[10px] text-slate-500 uppercase shrink-0">
                            {member.name.substring(0, 2)}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-xs text-[#0B1F3A] truncate">{member.name}</span>
                            <span className="text-[8px] text-slate-400 font-semibold uppercase">
                              {member.role}
                            </span>
                          </div>
                        </div>

                        {/* Interactive triggers for managers, badge for interns */}
                        {isManager ? (
                          <div className="flex items-center gap-1 select-none">
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPendingAttendance}
                              onClick={() => handleMarkAttendance(member.id, 'present')}
                              className={cn(
                                "h-8 px-2 sm:px-2.5 text-[10px] font-bold uppercase rounded cursor-pointer flex items-center justify-center gap-1 min-w-[32px]",
                                status === 'present'
                                  ? "bg-green-100 text-green-800 hover:bg-green-150"
                                  : "text-slate-400 hover:bg-slate-50"
                              )}
                              title="Present"
                            >
                              <span className="hidden sm:inline">Present</span>
                              <UserCheck className="h-4 w-4 sm:hidden" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPendingAttendance}
                              onClick={() => handleMarkAttendance(member.id, 'excused')}
                              className={cn(
                                "h-8 px-2 sm:px-2.5 text-[10px] font-bold uppercase rounded cursor-pointer flex items-center justify-center gap-1 min-w-[32px]",
                                status === 'excused'
                                  ? "bg-amber-100 text-amber-800 hover:bg-amber-150"
                                  : "text-slate-400 hover:bg-slate-50"
                              )}
                              title="Excused"
                            >
                              <span className="hidden sm:inline">Excused</span>
                              <Clock className="h-4 w-4 sm:hidden" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPendingAttendance}
                              onClick={() => handleMarkAttendance(member.id, 'absent')}
                              className={cn(
                                "h-8 px-2 sm:px-2.5 text-[10px] font-bold uppercase rounded cursor-pointer flex items-center justify-center gap-1 min-w-[32px]",
                                status === 'absent'
                                  ? "bg-red-100 text-red-800 hover:bg-red-150"
                                  : "text-slate-400 hover:bg-slate-50"
                              )}
                              title="Absent"
                            >
                              <span className="hidden sm:inline">Absent</span>
                              <XCircle className="h-4 w-4 sm:hidden" />
                            </Button>
                          </div>
                        ) : (
                          <div className="shrink-0">
                            {status === 'present' && (
                              <Badge className="bg-green-100 text-green-800 border-none font-bold uppercase text-[9px] tracking-wide">
                                Present
                              </Badge>
                            )}
                            {status === 'excused' && (
                              <Badge className="bg-amber-100 text-amber-800 border-none font-bold uppercase text-[9px] tracking-wide">
                                Excused
                              </Badge>
                            )}
                            {status === 'absent' && (
                              <Badge className="bg-red-100 text-red-800 border-none font-bold uppercase text-[9px] tracking-wide">
                                Absent
                              </Badge>
                            )}
                            {!status && (
                              <span className="text-[10px] text-slate-400 font-semibold italic">
                                Unmarked
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-slate-200 py-12 text-center">
              <Calendar className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-sm text-[#0B1F3A]">Select a meeting to view details</h4>
            </Card>
          )}
        </div>
      </div>

      {/* ==================== SCHEDULE MEETING DIALOG ==================== */}
      <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0B1F3A]">Schedule Meeting</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Set up a review meeting or checkpoint for squad.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleScheduleSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold text-slate-600">Meeting Title</Label>
              <Input id="title" name="title" required placeholder="e.g. Weekly Standup & Blockers Review" className="h-10 border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold text-slate-600">Description / Agenda (Optional)</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Details or video call URL link..."
                className="w-full border border-slate-200 rounded-lg p-2.5 text-xs outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startTime" className="text-xs font-bold text-slate-600">Start Date & Time</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="datetime-local"
                  required
                  className="h-10 border-slate-200 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endTime" className="text-xs font-bold text-slate-600">End Date & Time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="datetime-local"
                  required
                  className="h-10 border-slate-200 cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teamId" className="text-xs font-bold text-slate-600">Scope</Label>
              <Select name="teamId" defaultValue="">
                <SelectTrigger className="h-10 border-slate-200">
                  <SelectValue placeholder="All-Hands (Company-Wide)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All-Hands (Company-Wide)</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsScheduleOpen(false)} className="h-10 border-slate-200 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-10 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold cursor-pointer">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-[#C9952A]" /> : 'Create Meeting'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
