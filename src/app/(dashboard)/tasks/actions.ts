'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Helper: Get user profile and verification
async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function createTask(state: any, formData: FormData) {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: 'Unauthorized: Session not found.' }
  }

  const isManager = profile.role === 'admin' || profile.role === 'lead'
  if (!isManager) {
    return { error: 'Unauthorized: Only leads and admins can create tasks.' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const acceptanceCriteria = formData.get('acceptanceCriteria') as string
  const priority = formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent'
  const dueDate = formData.get('dueDate') as string
  const assigneeId = formData.get('assigneeId') as string
  
  if (!title) {
    return { error: 'Task title is required.' }
  }

  const supabase = await createClient()

  // Determine which team the task belongs to (default to creator's team if lead, or assignee's team)
  let teamId = profile.team_id
  if (profile.role === 'admin' && assigneeId) {
    const { data: assigneeProfile } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', assigneeId)
      .single()
    teamId = assigneeProfile?.team_id || null
  }

  // Insert task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .insert({
      title,
      description: description || null,
      acceptance_criteria: acceptanceCriteria || null,
      priority: priority || 'medium',
      status: 'todo',
      due_date: dueDate || null,
      assignee_id: assigneeId || null,
      team_id: teamId || null,
      created_by: profile.id
    })
    .select()
    .single()

  if (taskError) {
    return { error: taskError.message }
  }

  // Create creation history log
  const { error: historyError } = await supabase
    .from('task_activity')
    .insert({
      task_id: task.id,
      changed_by: profile.id,
      change_type: 'creation',
      to_value: 'todo',
      comment: 'Task created'
    })

  if (historyError) {
    console.error('Error logging task history:', historyError)
  }

  revalidatePath('/tasks')
  revalidatePath('/')
  return { success: true }
}

export async function updateTaskStatus(taskId: string, newStatus: string, currentStatus: string) {
  const profile = await getUserProfile()
  if (!profile) {
    throw new Error('Unauthorized')
  }

  const supabase = await createClient()

  // Fetch task to check permissions
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) {
    throw new Error('Task not found')
  }

  const isOwner = task.assignee_id === profile.id
  const isSquadLead = profile.role === 'lead' && task.team_id === profile.team_id
  const isAdmin = profile.role === 'admin'

  if (!isAdmin && !isSquadLead && !isOwner) {
    throw new Error('Unauthorized to update this task status')
  }

  // Prevent interns from transitioning tasks to 'done' directly
  if (profile.role === 'intern' && newStatus === 'done') {
    throw new Error("Tasks cannot be marked as 'Done' directly by interns. Status 'Done' requires approval from a Lead or Admin.")
  }

  // Update status
  const { error: updateError } = await supabase
    .from('tasks')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  // Log to history
  const statusLabels: Record<string, string> = {
    todo: 'To Do',
    in_progress: 'In Progress',
    review: 'Review',
    done: 'Done',
    blocked: 'Blocked'
  }

  const fromLabel = statusLabels[currentStatus] || currentStatus
  const toLabel = statusLabels[newStatus] || newStatus

  const { error: historyError } = await supabase
    .from('task_activity')
    .insert({
      task_id: taskId,
      changed_by: profile.id,
      change_type: 'status_change',
      from_value: currentStatus,
      to_value: newStatus,
      comment: currentStatus === 'review' && newStatus === 'done'
        ? 'Approved task (Moved to Done)'
        : currentStatus === 'review' && newStatus === 'in_progress'
        ? 'Rejected task (Needs Changes)'
        : `Moved task from "${fromLabel}" to "${toLabel}"`
    })

  if (historyError) {
    console.error('Error logging task history:', historyError)
  }

  revalidatePath('/tasks')
  revalidatePath('/')
}

export async function updateTaskDetails(state: any, formData: FormData) {
  const profile = await getUserProfile()
  if (!profile) {
    return { error: 'Unauthorized.' }
  }

  const taskId = formData.get('taskId') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const acceptanceCriteria = formData.get('acceptanceCriteria') as string
  const priority = formData.get('priority') as 'low' | 'medium' | 'high' | 'urgent'
  const dueDate = formData.get('dueDate') as string
  const assigneeId = formData.get('assigneeId') as string
  const status = formData.get('status') as string

  if (!taskId || !title) {
    return { error: 'Task ID and Title are required.' }
  }

  const supabase = await createClient()

  // Fetch current task
  const { data: task, error: fetchError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (fetchError || !task) {
    return { error: 'Task not found.' }
  }

  const isSquadLead = profile.role === 'lead' && task.team_id === profile.team_id
  const isAdmin = profile.role === 'admin'

  if (!isAdmin && !isSquadLead) {
    return { error: 'Unauthorized: Only leads and admins can edit task details.' }
  }

  // Check what changed to add custom history comments
  const changes: string[] = []
  if (task.title !== title) changes.push(`renamed title to "${title}"`)
  if (task.priority !== priority) changes.push(`changed priority from "${task.priority}" to "${priority}"`)
  if (task.assignee_id !== (assigneeId || null)) changes.push('reassigned task')
  if (task.status !== status) changes.push(`changed status to "${status}"`)

  // Update task
  const { error: updateError } = await supabase
    .from('tasks')
    .update({
      title,
      description: description || null,
      acceptance_criteria: acceptanceCriteria || null,
      priority,
      status,
      due_date: dueDate || null,
      assignee_id: assigneeId || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)

  if (updateError) {
    return { error: updateError.message }
  }

  // Log history
  if (changes.length > 0) {
    const { error: historyError } = await supabase
      .from('task_activity')
      .insert({
        task_id: taskId,
        changed_by: profile.id,
        change_type: 'edit',
        from_value: task.status,
        to_value: status,
        comment: `Updated details: ${changes.join(', ')}`
      })

    if (historyError) {
      console.error('History log failed:', historyError)
    }
  }

  revalidatePath('/tasks')
  revalidatePath('/')
  return { success: true }
}

export async function deleteTask(taskId: string) {
  const profile = await getUserProfile()
  if (!profile || profile.role !== 'admin') {
    throw new Error('Unauthorized: Only administrators can delete tasks.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/tasks')
  revalidatePath('/')
}
