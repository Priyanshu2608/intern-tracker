import { NextResponse } from 'next/server'
import { getDb, executeQuery } from '@/lib/supabase/mock-db'

export async function POST(request: Request) {
  try {
    const payload = await request.json()
    const db = getDb()
    const result = executeQuery(db, payload)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({
      data: null,
      error: { message: err.message || 'Internal server error' }
    }, { status: 500 })
  }
}
