'use client'

import { useActionState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Mail, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, null)

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Background brand decorative shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#0B1F3A]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#C9952A]/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-white flex items-center justify-center shadow-lg mb-3 border border-[#C9952A]/20 transition-transform duration-300 hover:rotate-6 p-1.5 shrink-0">
            <img src="/logo.png" alt="Turn2Law Logo" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-[#0B1F3A] tracking-tight">Turn2Law</h1>
          <p className="text-sm text-slate-500 font-medium">Intern Tracker & Performance Suite</p>
        </div>

        {/* Login Card */}
        <Card className="border-slate-200/80 shadow-xl overflow-hidden backdrop-blur-sm bg-white/95">
          <div className="h-1.5 bg-gradient-to-r from-[#0B1F3A] via-[#C9952A] to-[#0B1F3A]" />
          
          <CardHeader className="space-y-1 pt-6 pb-4">
            <CardTitle className="text-xl font-bold text-[#0B1F3A] text-center">Sign In</CardTitle>
            <CardDescription className="text-center text-slate-400">
              Enter your credentials to access your workspace.
            </CardDescription>
          </CardHeader>
          
          <form action={formAction}>
            <CardContent className="space-y-4 pt-0">
              {state?.error && (
                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium text-center animate-shake">
                  {state.error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="name@turn2law.com"
                    className="pl-10 h-11 border-slate-200 focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] transition-all bg-slate-50/50"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10 h-11 border-slate-200 focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] transition-all bg-slate-50/50"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="pt-2 pb-6">
              <Button
                type="submit"
                disabled={isPending}
                className="w-full h-11 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-medium rounded-lg transition-colors border border-[#C9952A]/20 shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
            </CardFooter>
          </form>
        </Card>

        {/* Footer Notice */}
        <div className="mt-8 text-center text-xs text-slate-400 font-medium">
          <p>Protected by Turn2Law internal security guidelines.</p>
          <p className="mt-1">For account creation or credential resets, please contact your Admin.</p>
        </div>
      </div>
    </main>
  )
}
