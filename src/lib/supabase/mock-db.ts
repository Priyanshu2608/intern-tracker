import fs from 'fs'
import path from 'path'

// Path to the database JSON file
const DB_FILE = path.join(process.cwd(), 'src', 'lib', 'supabase', 'mock-db-store.json')

// Helper types
export interface MockUser {
  id: string
  email: string
  password: string
  user_metadata: {
    name: string
    role: string
    team_id?: string | null
    must_reset_password?: boolean
  }
}

export interface MockProfile {
  id: string
  email: string
  name: string
  role: 'admin' | 'lead' | 'intern'
  team_id: string | null
  status: 'active' | 'inactive'
  must_reset_password: boolean
  updated_at: string
}

export interface MockTeam {
  id: string
  name: string
  created_at: string
}

export interface MockTask {
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
}

export interface MockTaskActivity {
  id: string
  task_id: string
  changed_by: string
  change_type: 'status_change' | 'edit' | 'assignment' | 'creation'
  from_value: string | null
  to_value: string | null
  comment: string
  created_at: string
}

export interface MockStandup {
  id: string
  user_id: string
  date: string
  did_yesterday: string
  doing_today: string
  blockers: string | null
  created_at: string
}

export interface MockMeeting {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  team_id: string | null
  created_by: string | null
  created_at: string
}

export interface MockMeetingAttendance {
  id: string
  meeting_id: string
  user_id: string
  status: 'present' | 'absent' | 'excused'
  updated_at: string
}

export interface MockDatabase {
  users: MockUser[]
  profiles: MockProfile[]
  teams: MockTeam[]
  tasks: MockTask[]
  task_activity: MockTaskActivity[]
  standups: MockStandup[]
  meetings: MockMeeting[]
  meeting_attendance: MockMeetingAttendance[]
}

