import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/sidebar'
import { Topbar } from '@/components/topbar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Get current auth user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Query user profile with team association from public schema
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*, teams(name)')
    .eq('id', user.id)
    .maybeSingle()

  if (error || !profile) {
    console.error('Error fetching profile:', error)
    // Sign out to clean up session
    await supabase.auth.signOut()
    redirect('/login?error=profile_not_found')
  }

  // 3. Security: Check if user is deactivated
  if (profile.status === 'inactive') {
    await supabase.auth.signOut()
    redirect('/login?error=account_deactivated')
  }

  // Map profile data
  const userData = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as 'admin' | 'lead' | 'intern',
    team_id: profile.team_id,
    team_name: profile.teams?.name || undefined,
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      {/* Persistent Left Sidebar - hidden on mobile */}
      <Sidebar user={userData} className="hidden md:flex shrink-0" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Topbar user={userData} />

        {/* Dynamic Page Scroll Container */}
        <main className="flex-1 overflow-y-auto px-4 py-4 md:px-8 md:py-6 relative focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}
