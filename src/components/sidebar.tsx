'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/login/actions'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  KanbanSquare,
  Users,
  CalendarDays,
  FileText,
  TrendingUp,
  Settings,
  LogOut,
  Scale
} from 'lucide-react'
import { Button } from './ui/button'

interface SidebarProps {
  user: {
    name: string
    email: string
    role: 'admin' | 'lead' | 'intern'
    team_name?: string
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()

  const links = [
    {
      name: 'Dashboard',
      href: '/',
      icon: LayoutDashboard,
      roles: ['admin', 'lead', 'intern']
    },
    {
      name: 'Task Board',
      href: '/tasks',
      icon: KanbanSquare,
      roles: ['admin', 'lead', 'intern']
    },
    {
      name: 'People & Teams',
      href: '/people',
      icon: Users,
      roles: ['admin', 'lead', 'intern']
    },
    {
      name: 'Standup Log',
      href: '/standups',
      icon: FileText,
      roles: ['admin', 'lead', 'intern']
    },
    {
      name: 'Meetings & Attendance',
      href: '/meetings',
      icon: CalendarDays,
      roles: ['admin', 'lead', 'intern']
    },
    {
      name: 'Performance',
      href: '/performance',
      icon: TrendingUp,
      roles: ['admin', 'lead', 'intern']
    },
    {
      name: 'Admin Panel',
      href: '/admin',
      icon: Settings,
      roles: ['admin']
    }
  ]

  const filteredLinks = links.filter((link) => link.roles.includes(user.role))

  return (
    <aside className="w-64 bg-[#0B1F3A] text-white flex flex-col h-screen border-r border-[#C9952A]/10 select-none">
      {/* Brand Section */}
      <div className="p-6 border-b border-slate-700/40 flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg bg-[#C9952A]/15 border border-[#C9952A]/30 flex items-center justify-center text-[#C9952A]">
          <Scale className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-lg leading-tight tracking-wide">Turn2Law</span>
          <span className="text-xs text-slate-400 font-medium">Intern Tracker</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-[#C9952A]/10 text-[#C9952A] border-l-2 border-[#C9952A] pl-3.5"
                  : "text-slate-300 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn(
                "h-4 w-4 transition-transform group-hover:scale-110",
                isActive ? "text-[#C9952A]" : "text-slate-400 group-hover:text-white"
              )} />
              {link.name}
            </Link>
          )
        })}
      </nav>

      {/* User Info / Logout Section */}
      <div className="p-4 border-t border-slate-700/40 bg-black/10">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#C9952A] to-[#0B1F3A]/30 border border-[#C9952A]/30 flex items-center justify-center font-bold text-sm text-white shadow-inner uppercase">
            {user.name.substring(0, 2)}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-semibold text-sm truncate text-white leading-normal">{user.name}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider",
                user.role === 'admin' && "bg-red-500/20 text-red-300",
                user.role === 'lead' && "bg-amber-500/20 text-amber-300",
                user.role === 'intern' && "bg-green-500/20 text-green-300"
              )}>
                {user.role}
              </span>
              {user.team_name && (
                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">
                  {user.team_name}
                </span>
              )}
            </div>
          </div>
        </div>

        <form action={logout}>
          <Button
            type="submit"
            variant="ghost"
            className="w-full text-slate-400 hover:text-red-400 hover:bg-red-500/5 justify-start gap-3 px-3 h-10 transition-colors font-medium cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </aside>
  )
}
