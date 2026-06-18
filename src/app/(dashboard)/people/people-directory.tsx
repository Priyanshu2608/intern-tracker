'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleUserStatus, createUser, editUser, adminResetPassword, createTeam } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  Search,
  UserPlus,
  Plus,
  Edit2,
  KeyRound,
  ShieldAlert,
  Loader2,
  UserCheck,
  UserX,
  Users
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Team {
  id: string
  name: string
}

interface Profile {
  id: string
  email: string
  name: string
  role: 'admin' | 'lead' | 'intern'
  team_id: string | null
  status: 'active' | 'inactive'
  must_reset_password: boolean
  teams: Team | null
}

interface PeopleDirectoryProps {
  initialProfiles: Profile[]
  teams: Team[]
  isAdmin: boolean
}

export function PeopleDirectory({ initialProfiles, teams, isAdmin }: PeopleDirectoryProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')
  const [selectedTeam, setSelectedTeam] = useState<string>('all')

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreateTeamOpen, setIsCreateTeamOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isPasswordResetOpen, setIsPasswordResetOpen] = useState(false)

  // Selected User for Edit/Password Reset
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  // Form errors/status
  const [errorMsg, setErrorMsg] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filter profiles based on search and selected options
  const filteredProfiles = initialProfiles.filter((profile) => {
    const matchesSearch =
      profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      profile.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = selectedRole === 'all' || profile.role === selectedRole
    const matchesTeam =
      selectedTeam === 'all' ||
      (selectedTeam === 'none' && !profile.team_id) ||
      profile.team_id === selectedTeam

    return matchesSearch && matchesRole && matchesTeam
  })

  // Handle User Status toggle (Active / Inactive)
  const handleToggleStatus = (userId: string, currentStatus: string) => {
    startTransition(async () => {
      try {
        await toggleUserStatus(userId, currentStatus)
      } catch (err: any) {
        alert(err.message || 'Failed to update user status.')
      }
    })
  }

  // Submit User Creation
  const handleCreateUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const res = await createUser(null, formData)

    setIsSubmitting(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setIsCreateOpen(false)
      // reset form
      e.currentTarget.reset()
    }
  }

  // Submit User Edit
  const handleEditUserSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    if (selectedUser) {
      formData.append('userId', selectedUser.id)
    }
    const res = await editUser(null, formData)

    setIsSubmitting(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setIsEditOpen(false)
      setSelectedUser(null)
    }
  }

  // Submit Password Reset
  const handlePasswordResetSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    if (selectedUser) {
      formData.append('userId', selectedUser.id)
    }
    const res = await adminResetPassword(null, formData)

    setIsSubmitting(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setIsPasswordResetOpen(false)
      setSelectedUser(null)
      alert('Password reset successfully. User will be forced to change it upon next login.')
    }
  }

  // Submit Team Creation
  const handleCreateTeamSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setIsSubmitting(true)

    const formData = new FormData(e.currentTarget)
    const res = await createTeam(null, formData)

    setIsSubmitting(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setIsCreateTeamOpen(false)
      e.currentTarget.reset()
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Admin Action bar & Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 border-slate-200 focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]"
              />
            </div>

            <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val || 'all')}>
              <SelectTrigger className="w-full sm:w-40 h-10 border-slate-200">
                <SelectValue placeholder="Role">
                  {(value) => {
                    if (value === 'all') return "All Roles"
                    return value ? value.charAt(0).toUpperCase() + value.slice(1) : "Role"
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {isAdmin && <SelectItem value="admin">Admin</SelectItem>}
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
              </SelectContent>
            </Select>

            {isAdmin && (
              <Select value={selectedTeam} onValueChange={(val) => setSelectedTeam(val || 'all')}>
                <SelectTrigger className="w-full sm:w-44 h-10 border-slate-200">
                  <SelectValue placeholder="Squad / Team">
                    {(value) => {
                      if (value === 'all') return "All Teams"
                      if (value === 'none') return "No Team Assigned"
                      const selectedTeamObj = teams.find((t) => t.id === value)
                      return selectedTeamObj ? selectedTeamObj.name : "Squad / Team"
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Teams</SelectItem>
                  <SelectItem value="none">No Team Assigned</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Admin action triggers */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setIsCreateTeamOpen(true)}
                variant="outline"
                className="h-10 border-[#C9952A]/35 text-[#C9952A] hover:bg-[#C9952A]/5 font-semibold gap-1.5 cursor-pointer"
              >
                <Users className="h-4 w-4" />
                New Squad
              </Button>
              <Button
                onClick={() => setIsCreateOpen(true)}
                className="h-10 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold gap-1.5 border border-[#C9952A]/20 cursor-pointer"
              >
                <UserPlus className="h-4 w-4 text-[#C9952A]" />
                Add User
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Directory Table */}
      <Card className="border-slate-200/80 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-500 text-xs font-bold uppercase tracking-wider select-none">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Role</th>
                  <th className="py-4 px-6">Squad</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Forced Reset</th>
                  {isAdmin && <th className="py-4 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProfiles.length > 0 ? (
                  filteredProfiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        profile.status === 'inactive' && "opacity-60 bg-slate-50/20"
                      )}
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0B1F3A] to-slate-400 border border-slate-200 flex items-center justify-center font-bold text-sm text-white uppercase shrink-0 shadow-inner">
                          {profile.name.substring(0, 2)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold text-[#0B1F3A] truncate">{profile.name}</span>
                          <span className="text-xs text-slate-400 truncate font-medium">{profile.email}</span>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="py-4 px-6">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                            profile.role === 'admin' && "bg-red-50 text-red-700 border border-red-150",
                            profile.role === 'lead' && "bg-amber-50 text-amber-700 border border-amber-150",
                            profile.role === 'intern' && "bg-green-50 text-green-700 border border-green-150"
                          )}
                        >
                          {profile.role}
                        </Badge>
                      </td>

                      {/* Squad */}
                      <td className="py-4 px-6">
                        {profile.teams ? (
                          <span className="font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-1 rounded text-xs">
                            {profile.teams.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic font-medium">None</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5",
                            profile.status === 'active'
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          )}
                        >
                          {profile.status}
                        </Badge>
                      </td>

                      {/* Password Change Flag */}
                      <td className="py-4 px-6">
                        {profile.must_reset_password ? (
                          <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                            Required
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs font-semibold">Cleared</span>
                        )}
                      </td>

                      {/* Admin Actions */}
                      {isAdmin && (
                        <td className="py-4 px-6 text-right shrink-0">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle active / inactive */}
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => handleToggleStatus(profile.id, profile.status)}
                              title={profile.status === 'active' ? 'Deactivate Account' : 'Activate Account'}
                              className={cn(
                                "h-8 w-8 cursor-pointer",
                                profile.status === 'active' ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-500 hover:text-green-600 hover:bg-green-50"
                              )}
                            >
                              {profile.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>

                            {/* Edit Profile */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(profile)
                                setIsEditOpen(true)
                              }}
                              title="Edit Profile"
                              className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>

                            {/* Reset Password */}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setSelectedUser(profile)
                                setIsPasswordResetOpen(true)
                              }}
                              title="Reset Password"
                              className="h-8 w-8 text-[#C9952A] hover:text-[#C9952A]/90 hover:bg-[#C9952A]/5 cursor-pointer"
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="py-12 text-center text-slate-400 font-medium">
                      No team members found matching search filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="block md:hidden divide-y divide-slate-100 select-none">
            {filteredProfiles.length > 0 ? (
              filteredProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className={cn(
                    "p-4 flex flex-col gap-3 hover:bg-slate-50/50 transition-colors",
                    profile.status === 'inactive' && "opacity-60 bg-slate-50/20"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#0B1F3A] to-slate-400 border border-slate-200 flex items-center justify-center font-bold text-sm text-white uppercase shrink-0 shadow-inner">
                      {profile.name.substring(0, 2)}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-[#0B1F3A] truncate">{profile.name}</span>
                      <span className="text-xs text-slate-400 truncate font-medium">{profile.email}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5",
                        profile.role === 'admin' && "bg-red-50 text-red-700 border border-red-150",
                        profile.role === 'lead' && "bg-amber-50 text-amber-700 border border-amber-150",
                        profile.role === 'intern' && "bg-green-50 text-green-700 border border-green-150"
                      )}
                    >
                      {profile.role}
                    </Badge>

                    {profile.teams ? (
                      <span className="font-bold text-slate-650 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[9px] uppercase">
                        {profile.teams.name}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[9px] font-bold uppercase italic">No Squad</span>
                    )}

                    <Badge
                      variant="secondary"
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5",
                        profile.status === 'active'
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      )}
                    >
                      {profile.status}
                    </Badge>

                    {profile.must_reset_password && (
                      <span className="text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider animate-pulse">
                        Reset Required
                      </span>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={isPending}
                        onClick={() => handleToggleStatus(profile.id, profile.status)}
                        className={cn(
                          "h-8 px-2.5 text-xs font-semibold gap-1.5 cursor-pointer rounded-lg",
                          profile.status === 'active' ? "text-red-500 hover:text-red-600 hover:bg-red-50" : "text-green-500 hover:text-green-600 hover:bg-green-50"
                        )}
                      >
                        {profile.status === 'active' ? (
                          <>
                            <UserX className="h-3.5 w-3.5" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5" />
                            Activate
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedUser(profile)
                          setIsEditOpen(true)
                        }}
                        className="h-8 px-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-100 cursor-pointer gap-1.5 rounded-lg"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedUser(profile)
                          setIsPasswordResetOpen(true)
                        }}
                        className="h-8 px-2.5 text-xs font-semibold text-[#C9952A] hover:text-[#C9952A]/90 hover:bg-[#C9952A]/5 cursor-pointer gap-1.5 rounded-lg"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        Reset Pass
                      </Button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-450 font-medium">
                No team members found matching search filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ==================== MODALS ==================== */}

      {/* 1. Create User Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0B1F3A]">Add New User</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Provision an account. The user will be forced to change password on first login.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUserSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-bold text-slate-600">Full Name</Label>
              <Input id="name" name="name" required placeholder="Jane Doe" className="h-10 border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-bold text-slate-600">Email Address</Label>
              <Input id="email" name="email" type="email" required placeholder="jane@turn2law.com" className="h-10 border-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs font-bold text-slate-600">Role</Label>
                <Select name="role" defaultValue="intern">
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Select role">
                      {(value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : "Select role"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="teamId" className="text-xs font-bold text-slate-600">Squad</Label>
                <Select name="teamId" defaultValue="">
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Unassigned">
                      {(value) => {
                        if (!value) return "Unassigned"
                        const selectedTeamObj = teams.find((t) => t.id === value)
                        return selectedTeamObj ? selectedTeamObj.name : "Unassigned"
                      }}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {teams.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tempPassword" className="text-xs font-bold text-slate-600">Temporary Password</Label>
              <Input id="tempPassword" name="tempPassword" type="password" required placeholder="At least 6 characters" className="h-10 border-slate-200" />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 border-slate-200 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-10 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold cursor-pointer">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-[#C9952A]" /> : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Edit User Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0B1F3A]">Edit Profile</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Update name, role, and squad assignment for {selectedUser?.name}.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <form onSubmit={handleEditUserSubmit} className="space-y-4 py-2">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-xs font-bold text-slate-600">Full Name</Label>
                <Input id="edit-name" name="name" defaultValue={selectedUser.name} required className="h-10 border-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-role" className="text-xs font-bold text-slate-600">Role</Label>
                  <Select name="role" defaultValue={selectedUser.role}>
                    <SelectTrigger className="h-10 border-slate-200">
                      <SelectValue placeholder="Select role">
                        {(value) => value ? value.charAt(0).toUpperCase() + value.slice(1) : "Select role"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="intern">Intern</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-teamId" className="text-xs font-bold text-slate-600">Squad</Label>
                  <Select name="teamId" defaultValue={selectedUser.team_id || ""}>
                    <SelectTrigger className="h-10 border-slate-200">
                      <SelectValue placeholder="Unassigned">
                        {(value) => {
                          if (!value) return "Unassigned"
                          const selectedTeamObj = teams.find((t) => t.id === value)
                          return selectedTeamObj ? selectedTeamObj.name : "Unassigned"
                        }}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unassigned</SelectItem>
                      {teams.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); setSelectedUser(null); }} className="h-10 border-slate-200 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="h-10 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold cursor-pointer">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-[#C9952A]" /> : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 3. Reset Password Dialog */}
      <Dialog open={isPasswordResetOpen} onOpenChange={setIsPasswordResetOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0B1F3A] flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Reset Password
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Set a new temporary password for {selectedUser?.name}. They will be forced to change it on login.
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <form onSubmit={handlePasswordResetSubmit} className="space-y-4 py-2">
              {errorMsg && (
                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newPassword" className="text-xs font-bold text-slate-600">New Temporary Password</Label>
                <Input id="newPassword" name="newPassword" type="password" required placeholder="At least 6 characters" className="h-10 border-slate-200" />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => { setIsPasswordResetOpen(false); setSelectedUser(null); }} className="h-10 border-slate-200 cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="h-10 bg-amber-500 hover:bg-amber-600 text-white font-semibold border border-[#C9952A]/20 cursor-pointer">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : 'Confirm Reset'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* 4. Create Team Dialog */}
      <Dialog open={isCreateTeamOpen} onOpenChange={setIsCreateTeamOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0B1F3A]">Create New Squad</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Add a new squad to organize tasks, standups, and meetings.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateTeamSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="team-name" className="text-xs font-bold text-slate-600">Squad / Team Name</Label>
              <Input id="team-name" name="name" required placeholder="e.g. Squad Gamma" className="h-10 border-slate-200" />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateTeamOpen(false)} className="h-10 border-slate-200 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-10 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold cursor-pointer">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-[#C9952A]" /> : 'Create Squad'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