const DEFAULT_DB: MockDatabase = {
  users: [
    {
      id: '99999999-9999-9999-9999-999999999999',
      email: 'admin@turn2law.com',
      password: 'admin123',
      user_metadata: {
        name: 'System Admin',
        role: 'admin',
        must_reset_password: false
      }
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      email: 'lead@turn2law.com',
      password: 'lead123',
      user_metadata: {
        name: 'Squad Lead Alpha',
        role: 'lead',
        team_id: '11111111-1111-1111-1111-111111111111',
        must_reset_password: false
      }
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      email: 'intern@turn2law.com',
      password: 'intern123',
      user_metadata: {
        name: 'Intern One',
        role: 'intern',
        team_id: '11111111-1111-1111-1111-111111111111',
        must_reset_password: false
      }
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      email: 'intern2@turn2law.com',
      password: 'intern123',
      user_metadata: {
        name: 'Intern Two',
        role: 'intern',
        team_id: '22222222-2222-2222-2222-222222222222',
        must_reset_password: true
      }
    }
  ],
  profiles: [
    {
      id: '99999999-9999-9999-9999-999999999999',
      email: 'admin@turn2law.com',
      name: 'System Admin',
      role: 'admin',
      team_id: null,
      status: 'active',
      must_reset_password: false,
      updated_at: new Date().toISOString()
    },
    {
      id: '88888888-8888-8888-8888-888888888888',
      email: 'lead@turn2law.com',
      name: 'Squad Lead Alpha',
      role: 'lead',
      team_id: '11111111-1111-1111-1111-111111111111',
      status: 'active',
      must_reset_password: false,
      updated_at: new Date().toISOString()
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      email: 'intern@turn2law.com',
      name: 'Intern One',
      role: 'intern',
      team_id: '11111111-1111-1111-1111-111111111111',
      status: 'active',
      must_reset_password: false,
      updated_at: new Date().toISOString()
    },
    {
      id: '66666666-6666-6666-6666-666666666666',
      email: 'intern2@turn2law.com',
      name: 'Intern Two',
      role: 'intern',
      team_id: '22222222-2222-2222-2222-222222222222',
      status: 'active',
      must_reset_password: true,
      updated_at: new Date().toISOString()
    }
  ],
  teams: [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Squad Alpha', created_at: new Date().toISOString() },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Squad Beta', created_at: new Date().toISOString() },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Squad Gamma', created_at: new Date().toISOString() }
  ],
  tasks: [
    {
      id: '55555555-5555-5555-5555-555555555555',
      title: 'Set up local environment',
      description: 'Follow the README to run the project locally.',
      acceptance_criteria: 'Server runs and displays login page.',
      priority: 'high',
      status: 'in_progress',
      due_date: '2026-06-25',
      assignee_id: '77777777-7777-7777-7777-777777777777',
      team_id: '11111111-1111-1111-1111-111111111111',
      created_by: '88888888-8888-8888-8888-888888888888',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      title: 'Review feedback on pull request',
      description: 'Address comments from senior developer on git PR.',
      acceptance_criteria: 'All comments resolved and PR approved.',
      priority: 'medium',
      status: 'todo',
      due_date: '2026-06-28',
      assignee_id: '77777777-7777-7777-7777-777777777777',
      team_id: '11111111-1111-1111-1111-111111111111',
      created_by: '88888888-8888-8888-8888-888888888888',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: '33333333-4444-4444-4444-444444444444',
      title: 'Database Schema Design',
      description: 'Design tables for intern performance tracking.',
      acceptance_criteria: 'Create schema.sql and seed.sql.',
      priority: 'urgent',
      status: 'done',
      due_date: '2026-06-15',
      assignee_id: '88888888-8888-8888-8888-888888888888',
      team_id: '11111111-1111-1111-1111-111111111111',
      created_by: '99999999-9999-9999-9999-999999999999',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  task_activity: [
    {
      id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
      task_id: '55555555-5555-5555-5555-555555555555',
      changed_by: '88888888-8888-8888-8888-888888888888',
      change_type: 'creation',
      from_value: null,
      to_value: 'todo',
      comment: 'Task created',
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
      task_id: '55555555-5555-5555-5555-555555555555',
      changed_by: '77777777-7777-7777-7777-777777777777',
      change_type: 'status_change',
      from_value: 'todo',
      to_value: 'in_progress',
      comment: 'Moved task from "To Do" to "In Progress"',
      created_at: new Date().toISOString()
    }
  ],
  standups: [
    {
      id: '11223344-5566-7788-9900-aabbccddeeff',
      user_id: '77777777-7777-7777-7777-777777777777',
      date: new Date().toLocaleDateString('en-CA'),
      did_yesterday: 'Set up local development repository.',
      doing_today: 'Implementing the database mock layer.',
      blockers: 'No live Supabase instance available.',
      created_at: new Date().toISOString()
    }
  ],
  meetings: [
    {
      id: '98765432-1111-1111-1111-111111111111',
      title: 'Weekly Sync',
      description: 'Squad Alpha weekly check-in.',
      start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(),
      team_id: '11111111-1111-1111-1111-111111111111',
      created_by: '88888888-8888-8888-8888-888888888888',
      created_at: new Date().toISOString()
    },
    {
      id: '98765432-2222-2222-2222-222222222222',
      title: 'All-Hands Meeting',
      description: 'General company-wide update.',
      start_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
      end_time: new Date(Date.now() + 172800000 + 3600000).toISOString(),
      team_id: null,
      created_by: '99999999-9999-9999-9999-999999999999',
      created_at: new Date().toISOString()
    }
  ],
  meeting_attendance: []
}

// Thread-safe read/write helper
export function getDb(): MockDatabase {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const dir = path.dirname(DB_FILE)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8')
      return DEFAULT_DB
    }
    const content = fs.readFileSync(DB_FILE, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error('Error reading mock DB:', err)
    return DEFAULT_DB
  }
}

export function saveDb(db: MockDatabase): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8')
  } catch (err) {
    console.error('Error writing mock DB:', err)
  }
}

