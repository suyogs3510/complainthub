import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, hasSupabaseConfig } from '../supabaseClient'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { ShieldCheck, ArrowLeft, Mail, Lock, Sparkles, User, Shield } from 'lucide-react'

export default function Login({ mode = 'student' }) {
  const { user, isAdmin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      if (isAdmin) navigate('/admin')
      else navigate('/dashboard')
    }
  }, [user, isAdmin, navigate])

  async function signIn() {
    setError('')
    setInfo('')
    if (!hasSupabaseConfig) { setError('Supabase not configured'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password })
    
    if (err) {
      const msg = (err.message || '').toLowerCase()
      if (msg.includes('confirm') || msg.includes('verified')) {
        setInfo('Email not confirmed. Click "Resend Verification Email" and verify from your inbox.')
      }
      setError(err.message)
      setLoading(false)
      return
    }

    const uid = data?.user?.id
    if (uid) {
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', uid).single()
      
      if (mode === 'admin') {
        if (prof?.role === 'admin') {
          navigate('/admin')
        } else {
          await supabase.auth.signOut()
          setError('Access denied. This is the Admin login page. Students should use the Student login.')
        }
      } else {
        if (prof?.role !== 'admin') {
          navigate('/dashboard')
        } else {
          await supabase.auth.signOut()
          setError('Access denied. This is the Student login page. Admins should use the Admin login.')
        }
      }
    } else {
      navigate('/dashboard')
    }
    
    setLoading(false)
  }

  return (
    <div className={`page login ${mode}-mode`}>
      <div className="login-hero">
        <div className="animated-bg">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
              x: [0, 50, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="shape s1"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -120, 0],
              x: [0, -40, 0],
              y: [0, 60, 0]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="shape s2"
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              x: [0, 20, 0],
              y: [0, -40, 0]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            className="shape s3"
          />
        </div>

        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="back-home-wrapper"
          >
            <Link to="/" className="btn-back">
              <ArrowLeft size={18} />
              <span>Back to Home</span>
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card glass deep col auth-card-modern"
          >
            <div className="login-header">
              <motion.div 
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className={`login-icon-box ${mode === 'admin' ? 'admin-gradient' : 'student-gradient'}`}
              >
                {mode === 'admin' ? <ShieldCheck size={32} /> : <Shield size={32} />}
              </motion.div>
              <div className="col" style={{ gap: 4 }}>
                <h2 className="login-title">
                  {mode === 'admin' ? 'Admin Access' : 'Student Login'}
                  <Sparkles className="inline-icon text-accent" size={18} />
                </h2>
                <p className="login-subtitle">
                  {mode === 'admin' ? 'Manage complaints and platform insights' : 'Track your complaints and get quick resolutions'}
                </p>
              </div>
            </div>
            
            <div className="login-form">
              <div className="input-field">
                <label className="label">Email Address</label>
                <div className="input-group-modern">
                  <Mail className="field-icon" size={18} />
                  <input 
                    className="input-modern" 
                    type="email" 
                    placeholder="name@university.edu" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                </div>
              </div>

              <div className="input-field">
                <label className="label">Password</label>
                <div className="input-group-modern">
                  <Lock className="field-icon" size={18} />
                  <input 
                    className="input-modern" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="error-message"
                  >
                    <Shield size={16} />
                    <span>{error}</span>
                  </motion.div>
                )}
                {info && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="info-message"
                  >
                    <Sparkles size={16} />
                    <span>{info}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className={`btn-auth-modern ${mode === 'admin' ? 'admin-btn' : 'student-btn'}`} 
                disabled={loading} 
                onClick={signIn}
              >
                {loading ? (
                  <div className="loader"></div>
                ) : (
                  <>
                    <span>Sign In Now</span>
                    <ArrowLeft className="rotate-180" size={18} />
                  </>
                )}
              </motion.button>

              <div className="login-footer-links">
                {mode === 'student' ? (
                  <>
                    <div className="link-group">
                      <span>New here?</span>
                      <Link to="/register" className="highlight-link">Create Account</Link>
                    </div>
                    <Link to="/admin/login" className="mode-switch-link">
                      <Shield size={14} />
                      <span>Admin Portal</span>
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="link-group">
                      <span>Not an admin?</span>
                      <Link to="/login" className="highlight-link">Student Login</Link>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
