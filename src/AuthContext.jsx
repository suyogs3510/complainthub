import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase, hasSupabaseConfig } from './supabaseClient'

const AuthContext = createContext({ user: null, isAdmin: false, loading: true, logout: async () => {} })

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  async function logout() {
    if (hasSupabaseConfig && supabase) {
      await supabase.auth.signOut()
    }
    setUser(null)
    setIsAdmin(false)
  }

  useEffect(() => {
    let mounted = true
    async function init() {
      if (!hasSupabaseConfig) {
        setLoading(false)
        return
      }
      const { data: { session } } = await supabase.auth.getSession()
      const u = session?.user ?? null
      if (mounted) setUser(u)
      if (u) {
        const { data } = await supabase.from('profiles').select('role').eq('id', u.id).single()
        setIsAdmin(data?.role === 'admin')
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    }
    init()
    if (hasSupabaseConfig) {
      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        const u = session?.user ?? null
        setUser(u)
        if (u) {
          supabase.from('profiles').select('role').eq('id', u.id).single().then(({ data }) => {
            setIsAdmin(data?.role === 'admin')
          })
        } else {
          setIsAdmin(false)
        }
      })
      return () => {
        authListener.subscription.unsubscribe()
        mounted = false
      }
    }
    return () => { mounted = false }
  }, [])

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
