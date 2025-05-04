"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from './supabase-browser'

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signUp: (email: string, password: string, metadata?: object) => Promise<{
    data: { user: User | null; session: Session | null } | null
    error: AuthError | unknown | null
  }>
  signIn: (email: string, password: string) => Promise<{
    data: { user: User | null; session: Session | null } | null
    error: AuthError | unknown | null
  }>
  signInWithGoogle: () => Promise<void>
  signInWithFacebook: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{
    data: Record<string, unknown> | null
    error: AuthError | unknown | null
  }>
  updateUser: (data: object) => Promise<{
    data: { user: User | null } | null
    error: AuthError | unknown | null
  }>
  deleteAccount: () => Promise<{
    data: Record<string, unknown> | null
    error: AuthError | unknown | null
  }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const supabase = createClient()

  useEffect(() => {
    // Get session and user on mount
    const getInitialSession = async () => {
      setIsLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      
      // Set up auth state listener
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setSession(session)
          setUser(session?.user ?? null)
        }
      )
      
      setIsLoading(false)
      
      // Cleanup on unmount
      return () => {
        subscription.unsubscribe()
      }
    }
    
    getInitialSession()
  }, [supabase.auth])

  const signUp = async (email: string, password: string, metadata?: object) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            ...metadata,
            consent_version: '1.0',
            marketing_consent: false,
            data_processing_consent: true,
          },
        },
      })
      
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    })
  }

  const signInWithFacebook = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/callback`,
      },
    })
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      
      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const updateUser = async (data: object) => {
    try {
      const { data: userData, error } = await supabase.auth.updateUser({
        data,
      })
      
      return { data: userData, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const deleteAccount = async () => {
    try {
      // Update user data to mark for deletion
      const { error: updateError } = await supabase.auth.updateUser({
        data: { deletion_requested_at: new Date().toISOString() },
      })
      
      if (updateError) {
        return { data: null, error: updateError }
      }
      
      // In a real app, you'd use a server function with admin rights to actually delete the user
      // This is just marking the user for deletion
      return { data: { message: 'Account marked for deletion' }, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithFacebook,
    signOut,
    resetPassword,
    updateUser,
    deleteAccount,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
