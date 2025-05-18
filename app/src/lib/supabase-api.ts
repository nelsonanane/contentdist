import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

/**
 * Creates a Supabase client for use in API routes
 * This uses the createServerClient from @supabase/ssr for better cookie handling
 */
export async function createAPIClient() {
  // In Next.js 15, cookies() is asynchronous and must be awaited
  const cookieStore = await cookies()
  
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value
          } catch (error) {
            console.error('Cookie get error:', error)
            return undefined
          }
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            console.error('Cookie set error:', error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            console.error('Cookie remove error:', error)
          }
        },
      },
    }
  )
}

/**
 * Gets the current user from the session
 * For use in API routes to authenticate requests
 * Uses getUser() for better security as recommended by Supabase
 */
export async function getUserFromSession() {
  try {
    // Since createAPIClient is now async, we need to await it
    const supabase = await createAPIClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user
  } catch (err) {
    console.error('Session verification failed:', err)
    return null
  }
}
