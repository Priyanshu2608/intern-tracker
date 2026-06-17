'use client'

import { useActionState } from 'react'
import { resetPassword } from '../login/actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, ShieldAlert, Loader2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const [state, formAction, isPending] = useActionState(resetPassword, null)

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#0B1F3A]/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#C9952A]/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-12 w-12 rounded-xl bg-[#C9952A]/10 flex items-center justify-center text-[#C9952A] shadow-md mb-3 border border-[#C9952A]/20">
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#0B1F3A] tracking-tight">Security Update</h1>
          <p className="text-sm text-slate-500 font-medium">Turn2Law Intern Tracker</p>
        </div>

        <Card className="border-slate-200/80 shadow-xl overflow-hidden backdrop-blur-sm bg-white/95">
          <div className="h-1.5 bg-[#C9952A]" />
          
          <CardHeader className="space-y-1 pt-6 pb-4">
            <CardTitle className="text-xl font-bold text-[#0B1F3A] text-center flex items-center justify-center gap-2">
              <ShieldAlert className="h-5 w-5 text-[#C9952A]" />
              Reset Password
            </CardTitle>
            <CardDescription className="text-center text-slate-500 text-sm">
              Your administrator has flagged this account for a required password update before accessing the dashboard.
            </CardDescription>
          </CardHeader>
          
          <form action={formAction}>
            <CardContent className="space-y-4 pt-0">
              {state?.error && (
                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium text-center">
                  {state.error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  New Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="At least 6 characters"
                  className="h-11 border-slate-200 focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] transition-all bg-slate-50/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  className="h-11 border-slate-200 focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A] transition-all bg-slate-50/50"
                  required
                />
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
                    Saving Changes...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
