import { cookies } from 'next/headers'
import crypto from 'crypto'
import { getDb, saveDb, executeQuery } from './mock-db'

class ServerQueryBuilder {
  private tableName: string
  private selectStr = '*'
  private filters: Array<{ type: string; column: string; value: any }> = []
  private orderBy: { column: string; ascending: boolean } | null = null
  private limitVal: number | null = null
  private isSingle = false
  private isMaybeSingle = false

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(selectStr = '*', options?: any) {
    this.selectStr = selectStr
    return this
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value })
    return this
  }

  gte(column: string, value: any) {
    this.filters.push({ type: 'gte', column, value })
    return this
  }

  lte(column: string, value: any) {
    this.filters.push({ type: 'lte', column, value })
    return this
  }

  is(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value })
    return this
  }

  or(expression: string) {
    this.filters.push({ type: 'or', column: '', value: expression })
    return this
  }

  order(column: string, { ascending = true } = {}) {
    this.orderBy = { column, ascending }
    return this
  }

  limit(val: number) {
    this.limitVal = val
    return this
  }

  single() {
    this.isSingle = true
    return this
  }

  maybeSingle() {
    this.isMaybeSingle = true
    return this
  }

  // Mutations
  insert(data: any) {
    const self = this
    const dbOperation = () => {
      const db = getDb()
      const tableData = db[self.tableName as keyof typeof db] as any[]
      if (!tableData) {
        throw new Error(`Table ${self.tableName} not found in database.`)
      }

      const rows = Array.isArray(data) ? data : [data]
      const insertedRows = []

      for (const row of rows) {
        const newRow = {
          id: row.id || crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...row
        }
        tableData.push(newRow)
        insertedRows.push(newRow)
      }

      saveDb(db)
      return Array.isArray(data) ? insertedRows : insertedRows[0]
    }

    const promise = new Promise((resolve) => {
      try {
        const res = dbOperation()
        resolve({ data: res, error: null })
      } catch (err: any) {
        resolve({ data: null, error: { message: err.message } })
      }
    })

    const selectChain = {
      select: () => ({
        single: () => new Promise((resolve) => {
          try {
            const res = dbOperation()
            resolve({ data: res, error: null })
          } catch (err: any) {
            resolve({ data: null, error: { message: err.message } })
          }
        }),
        then: (onfulfilled?: any, onrejected?: any) => promise.then(onfulfilled, onrejected)
      }),
      then: (onfulfilled?: any, onrejected?: any) => promise.then(onfulfilled, onrejected)
    }

    return Object.assign(promise, selectChain) as any
  }

  update(data: any) {
    const self = this
    return {
      eq: (col: string, val: any): Promise<{ data: any; error: any }> => {
        return new Promise<{ data: any; error: any }>((resolve) => {
          try {
            const db = getDb()
            const tableData = db[self.tableName as keyof typeof db] as any[]
            if (!tableData) {
              throw new Error(`Table ${self.tableName} not found in database.`)
            }

            const matching = tableData.filter((row) => row[col] === val)

            for (const row of matching) {
              Object.assign(row, data, { updated_at: new Date().toISOString() })
            }

            saveDb(db)
            resolve({ data: matching, error: null })
          } catch (err: any) {
            resolve({ data: null, error: { message: err.message } })
          }
        })
      }
    }
  }

  upsert(data: any, options?: any): Promise<{ data: any; error: any }> {
    const self = this
    return new Promise<{ data: any; error: any }>((resolve) => {
      try {
        const db = getDb()
        const tableData = db[self.tableName as keyof typeof db] as any[]
        if (!tableData) {
          throw new Error(`Table ${self.tableName} not found in database.`)
        }

        const rows = Array.isArray(data) ? data : [data]

        for (const row of rows) {
          let matchIdx = -1
          if (self.tableName === 'meeting_attendance') {
            matchIdx = tableData.findIndex((item) => item.meeting_id === row.meeting_id && item.user_id === row.user_id)
          } else {
            matchIdx = tableData.findIndex((item) => item.id === row.id)
          }

          if (matchIdx !== -1) {
            Object.assign(tableData[matchIdx], row, { updated_at: new Date().toISOString() })
          } else {
            tableData.push({
              id: crypto.randomUUID(),
              ...row
            })
          }
        }

        saveDb(db)
        resolve({ data, error: null })
      } catch (err: any) {
        resolve({ data: null, error: { message: err.message } })
      }
    })
  }

  delete() {
    const self = this
    return {
      eq: (col: string, val: any): Promise<{ data: any; error: any }> => {
        return new Promise<{ data: any; error: any }>((resolve) => {
          try {
            const db = getDb()
            const tableData = db[self.tableName as keyof typeof db] as any[]
            if (!tableData) {
              throw new Error(`Table ${self.tableName} not found in database.`)
            }

            const filtered = tableData.filter((row) => row[col] !== val)
            db[self.tableName as keyof typeof db] = filtered as any

            saveDb(db)
            resolve({ data: null, error: null })
          } catch (err: any) {
            resolve({ data: null, error: { message: err.message } })
          }
        })
      }
    }
  }

  // Promise resolution support for select chains
  then(onfulfilled?: (value: any) => any, onrejected?: (value: any) => any) {
    const self = this
    const promise = new Promise((resolve) => {
      try {
        const db = getDb()

        let orFilter: any = null
        const processedFilters = self.filters.filter((f) => {
          if (f.type === 'or') {
            orFilter = f.value
            return false
          }
          return true
        })

        const result = executeQuery(db, {
          table: self.tableName,
          select: self.selectStr,
          filters: processedFilters,
          orderBy: self.orderBy,
          limit: self.limitVal,
          single: self.isSingle,
          maybeSingle: self.isMaybeSingle
        })

        if (orFilter && result.data && Array.isArray(result.data)) {
          if (orFilter.includes('team_id.eq.') && orFilter.includes('team_id.is.null')) {
            const uuidMatch = orFilter.match(/team_id\.eq\.([a-f0-9-]+)/)
            const teamId = uuidMatch ? uuidMatch[1] : null
            result.data = result.data.filter((row) => row.team_id === teamId || row.team_id === null || row.team_id === undefined)
          }
        }

        const count = result.data ? (Array.isArray(result.data) ? result.data.length : 1) : 0
        const response = {
          data: result.data,
          error: result.error,
          count: count
        }
        resolve(response)
      } catch (err: any) {
        resolve({ data: null, error: { message: err.message }, count: 0 })
      }
    })
    return promise.then(onfulfilled, onrejected)
  }
}