// Helper: Resolve relationships for standard tables
export function resolveRelations(table: string, item: any, db: MockDatabase): any {
  if (!item) return item
  const resolved = { ...item }

  if (table === 'profiles') {
    if (item.team_id) {
      const team = db.teams.find((t) => t.id === item.team_id)
      resolved.teams = team ? { name: team.name } : null
    } else {
      resolved.teams = null
    }
  }

  if (table === 'meetings') {
    if (item.team_id) {
      const team = db.teams.find((t) => t.id === item.team_id)
      resolved.teams = team ? { name: team.name } : null
    } else {
      resolved.teams = null
    }
  }

  if (table === 'meeting_attendance') {
    const profile = db.profiles.find((p) => p.id === item.user_id)
    resolved.profiles = profile ? { name: profile.name, role: profile.role, team_id: profile.team_id } : null
  }

  if (table === 'tasks') {
    if (item.assignee_id) {
      const profile = db.profiles.find((p) => p.id === item.assignee_id)
      resolved.assignee = profile ? { id: profile.id, name: profile.name, email: profile.email, role: profile.role } : null
    } else {
      resolved.assignee = null
    }
  }

  if (table === 'task_activity') {
    const profile = db.profiles.find((p) => p.id === item.changed_by)
    resolved.profiles = profile ? { name: profile.name, role: profile.role } : null
    if (item.task_id) {
      const task = db.tasks.find((t) => t.id === item.task_id)
      resolved.tasks = task ? { title: task.title, team_id: task.team_id } : null
    } else {
      resolved.tasks = null
    }
  }

  if (table === 'standups') {
    const profile = db.profiles.find((p) => p.id === item.user_id)
    if (profile) {
      let teamName = null
      if (profile.team_id) {
        const team = db.teams.find((t) => t.id === profile.team_id)
        teamName = team ? { name: team.name } : null
      }
      resolved.profiles = {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        team_id: profile.team_id,
        teams: teamName
      }
    } else {
      resolved.profiles = null
    }
  }

  return resolved
}

// Core database engine that processes a serialized query request
export function executeQuery(db: MockDatabase, queryReq: {
  table: string
  select: string
  filters?: any[]
  orderBy?: { column: string; ascending: boolean } | null
  limit?: number | null
  single?: boolean
  maybeSingle?: boolean
}): { data: any; error: any } {
  const tableData = db[queryReq.table as keyof MockDatabase] as any[]
  if (!tableData) {
    return { data: null, error: { message: `Table ${queryReq.table} not found` } }
  }

  let result = [...tableData]

  // Apply filters
  if (queryReq.filters) {
    for (const filter of queryReq.filters) {
      const { type, column, value } = filter
      if (type === 'eq') {
        result = result.filter((row) => row[column] === value)
      } else if (type === 'neq') {
        result = result.filter((row) => row[column] !== value)
      } else if (type === 'gte') {
        result = result.filter((row) => row[column] >= value)
      } else if (type === 'lte') {
        result = result.filter((row) => row[column] <= value)
      }
    }
  }

  // Resolve relations
  result = result.map((item) => resolveRelations(queryReq.table, item, db))

  // Apply sorting
  if (queryReq.orderBy) {
    const { column, ascending } = queryReq.orderBy
    result.sort((a, b) => {
      const valA = a[column]
      const valB = b[column]
      if (valA === null || valA === undefined) return ascending ? -1 : 1
      if (valB === null || valB === undefined) return ascending ? 1 : -1
      if (typeof valA === 'string' && typeof valB === 'string') {
        return ascending ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return ascending ? (valA as any) - (valB as any) : (valB as any) - (valA as any)
    })
  }

  // Apply limit
  if (queryReq.limit !== undefined && queryReq.limit !== null) {
    result = result.slice(0, queryReq.limit)
  }

  // Handle single/maybeSingle
  if (queryReq.single) {
    if (result.length === 0) {
      return { data: null, error: { message: 'Row not found', code: 'PGRST116' } }
    }
    return { data: result[0], error: null }
  }

  if (queryReq.maybeSingle) {
    return { data: result[0] || null, error: null }
  }

  return { data: result, error: null }
}
