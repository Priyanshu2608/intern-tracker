'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Calendar, Shield, Menu } from 'lucide-react'
import { Button } from './ui/button'
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet'
import { Sidebar } from './sidebar'

interface TopbarProps {
  user: {
    id: string
    name: string
    email: string
    role: 'admin' | 'lead' | 'intern'
    team_id?: string | null
    team_name?: string
  }
}

export function Topbar({ user }: TopbarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Automatically close mobile menu when navigating
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const todayLong = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const todayShort = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 md:px-8 select-none">
      {/* Left side: Hamburger Trigger + Context and Greeting */}
      <div className="flex items-center gap-2 md:gap-4 min-w-0">
        {/* Mobile Sidebar Hamburger Menu */}
        <div className="md:hidden shrink-0">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  className="h-10 w-10 text-slate-600 hover:bg-slate-100 hover:text-[#0B1F3A] rounded-lg p-0 flex items-center justify-center cursor-pointer"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              }
            />
            <SheetContent side="left" className="p-0 w-64 bg-[#0B1F3A] border-r-0">
              <Sidebar user={user} className="w-full h-full border-r-0" />
            </SheetContent>
          </Sheet>
        </div>

        <h2 className="font-semibold text-slate-800 text-xs sm:text-sm md:text-base truncate">
          Welcome, <span className="text-[#0B1F3A] font-bold">{user.name.split(' ')[0]}</span>
        </h2>
        <div className="hidden sm:flex items-center gap-1 text-[10px] md:text-xs text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100 shrink-0">
          <Shield className="h-3.5 w-3.5 text-[#C9952A]" />
          <span className="capitalize">{user.role === 'admin' ? 'Manager' : user.role} Portal</span>
        </div>
      </div>

      {/* Right side: Squad & Date info */}
      <div className="flex items-center gap-2 md:gap-4 shrink-0">
        {user.team_name && (
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs text-slate-600 font-semibold shadow-sm max-w-[100px] sm:max-w-none">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="truncate">{user.team_name}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-slate-500 text-[10px] sm:text-xs font-semibold bg-slate-50 border border-slate-100 rounded-lg px-2.5 py-1.5 shadow-sm">
          <Calendar className="h-3.5 w-3.5 text-[#0B1F3A] shrink-0" />
          <span className="hidden sm:inline">{todayLong}</span>
          <span className="inline sm:hidden">{todayShort}</span>
        </div>
      </div>
    </header>
  )
}