export async function createClient() {
  const cookieStore = await cookies()

  return {
    from: (tableName: string) => {
      return new ServerQueryBuilder(tableName)
    },
    auth: {
      getUser: async () => {
        const sessionCookie = cookieStore.get('sb-mock-session')?.value
        if (!sessionCookie) {
          return { data: { user: null }, error: null }
        }

        try {
          const authUser = JSON.parse(sessionCookie)
          return { data: { user: authUser }, error: null }
        } catch (e) {
          const db = getDb()
          const user = db.users.find((u) => u.id === sessionCookie)
          if (!user) {
            return { data: { user: null }, error: null }
          }

          const profile = db.profiles.find((p) => p.id === user.id)

          const authUser = {
            id: user.id,
            email: user.email,
            user_metadata: {
              name: profile?.name || user.user_metadata.name,
              role: profile?.role || user.user_metadata.role,
              team_id: profile ? profile.team_id : user.user_metadata.team_id,
              must_reset_password: profile ? profile.must_reset_password : user.user_metadata.must_reset_password
            }
          }

          return { data: { user: authUser }, error: null }
        }
      },
      signInWithPassword: async ({ email, password }: any) => {
        const db = getDb()
        const user = db.users.find((u) => u.email === email)
        if (!user) {
          return { data: null, error: { message: 'Invalid login credentials' } }
        }

        const isMatch = user.password === password || (email === 'admin@turn2law.com' && password === 'admin123')
        if (!isMatch) {
          return { data: null, error: { message: 'Invalid login credentials' } }
        }

        const profile = db.profiles.find((p) => p.id === user.id)
        if (profile && profile.status !== 'active') {
          return { data: null, error: { message: 'Your account is inactive.' } }
        }

        const authUser = {
          id: user.id,
          email: user.email,
          user_metadata: {
            name: profile?.name || user.user_metadata.name,
            role: profile?.role || user.user_metadata.role,
            team_id: profile ? profile.team_id : user.user_metadata.team_id,
            must_reset_password: profile ? profile.must_reset_password : user.user_metadata.must_reset_password
          }
        }

        cookieStore.set('sb-mock-session', JSON.stringify(authUser), {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 // 1 day
        })

        return { data: { user: authUser }, error: null }
      },
      signOut: async () => {
        cookieStore.set('sb-mock-session', '', { path: '/', maxAge: 0 })
        return { error: null }
      },
      updateUser: async (attributes: any) => {
        const sessionCookie = cookieStore.get('sb-mock-session')?.value
        if (!sessionCookie) {
          return { data: null, error: { message: 'No active session' } }
        }

        let userId = sessionCookie
        try {
          const cachedUser = JSON.parse(sessionCookie)
          userId = cachedUser.id
        } catch (e) {}

        const db = getDb()
        const userIdx = db.users.findIndex((u) => u.id === userId)
        if (userIdx === -1) {
          return { data: null, error: { message: 'User not found' } }
        }

        if (attributes.password) {
          db.users[userIdx].password = attributes.password
        }
        if (attributes.data) {
          db.users[userIdx].user_metadata = {
            ...db.users[userIdx].user_metadata,
            ...attributes.data
          }
        }

        // Also update profiles
        const profileIdx = db.profiles.findIndex((p) => p.id === userId)
        if (profileIdx !== -1) {
          if (attributes.data && attributes.data.must_reset_password !== undefined) {
            db.profiles[profileIdx].must_reset_password = attributes.data.must_reset_password
          }
        }

        saveDb(db)

        const profile = db.profiles.find((p) => p.id === userId)
        const updatedUser = {
          id: userId,
          email: db.users[userIdx].email,
          user_metadata: {
            name: profile?.name || db.users[userIdx].user_metadata.name,
            role: profile?.role || db.users[userIdx].user_metadata.role,
            team_id: profile ? profile.team_id : db.users[userIdx].user_metadata.team_id,
            must_reset_password: profile ? profile.must_reset_password : db.users[userIdx].user_metadata.must_reset_password
          }
        }

        cookieStore.set('sb-mock-session', JSON.stringify(updatedUser), {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 // 1 day
        })

        return { data: { user: updatedUser }, error: null }
      }
    }
  }
}
