'use client'

import { Calendar, Shield, MapPin } from 'lucide-react'
import { Badge } from './ui/badge'

interface TopbarProps {
  user: {
    name: string
    role: 'admin' | 'lead' | 'intern'
    team_name?: string
  }
}

export function Topbar({ user }: TopbarProps) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 select-none">
      {/* Left side: Context and Greeting */}
      <div className="flex items-center gap-4">
        <h2 className="font-semibold text-slate-800 text-sm md:text-base">
          Welcome back, <span className="text-[#0B1F3A] font-bold">{user.name}</span>
        </h2>
        <div className="hidden md:flex items-center gap-1 text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100">
          <Shield className="h-3.5 w-3.5 text-[#C9952A]" />
          <span className="capitalize">{user.role} Portal</span>
        </div>
      </div>

      {/* Right side: Squad & Date info */}
      <div className="flex items-center gap-4">
        {user.team_name && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-3 py-1 text-xs text-slate-600 font-semibold shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>{user.team_name}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-[#0B1F3A]" />
          <span>{today}</span>
        </div>
      </div>
    </header>
  )
}
