'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { updateTaskStatus, createTask, updateTaskDetails, deleteTask } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
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
  Plus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Check,
  Calendar,
  User,
  History,
  Trash2,
  Loader2,
  SlidersHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileSummary {
  id: string
  name: string
  role: string
  team_id: string | null
}

interface Team {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
  description: string | null
  acceptance_criteria: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  due_date: string | null
  assignee_id: string | null
  team_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  assignee?: {
    id: string
    name: string
    email: string
  } | null
}

interface HistoryItem {
  id: string
  change_type: string
  from_value: string | null
  to_value: string | null
  comment: string
  created_at: string
  changed_by: string
  profiles?: {
    name: string
    role: string
  } | null
}

interface KanbanBoardProps {
  initialTasks: Task[]
  assignees: ProfileSummary[]
  teams: Team[]
  currentUser: {
    id: string
    name: string
    role: 'admin' | 'lead' | 'intern'
    team_id: string | null
  }
}

export function KanbanBoard({ initialTasks, assignees, teams, currentUser }: KanbanBoardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  // Local state for tasks (optimistic updates/quick updates)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  
  // Sync state if initialTasks change
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Filters State
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [filterTeam, setFilterTeam] = useState<string>('all')

  // Kanban active tab on mobile
  const [activeTab, setActiveTab] = useState<'todo' | 'in_progress' | 'review' | 'done' | 'blocked'>('todo')

  // Modals & Drawers state
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  // Drawer Task History state
  const [taskHistory, setTaskHistory] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // Submitting states
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch Task History when a task is selected
  const fetchHistory = async (taskId: string) => {
    setLoadingHistory(true)
    const { data, error } = await supabase
      .from('task_activity')
      .select('*, profiles(name, role)')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching history:', error)
    } else {
      setTaskHistory(data || [])
    }
    setLoadingHistory(false)
  }

  // Open Drawer and trigger history fetch
  const handleCardClick = (task: Task) => {
    setSelectedTask(task)
    setIsDrawerOpen(true)
    fetchHistory(task.id)
  }

  // Kanban Columns
  const columns = [
    { id: 'todo', title: 'To Do', color: 'bg-slate-100 border-slate-200 text-slate-700' },
    { id: 'in_progress', title: 'In Progress', color: 'bg-amber-50 border-amber-200 text-amber-800' },
    { id: 'review', title: 'Review', color: 'bg-blue-50 border-blue-200 text-blue-800' },
    { id: 'done', title: 'Done', color: 'bg-green-50 border-green-200 text-green-800' },
    { id: 'blocked', title: 'Blocked', color: 'bg-red-50 border-red-200 text-red-800' },
  ] as const

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id)
    e.dataTransfer.setData('currentStatus', task.status)
  }

  const handleDrop = (e: React.DragEvent, newStatus: Task['status']) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('taskId')
    const currentStatus = e.dataTransfer.getData('currentStatus') as Task['status']

    if (!taskId || currentStatus === newStatus) return

    // Optimistic state update
    const previousTasks = [...tasks]
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    )

    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, newStatus, currentStatus)
      } catch (err: any) {
        // Rollback state on failure
        setTasks(previousTasks)
        alert(err.message || 'Failed to update task status.')
      }
    })
  }

  // Handle manual dropdown status change
  const handleStatusChange = async (taskId: string, newStatus: Task['status'], currentStatus: Task['status']) => {
    if (newStatus === currentStatus) return
    startTransition(async () => {
      try {
        await updateTaskStatus(taskId, newStatus, currentStatus)
        // If drawer is open, refresh history
        if (selectedTask && selectedTask.id === taskId) {
          const updated = { ...selectedTask, status: newStatus }
          setSelectedTask(updated)
          fetchHistory(taskId)
        }
      } catch (err: any) {
        alert(err.message || 'Failed to update status.')
      }
    })
  }

  // Handle task deletion
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return
    startTransition(async () => {
      try {
        await deleteTask(taskId)
        setIsDrawerOpen(false)
        setSelectedTask(null)
      } catch (err: any) {
        alert(err.message || 'Failed to delete task.')
      }
    })
  }

  // Submit Task Creation Form
  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')

    const form = e.currentTarget
    const formData = new FormData(form)
    const res = await createTask(null, formData)

    setIsSubmitting(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setIsCreateOpen(false)
      form.reset()
    }
  }

  // Submit Task Update Form (Drawer)
  const handleUpdateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)
    setErrorMsg('')

    const formData = new FormData(e.currentTarget)
    const res = await updateTaskDetails(null, formData)

    setIsSubmitting(false)
    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setIsDrawerOpen(false)
      setSelectedTask(null)
    }
  }

  // Filter tasks
  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(search.toLowerCase()) ||
      (task.description && task.description.toLowerCase().includes(search.toLowerCase()))
    
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority
    const matchesAssignee =
      filterAssignee === 'all' ||
      (filterAssignee === 'unassigned' && !task.assignee_id) ||
      task.assignee_id === filterAssignee
    
    const matchesTeam = filterTeam === 'all' || task.team_id === filterTeam

    return matchesSearch && matchesPriority && matchesAssignee && matchesTeam
  })

  const isManager = currentUser.role === 'admin' || currentUser.role === 'lead'

  const renderColumn = (
    column: typeof columns[number],
    colTasks: Task[],
    isMobile = false
  ) => {
    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => handleDrop(e, column.id)}
        className={cn(
          "bg-slate-50/50 border border-slate-200/80 rounded-xl p-3 flex flex-col h-full",
          isMobile ? "w-full" : "flex-1 min-w-[200px]"
        )}
      >
        {/* Column Title Header - hidden on mobile since we already have tabs */}
        {!isMobile && (
          <div className="flex items-center justify-between mb-3 px-1.5 select-none shrink-0">
            <div className="flex items-center gap-2">
              <span className={cn(
                "h-2 w-2 rounded-full",
                column.id === 'todo' && "bg-slate-400",
                column.id === 'in_progress' && "bg-amber-500",
                column.id === 'review' && "bg-blue-500",
                column.id === 'done' && "bg-green-500",
                column.id === 'blocked' && "bg-red-500"
              )} />
              <span className="font-bold text-sm text-[#0B1F3A]">{column.title}</span>
            </div>
            <Badge variant="secondary" className="bg-slate-200/50 text-slate-600 font-bold px-2 py-0.5 text-[10px]">
              {colTasks.length}
            </Badge>
          </div>
        )}

        {/* Column Cards List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {colTasks.length > 0 ? (
            colTasks.map((task) => {
              const isOverdue =
                task.due_date &&
                task.status !== 'done' &&
                new Date(task.due_date + 'T23:59:59') < new Date()

              return (
                <div
                  key={task.id}
                  draggable={!isMobile}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => handleCardClick(task)}
                  className={cn(
                    "bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all active:cursor-grabbing group relative select-none cursor-pointer",
                    !isMobile && "cursor-grab",
                    task.status === 'blocked' && "border-l-4 border-l-red-500",
                    task.status === 'in_progress' && "border-l-4 border-l-amber-500",
                    task.status === 'done' && "border-l-4 border-l-green-500"
                  )}
                >
                  <h4 className="font-bold text-xs sm:text-sm text-[#0B1F3A] leading-snug group-hover:text-[#C9952A] transition-colors line-clamp-2 pr-1 mb-2">
                    {task.title}
                  </h4>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-100">
                    {/* Priority */}
                    <Badge
                      className={cn(
                        "text-[9px] font-bold uppercase tracking-wider px-1.5 py-0",
                        task.priority === 'urgent' && "bg-red-100 text-red-800 border-none",
                        task.priority === 'high' && "bg-amber-100 text-amber-800 border-none",
                        task.priority === 'medium' && "bg-blue-100 text-blue-800 border-none",
                        task.priority === 'low' && "bg-slate-100 text-slate-800 border-none"
                      )}
                    >
                      {task.priority}
                    </Badge>

                    {/* Info */}
                    <div className="flex items-center gap-2">
                      {task.due_date && (
                        <div
                          className={cn(
                            "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded",
                            isOverdue
                              ? "bg-red-50 text-red-600"
                              : "text-slate-400 bg-slate-50"
                          )}
                          title={isOverdue ? 'Overdue!' : 'Due date'}
                        >
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(task.due_date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}

                      {/* Assignee */}
                      {task.assignee ? (
                        <div
                          className="h-6 w-6 rounded-full bg-[#0B1F3A]/10 border border-[#0B1F3A]/20 flex items-center justify-center font-bold text-[9px] text-[#0B1F3A] uppercase shrink-0"
                          title={task.assignee.name}
                        >
                          {task.assignee.name.substring(0, 2)}
                        </div>
                      ) : (
                        <div
                          className="h-6 w-6 rounded-full border border-dashed border-slate-300 flex items-center justify-center font-medium text-[9px] text-slate-400 shrink-0"
                          title="Unassigned"
                        >
                          <User className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="h-28 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-center p-4">
              <span className="text-xs text-slate-400 font-medium select-none">
                No tasks in this column
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* 1. Filter Panel */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 border-slate-200 focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]"
            />
          </div>

          <Select value={filterPriority} onValueChange={(val) => setFilterPriority(val || 'all')}>
            <SelectTrigger className="w-full sm:w-36 h-10 border-slate-200">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAssignee} onValueChange={(val) => setFilterAssignee(val || 'all')}>
            <SelectTrigger className="w-full sm:w-44 h-10 border-slate-200">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {assignees.map((person) => (
                <SelectItem key={person.id} value={person.id}>
                  {person.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentUser.role === 'admin' && (
            <Select value={filterTeam} onValueChange={(val) => setFilterTeam(val || 'all')}>
              <SelectTrigger className="w-full sm:w-44 h-10 border-slate-200">
                <SelectValue placeholder="Squad / Team" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Squads</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Create Task (Leads & Admins only) */}
        {isManager && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold h-10 border border-[#C9952A]/20 gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="h-4 w-4 text-[#C9952A]" />
            Create Task
          </Button>
        )}
      </div>

      {/* 2. Mobile Column Selector */}
      <div className="md:hidden flex gap-2 overflow-x-auto pb-2.5 -mx-4 px-4 scrollbar-none select-none shrink-0">
        {columns.map((column) => {
          const isActive = activeTab === column.id
          const colTasks = filteredTasks.filter((t) => t.status === column.id)
          return (
            <button
              key={column.id}
              type="button"
              onClick={() => setActiveTab(column.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 cursor-pointer shadow-sm",
                isActive
                  ? "bg-[#0B1F3A] text-white border-[#0B1F3A]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              <span className={cn(
                "h-1.5 w-1.5 rounded-full",
                column.id === 'todo' && "bg-slate-400",
                column.id === 'in_progress' && "bg-amber-500",
                column.id === 'review' && "bg-blue-500",
                column.id === 'done' && "bg-green-500",
                column.id === 'blocked' && "bg-red-500"
              )} />
              {column.title}
              <span className={cn(
                "px-1.5 py-0.2 rounded-full text-[9px] font-extrabold",
                isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              )}>
                {colTasks.length}
              </span>
            </button>
          )
        })}
      </div>

      {/* 3. Kanban Columns Area */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
        {/* Desktop Layout: Show all columns side-by-side */}
        <div className="hidden md:flex gap-4 h-full min-w-[1000px]">
          {columns.map((column) => {
            const colTasks = filteredTasks.filter((t) => t.status === column.id)
            return renderColumn(column, colTasks)
          })}
        </div>

        {/* Mobile Layout: Show only selected column */}
        <div className="flex md:hidden h-full w-full">
          {columns
            .filter((c) => c.id === activeTab)
            .map((column) => {
              const colTasks = filteredTasks.filter((t) => t.status === column.id)
              return (
                <div key={column.id} className="w-full h-full">
                  {renderColumn(column, colTasks, true)}
                </div>
              )
            })}
        </div>
      </div>

      {/* ==================== CREATE TASK DIALOG ==================== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0B1F3A]">Create Task</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Scaffold a task card for your squad and assign it.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-4 py-2">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium">
                {errorMsg}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-xs font-bold text-slate-600">Task Title</Label>
              <Input id="title" name="title" required placeholder="e.g. Implement Supabase middleware cookies" className="h-10 border-slate-200" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-xs font-bold text-slate-600">Description</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Details of the task assignment..."
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acceptanceCriteria" className="text-xs font-bold text-slate-600">Acceptance Criteria</Label>
              <textarea
                id="acceptanceCriteria"
                name="acceptanceCriteria"
                rows={2}
                placeholder="Steps needed to mark this task as complete..."
                className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0B1F3A] focus:ring-1 focus:ring-[#0B1F3A]"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="priority" className="text-xs font-bold text-slate-600">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="assigneeId" className="text-xs font-bold text-slate-600">Assignee</Label>
                <Select name="assigneeId" defaultValue="">
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {assignees.map((person) => (
                      <SelectItem key={person.id} value={person.id}>
                        {person.name} — <span className="capitalize text-slate-400">{person.role === 'lead' ? 'Squad Leader' : person.role}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs font-bold text-slate-600">Due Date</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  className="h-10 border-slate-200 cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="h-10 border-slate-200 cursor-pointer">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="h-10 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold cursor-pointer">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-[#C9952A]" /> : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== DETAIL DRAWER (SHEET) ==================== */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="sm:max-w-[550px] overflow-y-auto">
          {selectedTask && (
            <div className="space-y-6">
              <SheetHeader className="pb-4 border-b border-slate-100 flex flex-row items-center justify-between pr-6">
                <div>
                  <SheetTitle className="text-lg font-bold text-[#0B1F3A] leading-tight">Task Details</SheetTitle>
                  <SheetDescription className="text-xs text-slate-400">
                    View settings and transition logs.
                  </SheetDescription>
                </div>

                {currentUser.role === 'admin' && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 w-9 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </SheetHeader>

              {/* Roles check: Managers can Edit, Interns can view + update status */}
              {isManager ? (
                <form onSubmit={handleUpdateSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-600 rounded-lg font-medium">
                      {errorMsg}
                    </div>
                  )}

                  <input type="hidden" name="taskId" value={selectedTask.id} />

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-title" className="text-xs font-bold text-slate-600">Task Title</Label>
                    <Input id="edit-title" name="title" defaultValue={selectedTask.title} required className="h-10 border-slate-200" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-description" className="text-xs font-bold text-slate-600">Description</Label>
                    <textarea
                      id="edit-description"
                      name="description"
                      rows={3}
                      defaultValue={selectedTask.description || ''}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0B1F3A]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-criteria" className="text-xs font-bold text-slate-600">Acceptance Criteria</Label>
                    <textarea
                      id="edit-criteria"
                      name="acceptanceCriteria"
                      rows={2}
                      defaultValue={selectedTask.acceptance_criteria || ''}
                      className="w-full border border-slate-200 rounded-lg p-2.5 text-sm outline-none focus:border-[#0B1F3A]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-status" className="text-xs font-bold text-slate-600">Status</Label>
                      <Select name="status" defaultValue={selectedTask.status}>
                        <SelectTrigger className="h-10 border-slate-200">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todo">To Do</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="review">Review</SelectItem>
                          <SelectItem value="done">Done</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="edit-priority" className="text-xs font-bold text-slate-600">Priority</Label>
                      <Select name="priority" defaultValue={selectedTask.priority}>
                        <SelectTrigger className="h-10 border-slate-200">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-assigneeId" className="text-xs font-bold text-slate-600">Assignee</Label>
                      <Select name="assigneeId" defaultValue={selectedTask.assignee_id || ""}>
                        <SelectTrigger className="h-10 border-slate-200">
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Unassigned</SelectItem>
                          {assignees.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.name} — <span className="capitalize text-slate-400">{person.role === 'lead' ? 'Squad Leader' : person.role}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="edit-dueDate" className="text-xs font-bold text-slate-600">Due Date</Label>
                      <Input
                        id="edit-dueDate"
                        name="dueDate"
                        type="date"
                        defaultValue={selectedTask.due_date || ''}
                        className="h-10 border-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <Button type="button" variant="outline" onClick={() => setIsDrawerOpen(false)} className="h-10 border-slate-200 cursor-pointer">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="h-10 bg-[#0B1F3A] hover:bg-[#0B1F3A]/90 text-white font-semibold cursor-pointer">
                      {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin text-[#C9952A]" /> : 'Save Details'}
                    </Button>
                  </div>
                </form>
              ) : (
                /* Intern view (Read-only details + quick status drop-down) */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-bold text-base text-[#0B1F3A]">{selectedTask.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="text-[10px] font-bold uppercase tracking-wider">
                        {selectedTask.priority} priority
                      </Badge>
                      {selectedTask.due_date && (
                        <span className="text-slate-400 text-xs flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {new Date(selectedTask.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  {selectedTask.description && (
                    <div className="space-y-1 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Description</span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap mt-0.5">{selectedTask.description}</p>
                    </div>
                  )}

                  {selectedTask.acceptance_criteria && (
                    <div className="space-y-1 bg-slate-50 border border-slate-100 p-3 rounded-lg">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Acceptance Criteria</span>
                      <p className="text-xs text-slate-700 whitespace-pre-wrap mt-0.5">{selectedTask.acceptance_criteria}</p>
                    </div>
                  )}

                  {/* Intern Quick Status Switcher */}
                  <div className="space-y-1.5 p-3 border border-slate-200 rounded-lg">
                    <Label className="text-xs font-bold text-slate-600 block">Change Status</Label>
                    <Select
                      defaultValue={selectedTask.status}
                      onValueChange={(val: any) => handleStatusChange(selectedTask.id, val, selectedTask.status)}
                    >
                      <SelectTrigger className="h-10 border-slate-200">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="review">Review</SelectItem>
                        <SelectItem value="done">Done</SelectItem>
                        <SelectItem value="blocked">Blocked</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Timeline / History logs section */}
              <div className="pt-6 border-t border-slate-150 space-y-4">
                <h4 className="font-bold text-sm text-[#0B1F3A] flex items-center gap-2">
                  <History className="h-4 w-4 text-[#C9952A]" />
                  Modification Log
                </h4>

                {loadingHistory ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-4 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading timeline...</span>
                  </div>
                ) : taskHistory.length > 0 ? (
                  <div className="relative pl-6 border-l-2 border-slate-100 space-y-5 py-1">
                    {taskHistory.map((item) => {
                      const time = new Date(item.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })

                      return (
                        <div key={item.id} className="relative group">
                          {/* Dot indicator */}
                          <div className={cn(
                            "absolute -left-[31px] top-1 h-3.5 w-3.5 rounded-full border bg-white flex items-center justify-center shadow-sm",
                            item.change_type === 'creation' && "border-green-400",
                            item.change_type === 'status_change' && "border-amber-400",
                            item.change_type === 'edit' && "border-blue-400"
                          )}>
                            {item.change_type === 'creation' && <Check className="h-2 w-2 text-green-500" />}
                          </div>

                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-[#0B1F3A]">
                                {item.profiles?.name || 'Unknown User'}
                              </span>
                              <Badge variant="outline" className="text-[8px] font-bold px-1 py-0 uppercase shrink-0 leading-none">
                                {item.profiles?.role}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-500 leading-normal mt-0.5">
                              {item.comment}
                            </p>
                            <span className="text-[10px] text-slate-400 font-semibold mt-1">
                              {time}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4 select-none">
                    No transition logs recorded for this task.
                  </p>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
