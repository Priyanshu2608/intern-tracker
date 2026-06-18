// Mock browser client for Supabase

class BrowserQueryBuilder {
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

  // Await support
  async then(onfulfilled?: (value: any) => any) {
    try {
      const res = await fetch('/api/mock-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.tableName,
          select: this.selectStr,
          filters: this.filters,
          orderBy: this.orderBy,
          limit: this.limitVal,
          single: this.isSingle,
          maybeSingle: this.isMaybeSingle
        })
      })
      const data = await res.json()
      if (onfulfilled) return onfulfilled(data)
      return data
    } catch (err: any) {
      const errorResult = { data: null, error: { message: err.message || 'Network error' } }
      if (onfulfilled) return onfulfilled(errorResult)
      return errorResult
    }
  }
}

export function createClient() {
  return {
    from: (tableName: string) => {
      return new BrowserQueryBuilder(tableName)
    },
    auth: {
      getUser: async () => {
        // Fallback placeholder (not used client-side in this project)
        return { data: { user: null }, error: null }
      },
      signInWithPassword: async () => {
        return { data: null, error: null }
      },
      signOut: async () => {
        return { error: null }
      }
    }
  }
}
