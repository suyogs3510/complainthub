import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase, hasSupabaseConfig } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { User, Mail, Phone, Lock, Shield, Building2, ArrowLeft, CheckCircle2 } from 'lucide-react'

export default function Register() {
  const { user, isAdmin } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [studentId, setStudentId] = useState('')
  const [department, setDepartment] = useState('')
  const [departments, setDepartments] = useState([])
  const [agree, setAgree] = useState(false)
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

  useEffect(() => {
    async function fetchDepartments() {
      if (!hasSupabaseConfig) return
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('name')
      if (!error && data?.length > 0) {
        setDepartments(data)
        setDepartment(data[0].name)
      }
    }
    fetchDepartments()
  }, [])

  async function signUp() {
    setError('')
    setInfo('')
    if (!hasSupabaseConfig) { setError('Supabase not configured'); return }
    if (!name.trim()) { setError('Enter your full name'); return }
    if (!email.trim()) { setError('Enter your email'); return }
    if (!password) { setError('Enter a password'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (!studentId.trim()) { setError('Enter your Student ID'); return }
    if (!agree) { setError('Please agree to the terms'); return }
    setLoading(true)
    const { data, error: err } = await supabase.auth.signUp({ email, password })
    if (err) setError(err.message)
    else {
      const userId = data.user?.id
      if (userId) {
        const sid = studentId.trim().toUpperCase()
        await supabase.from('profiles').upsert({ 
          id: userId, 
          name, 
          phone, 
          role: 'user', 
          student_id: sid, 
          department 
        }, { onConflict: 'id' })
      }
      await supabase.auth.signOut()
      setInfo('Account created. Please login. If email confirmation is enabled, verify your email first.')
      setTimeout(() => navigate('/login'), 3000)
    }
    setLoading(false)
  }

  return (
    <div className="page login student-mode">
      <div className="animated-bg">
        <div className="shape s1"></div>
        <div className="shape s2"></div>
        <div className="shape s3"></div>
      </div>

      <div className="login-hero">
        <div className="back-home-wrapper">
          <Link to="/" className="btn-back">
            <ArrowLeft size={18} />
            <span>Back to Home</span>
          </Link>
        </div>

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
              className="login-icon-box student-gradient"
            >
              <User size={32} />
            </motion.div>
            <h2 className="login-title">Student Registration</h2>
            <p className="login-subtitle">Join our community and get your concerns heard.</p>
          </div>

          <div className="login-form">
            <div className="input-field">
              <label className="label">Full Name</label>
              <div className="input-group-modern">
                <input 
                  className="input-modern" 
                  placeholder="John Doe" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                />
                <User className="field-icon" size={20} />
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-field">
                <label className="label">Email Address</label>
                <div className="input-group-modern">
                  <input 
                    className="input-modern" 
                    type="email" 
                    placeholder="john@example.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                  />
                  <Mail className="field-icon" size={20} />
                </div>
              </div>

              <div className="input-field">
                <label className="label">Phone Number</label>
                <div className="input-group-modern">
                  <input 
                    className="input-modern" 
                    type="tel" 
                    placeholder="+91 9876543210" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                  />
                  <Phone className="field-icon" size={20} />
                </div>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-field">
                <label className="label">Student ID</label>
                <div className="input-group-modern">
                  <input 
                    className="input-modern" 
                    placeholder="STU2024001" 
                    value={studentId} 
                    onChange={e => setStudentId(e.target.value)} 
                  />
                  <Shield className="field-icon" size={20} />
                </div>
              </div>

              <div className="input-field">
                <label className="label">Department</label>
                <div className="input-group-modern">
                  <select 
                    className="input-modern" 
                    value={department} 
                    onChange={e => setDepartment(e.target.value)}
                    style={{ paddingRight: '12px' }}
                  >
                    {departments.map(dept => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))}
                  </select>
                  <Building2 className="field-icon" size={20} />
                </div>
              </div>
            </div>

            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="input-field">
                <label className="label">Password</label>
                <div className="input-group-modern">
                  <input 
                    className="input-modern" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                  <Lock className="field-icon" size={20} />
                </div>
              </div>

              <div className="input-field">
                <label className="label">Confirm Password</label>
                <div className="input-group-modern">
                  <input 
                    className="input-modern" 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirm} 
                    onChange={e => setConfirm(e.target.value)} 
                  />
                  <Lock className="field-icon" size={20} />
                </div>
              </div>
            </div>

            <div className="row" style={{ alignItems: 'center', gap: '10px', marginTop: '8px' }}>
              <div 
                className={`custom-checkbox ${agree ? 'checked' : ''}`}
                onClick={() => setAgree(!agree)}
                style={{ 
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '6px', 
                  border: '2px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  background: agree ? 'var(--accent)' : 'transparent',
                  borderColor: agree ? 'var(--accent)' : 'var(--border)'
                }}
              >
                {agree && <CheckCircle2 size={14} color="white" />}
              </div>
              <span className="login-subtitle" style={{ fontSize: '13px', cursor: 'pointer' }} onClick={() => setAgree(!agree)}>
                I agree to the <Link to="/terms" className="highlight-link">Terms</Link> and <Link to="/privacy" className="highlight-link">Privacy Policy</Link>
              </span>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="error-message">
                <span>⚠️ {error}</span>
              </motion.div>
            )}

            {info && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="info-message">
                <span>✅ {info}</span>
              </motion.div>
            )}

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-auth-modern student-btn" 
              disabled={loading || !agree} 
              onClick={signUp}
            >
              {loading ? <div className="loader"></div> : 'Create Account'}
            </motion.button>

            <div className="login-footer-links">
              <div className="link-group">
                <span>Already have an account?</span>
                <Link to="/login" className="highlight-link">Sign In</Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
