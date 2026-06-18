'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, Calendar, Clock, Users, Video } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface MeetingCalendarProps {
  meetings: Meeting[]
  onSelectMeeting?: (meeting: Meeting) => void
}

export function MeetingCalendar({ meetings, onSelectMeeting }: MeetingCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Build a map of date-string -> meetings[] for quick lookup
  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {}
    meetings.forEach((meeting) => {
      const start = new Date(meeting.start_time)
      const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(meeting)
    })
    return map
  }, [meetings])

  // Generate calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDayOfWeek = firstDay.getDay() // 0=Sun
  const totalDays = lastDay.getDate()

  // Previous month fill days
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  const prefillDays = startDayOfWeek

  // Next month fill days
  const totalCells = Math.ceil((prefillDays + totalDays) / 7) * 7
  const postfillDays = totalCells - prefillDays - totalDays

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(todayKey)
  }

  // Selected date meetings
  const selectedMeetings = selectedDate ? (meetingsByDate[selectedDate] || []) : []

  // Count meetings this month
  const monthMeetingCount = useMemo(() => {
    return meetings.filter((m) => {
      const d = new Date(m.start_time)
      return d.getMonth() === month && d.getFullYear() === year
    }).length
  }, [meetings, month, year])

  return (
    <Card className="border-slate-200/80 shadow-md bg-white overflow-hidden">
      {/* Calendar Header */}
      <CardHeader className="p-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#0B1F3A] to-[#1a3355] flex items-center justify-center text-[#C9952A] shadow-sm">
              <Calendar className="h-4.5 w-4.5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-[#0B1F3A]">
                {monthNames[month]} {year}
              </CardTitle>
              <span className="text-[10px] text-slate-400 font-semibold">
                {monthMeetingCount} meeting{monthMeetingCount !== 1 ? 's' : ''} this month
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={goToPrevMonth}
              className="h-8 w-8 text-slate-500 hover:text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="h-8 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={goToNextMonth}
              className="h-8 w-8 text-slate-500 hover:text-[#0B1F3A] hover:bg-slate-50 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 sm:p-4">
        {/* Day of Week Headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-[9px] font-extrabold uppercase tracking-widest text-slate-400 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-px bg-slate-100/50 rounded-lg overflow-hidden border border-slate-100">
          {/* Previous month filler */}
          {Array.from({ length: prefillDays }).map((_, i) => {
            const day = prevMonthLastDay - prefillDays + 1 + i
            return (
              <div
                key={`prev-${i}`}
                className="bg-white p-1.5 sm:p-2 min-h-[52px] sm:min-h-[62px] relative"
              >
                <span className="text-[10px] font-semibold text-slate-300">{day}</span>
              </div>
            )
          })}

          {/* Current month days */}
          {Array.from({ length: totalDays }).map((_, i) => {
            const day = i + 1
            const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayMeetings = meetingsByDate[dateKey] || []
            const isToday = dateKey === todayKey
            const isSelected = dateKey === selectedDate
            const hasMeetings = dayMeetings.length > 0

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => setSelectedDate(dateKey === selectedDate ? null : dateKey)}
                className={cn(
                  'bg-white p-1.5 sm:p-2 min-h-[52px] sm:min-h-[62px] relative text-left transition-all focus:outline-none group',
                  isSelected && 'bg-[#0B1F3A]/[0.03] ring-1 ring-inset ring-[#C9952A]/30',
                  hasMeetings && !isSelected && 'hover:bg-slate-50/80',
                  !hasMeetings && 'hover:bg-slate-50/40',
                  'cursor-pointer'
                )}
              >
                <span
                  className={cn(
                    'text-[10px] sm:text-[11px] font-bold inline-flex items-center justify-center h-5 w-5 rounded-full transition-colors',
                    isToday && 'bg-[#0B1F3A] text-white',
                    isSelected && !isToday && 'bg-[#C9952A]/15 text-[#C9952A]',
                    !isToday && !isSelected && 'text-slate-600 group-hover:text-[#0B1F3A]'
                  )}
                >
                  {day}
                </span>

                {/* Meeting Dots */}
                {hasMeetings && (
                  <div className="mt-0.5 flex flex-wrap gap-0.5">
                    {dayMeetings.slice(0, 3).map((m, idx) => (
                      <div
                        key={m.id}
                        className={cn(
                          'h-1.5 rounded-full transition-all',
                          idx === 0 && 'bg-[#C9952A] w-full max-w-[28px]',
                          idx === 1 && 'bg-[#0B1F3A]/40 w-full max-w-[20px]',
                          idx === 2 && 'bg-emerald-400 w-full max-w-[14px]'
                        )}
                        title={m.title}
                      />
                    ))}
                    {dayMeetings.length > 3 && (
                      <span className="text-[8px] font-bold text-slate-400 leading-none mt-0.5">
                        +{dayMeetings.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            )
          })}

          {/* Next month filler */}
          {Array.from({ length: postfillDays }).map((_, i) => (
            <div
              key={`next-${i}`}
              className="bg-white p-1.5 sm:p-2 min-h-[52px] sm:min-h-[62px] relative"
            >
              <span className="text-[10px] font-semibold text-slate-300">{i + 1}</span>
            </div>
          ))}
        </div>

        {/* Selected Date Meeting Details */}
        {selectedDate && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
              <Badge variant="secondary" className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0">
                {selectedMeetings.length} event{selectedMeetings.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {selectedMeetings.length > 0 ? (
              <div className="space-y-2">
                {selectedMeetings.map((meeting) => {
                  const start = new Date(meeting.start_time)
                  const end = new Date(meeting.end_time)
                  const isPast = end < new Date()

                  return (
                    <div
                      key={meeting.id}
                      onClick={() => onSelectMeeting?.(meeting)}
                      className={cn(
                        'p-3 rounded-lg border transition-all group/card',
                        isPast
                          ? 'bg-slate-50/50 border-slate-100 hover:border-slate-200'
                          : 'bg-gradient-to-r from-[#C9952A]/[0.04] to-[#0B1F3A]/[0.02] border-[#C9952A]/15 hover:border-[#C9952A]/30',
                        onSelectMeeting && 'cursor-pointer'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-bold text-xs text-[#0B1F3A] truncate group-hover/card:text-[#C9952A] transition-colors">
                            {meeting.title}
                          </h5>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              {start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              {' – '}
                              {end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {meeting.teams ? meeting.teams.name : 'All-Hands'}
                            </span>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            'text-[8px] font-bold uppercase tracking-wider px-1.5 py-0 shrink-0',
                            isPast
                              ? 'bg-slate-100 text-slate-500 border-none'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          )}
                        >
                          {isPast ? 'Done' : 'Upcoming'}
                        </Badge>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-xs text-slate-400 font-medium select-none">
                No meetings on this date
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
