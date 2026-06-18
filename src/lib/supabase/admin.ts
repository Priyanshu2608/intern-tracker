import crypto from 'crypto'
import { getDb, saveDb } from './mock-db'

export function createAdminClient() {
  return {
    auth: {
      admin: {
        createUser: async (attributes: any) => {
          const db = getDb()

          // Check if email already exists
          const existing = db.users.find((u) => u.email === attributes.email)
          if (existing) {
            return {
              data: { user: null },
              error: { message: 'A user with this email address has already been registered' }
            }
          }

          const newUserId = crypto.randomUUID()
          const newUser = {
            id: newUserId,
            email: attributes.email,
            password: attributes.password,
            user_metadata: attributes.user_metadata || {}
          }

          db.users.push(newUser)

          // Simulate SQL trigger: auto-create user profile
          const newProfile = {
            id: newUserId,
            email: attributes.email,
            name: attributes.user_metadata?.name || 'New User',
            role: attributes.user_metadata?.role || 'intern',
            team_id: attributes.user_metadata?.team_id || null,
            status: 'active' as const,
            must_reset_password: attributes.user_metadata?.must_reset_password !== undefined ? attributes.user_metadata.must_reset_password : true,
            updated_at: new Date().toISOString()
          }

          db.profiles.push(newProfile)

          saveDb(db)
          return { data: { user: newUser }, error: null }
        },
        updateUserById: async (userId: string, attributes: any) => {
          const db = getDb()
          const userIdx = db.users.findIndex((u) => u.id === userId)
          if (userIdx === -1) {
            return { data: { user: null }, error: { message: 'User not found' } }
          }

          if (attributes.password) {
            db.users[userIdx].password = attributes.password
          }

          if (attributes.user_metadata) {
            db.users[userIdx].user_metadata = {
              ...db.users[userIdx].user_metadata,
              ...attributes.user_metadata
            }
          }

          // Sync public profile
          const profileIdx = db.profiles.findIndex((p) => p.id === userId)
          if (profileIdx !== -1) {
            if (attributes.user_metadata?.name) {
              db.profiles[profileIdx].name = attributes.user_metadata.name
            }
            if (attributes.user_metadata?.role) {
              db.profiles[profileIdx].role = attributes.user_metadata.role
            }
            if (attributes.user_metadata?.team_id !== undefined) {
              db.profiles[profileIdx].team_id = attributes.user_metadata.team_id
            }
            if (attributes.user_metadata?.must_reset_password !== undefined) {
              db.profiles[profileIdx].must_reset_password = attributes.user_metadata.must_reset_password
            }
          }

          saveDb(db)
          return { data: { user: db.users[userIdx] }, error: null }
        }
      }
    }
  }
}
