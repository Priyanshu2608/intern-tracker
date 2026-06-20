'use client'

import { useActionState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <main className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      {/* LEFT SIDEBAR: Brand Panel */}
      <div className="w-full md:w-2/5 bg-[#0B1F3A] text-white flex flex-col justify-between p-8 md:p-12 relative overflow-hidden shrink-0 border-b md:border-b-0 md:border-r border-[#C9952A]/20">
        {/* Background Gradients */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#C9952A]/10 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none" />
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3.5 z-10 select-none">
          <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border border-[#C9952A]/30 p-1.5 shrink-0 shadow-md">
            <img src="/logo.png" alt="Turn2Law Logo" className="h-full w-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl leading-none tracking-wide text-white">Turn2Law</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Intern Tracker</span>
          </div>
        </div>

        {/* Big Brand Text */}
        <div className="my-auto py-12 md:py-0 z-10 space-y-4">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight tracking-tight">
            Streamline your <span className="text-[#C9952A]">squad workflow</span> and performance logs.
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed font-medium max-w-sm">
            Access your personalized portal to manage task boards, submit daily updates, and view team milestones.
          </p>
        </div>

        {/* Footer info in sidebar */}
        <div className="z-10 text-xs text-slate-400 font-medium space-y-1 select-none">
          <p>© {new Date().getFullYear()} Turn2Law. All rights reserved.</p>
          <p>Protected under internal security guidelines.</p>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 md:p-16 lg:p-24 bg-slate-50 relative overflow-hidden">
        {/* Background blobs for right side */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#C9952A]/5 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl pointer-events-none" />
        
        <div className="w-full max-w-md z-10">
          {/* Sign In Form Header */}
          <div className="mb-8 space-y-2 select-none">
            <h1 className="text-3xl font-extrabold text-center text-[#0B1F3A] tracking-tight">
              Sign In
            </h1>
            <p className="text-sm text-center text-slate-500 font-medium">
              Enter your credentials below to access your workspace.
            </p>
          </div>

          {/* Form */}
          <form action={formAction} className="bg-white border border-slate-200/80 p-8 rounded-2xl shadow-xl space-y-5">
            {state?.error && (
              <div className="p-3.5 text-xs bg-red-50 border border-red-200 text-red-600 rounded-xl font-medium text-center animate-shake">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="name@turn2law.com"
                  className="pl-11 h-12 border-slate-200 focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] rounded-xl transition-all bg-slate-50/40"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-12 border-slate-200 focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] rounded-xl transition-all bg-slate-50/40"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isPending}
              className="w-full h-12 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold rounded-xl transition-all border border-[#C9952A]/20 shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-[#C9952A]" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Footer Helper Notice */}
          <div className="mt-8 text-center text-xs text-slate-400 font-semibold space-y-1 select-none">
            <p>For account creation or credential resets, please contact your Admin.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
