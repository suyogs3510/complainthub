import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_PROJECT_URL || import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_PUBLIC_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = (url && anon) ? createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  },
  global: {
    headers: { 'x-application-name': 'complaint-management-system' }
  },
  db: {
    schema: 'public'
  }
}) : null

// Health check function
export const checkSupabaseConnection = async () => {
  if (!supabase) return { ok: false, message: 'Supabase not configured' }
  try {
    const { data, error } = await supabase.from('profiles').select('id').limit(1)
    if (error) throw error
    return { ok: true }
  } catch (err) {
    console.error('Supabase connection error:', err.message)
    return { ok: false, message: err.message }
  }
}

export const hasSupabaseConfig = !!(url && anon)
export const BUCKET = import.meta.env.VITE_SUPABASE_BUCKET || 'complaints'