import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase, BUCKET } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import ComplaintForm from '../components/ComplaintForm.jsx'
import ComplaintList from '../components/ComplaintList.jsx'
import { useNavigate, Link } from 'react-router-dom'
import { Sparkles as SparklesIcon, Trash2 as TrashIcon, BrainCircuit, Wand2, Sun, Moon, PhoneCall, MapPin, AlertTriangle, Search, Filter, Zap } from 'lucide-react'
import { summarizeComplaint, analyzeSentiment } from '../utils/ai'

const statuses = ['Pending', 'In Progress', 'Resolved']

const GraduationCap = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 3 9 3 12 0v-5" />
  </svg>
)
const Info = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
)
const Camera = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
    <circle cx="12" cy="13" r="4"></circle>
  </svg>
)
const Trash2 = ({ size = 24, className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="3 6 5 6 21 6"></polyline>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
    <line x1="10" y1="11" x2="10" y2="17"></line>
    <line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
)
export default function UserDashboard() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [items, setItems] = useState([])
  const [categories, setCategories] = useState(['Academic', 'Administrative', 'Facilities', 'Faculty', 'Hostel', 'Library', 'Transportation', 'Ragging', 'Other'])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [section, setSection] = useState('dashboard')
  const [profile, setProfile] = useState(null)
  const [statusLimit, setStatusLimit] = useState(3)
  const [uploading, setUploading] = useState(false)
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light')
  const [isEditing, setIsEditing] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [sortBy, setSortBy] = useState('created_at')
  const [editForm, setEditForm] = useState({
    name: '',
    student_id: '',
    phone: '',
    department: '',
    hostel: ''
  })

  useEffect(() => {
    if (profile) {
      setEditForm({
        name: profile.name || '',
        student_id: profile.student_id || '',
        phone: profile.phone || '',
        department: profile.department || '',
        hostel: profile.hostel || ''
      })
    }
  }, [profile])

  async function updateProfile() {
    try {
      setLoading(true)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: editForm.name,
          student_id: editForm.student_id,
          phone: editForm.phone,
          department: editForm.department,
          hostel: editForm.hostel,
          updated_at: new Date()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => ({ ...prev, ...editForm }))
      setIsEditing(false)
      notify('Success', 'Profile updated successfully', 'success')
    } catch (err) {
      notify('Error', err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  async function uploadAvatar(event) {
    try {
      setUploading(true)
      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.')
      }

      const file = event.target.files[0]
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Math.random()}.${fileExt}`
      
      let uploadBucket = 'avatars'
      let filePath = `${fileName}`

      // 1. Try to create bucket if it doesn't exist
      try {
        await supabase.storage.createBucket('avatars', { public: true })
      } catch (e) {
        // Ignore creation error
      }

      // 2. Attempt upload to 'avatars' bucket
      let { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      // 3. Fallback to default BUCKET if 'avatars' not found
      if (uploadError && uploadError.message.includes('Bucket not found')) {
        uploadBucket = BUCKET
        filePath = `avatars/${fileName}` // Use a subfolder in the existing bucket
        
        const { error: fallbackError } = await supabase.storage
          .from(uploadBucket)
          .upload(filePath, file)
        
        if (fallbackError) {
          if (fallbackError.message.includes('Bucket not found')) {
            throw new Error(`Storage error: No usable bucket found. Please create a public bucket named '${BUCKET}' or 'avatars' in your Supabase Dashboard.`)
          }
          throw fallbackError
        }
        uploadError = null
      }

      if (uploadError) throw uploadError

      // 4. Get public URL from the successful bucket
      const { data: { publicUrl } } = supabase.storage
        .from(uploadBucket)
        .getPublicUrl(filePath)

      // 5. Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) {
        if (updateError.message.includes('column "avatar_url"')) {
          throw new Error("Database error: 'avatar_url' column missing in 'profiles' table.")
        }
        throw updateError
      }

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }))
      notify('Success', 'Profile photo updated!', 'success')
    } catch (err) {
      notify('Error', err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  function notify(title, body, type = 'info') {
    // Browser notification
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try { new Notification(title, { body }) } catch {}
    }
    // App toast
    window.dispatchEvent(new CustomEvent('app-notify', { 
      detail: { message: `${title}: ${body}`, type } 
    }))
  }
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])
  async function removeAvatar() {
    try {
      if (!window.confirm('Are you sure you want to remove your profile photo?')) return
      setUploading(true)
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => ({ ...prev, avatar_url: null }))
      notify('Success', 'Profile photo removed', 'success')
    } catch (err) {
      notify('Error', err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function fetchCategories() {
    console.log('UserDashboard fetching categories...')
    try {
      const { data, error } = await supabase.from('categories').select('name').order('name')
      console.log('UserDashboard categories result:', { data, error })
      
      if (error) {
        console.error('UserDashboard categories error:', error)
        // Keep default categories
      } else if (data && data.length > 0) {
        setCategories(data.map(c => c.name))
      }
    } catch (err) {
      console.error('UserDashboard categories fetch failed:', err)
      // Keep default categories
    }
  }

  async function fetchAll(background = false) {
    setError('')
    if (!background) setLoading(true)
    const { data, error: err } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setItems(data ?? [])
    
    // Fetch categories
    await fetchCategories()
    
    if (!background) setLoading(false)
  }

  async function fetchProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data || null)
  }

  useEffect(() => {
    if (!user?.id) return
    fetchAll()
    fetchProfile()
    
    // Set up polling fallback for real-time updates (every 10 seconds)
    const pollInterval = setInterval(() => {
      fetchAll(true)
    }, 10000)

    const channel = supabase.channel('complaints-user-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints', filter: `user_id=eq.${user.id}` }, payload => {
        const { eventType: e, new: now, old } = payload
        
        if (e === 'INSERT') {
          setItems(prev => {
            if (prev.some(c => c.id === now.id)) return prev;
            return [now, ...prev];
          })
          notify('Complaint Submitted', `${now.title || 'Complaint created'}`, 'info')
        } else if (e === 'UPDATE') {
          setItems(prev => prev.map(c => c.id === now.id ? { ...c, ...now } : c))
          if (old && old.status !== now.status) {
            const code = `CMP${String(now.id).padStart(3,'0')}`
            notify('Complaint Status Updated', `${code} is now ${now.status}`, 'success')
          }
        } else if (e === 'DELETE') {
          setItems(prev => prev.filter(c => c.id !== old.id))
        }
      })
      .subscribe()
    return () => { 
      supabase.removeChannel(channel)
      clearInterval(pollInterval)
    }
  }, [user?.id])


  const counts = useMemo(() => {
    const total = items.length
    const pending = items.filter(c => c.status === 'Pending').length
    const inProgress = items.filter(c => c.status === 'In Progress').length
    const resolved = items.filter(c => c.status === 'Resolved').length
    return { total, pending, inProgress, resolved }
  }, [items])

  const filteredItems = useMemo(() => {
    let filtered = items
    
    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }
    
    // Apply category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(c => c.category === categoryFilter)
    }
    
    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(searchLower) || 
        c.description.toLowerCase().includes(searchLower)
      )
    }
    
    // Sort the filtered items
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { 'High': 0, 'Medium': 1, 'Low': 2 }
          return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1)
        case 'category':
          return a.category.localeCompare(b.category)
        case 'status':
          const statusOrder = { 'Pending': 0, 'In Progress': 1, 'Resolved': 2 }
          return (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0)
        case 'created_at':
        default:
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })
    
    return filtered
  }, [items, statusFilter, categoryFilter, search, sortBy])

  const recent = useMemo(() => filteredItems.slice(0, 3), [filteredItems])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="container fluid col" style={{ gap:16 }}>
      <div className="admin-layout">
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="sidebar col"
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="card col profile-sidebar-card" 
            style={{ alignItems:'center', gap:10, padding: '20px 10px' }}
          >
            {profile?.avatar_url ? (
              <div className="avatar-wrapper" style={{ position: 'relative' }}>
                <img 
                  src={profile.avatar_url} 
                  style={{ width: 85, height: 85, borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--accent)', padding: '3px', background: 'var(--card)' }} 
                  alt="Profile" 
                />
                <div className="status-indicator online"></div>
              </div>
            ) : (
              <div className="logo" style={{ width: 85, height: 85, fontSize: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {(profile?.name || user.email || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="col" style={{ alignItems: 'center', gap: 4 }}>
              <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>{profile?.name || user.email}</strong>
              <span className="user-badge" style={{ fontSize: '0.85rem' }}>{profile?.student_id || `STU${new Date().getFullYear()}${String(user.id).slice(0,4)}`}</span>
            </div>
          </motion.div>
          
          <div className="col" style={{ gap: 4 }}>
            {[
              { id: 'dashboard', icon: '📊', label: 'Dashboard', short: 'Dash' },
              { id: 'submit', icon: '📝', label: 'Submit Complaint', short: 'Submit' },
              { id: 'list', icon: '📂', label: 'My Complaints', short: 'Complaints' },
              { id: 'status', icon: '📈', label: 'Complaint Status', short: 'Status' },
              { id: 'profile', icon: '👤', label: 'Profile', short: 'Profile' }
            ].map((item) => (
              <motion.button 
                key={item.id}
                whileHover={{ x: 5, backgroundColor: 'var(--accent-light)' }}
                whileTap={{ scale: 0.95 }}
                className={`side-link ${section === item.id ? 'active' : ''}`} 
                onClick={() => setSection(item.id)}
              >
                <span className="icon">{item.icon}</span>
                <span className="label desktop-only">{item.label}</span>
                <span className="label mobile-only">{item.short}</span>
              </motion.button>
            ))}
          </div>

          <div className="sidebar-footer col" style={{ gap: 12, padding: '20px 10px', marginTop: 'auto' }}>
            <div className="row" style={{ gap: 12, justifyContent: 'center' }}>
              <button 
                className="btn danger btn-sm"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>

        </motion.div>
        <div className="main-content" style={{ flex:1, padding:24, overflowY:'auto' }}>
          <AnimatePresence mode="wait">
            {section === 'dashboard' && (
              <motion.div 
                key="dashboard"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20 }}
                className="col" 
                style={{ gap:24 }}
              >
                <motion.div variants={itemVariants} className="row" style={{ justifyContent:'space-between' }}>
                  <h1 className="font-display text-2xl font-bold">My Dashboard</h1>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn brand pulse-glow" 
                    onClick={() => setShowForm(true)}
                  >
                    + New Complaint
                  </motion.button>
                </motion.div>
                
                <motion.div variants={itemVariants} className="grid" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
                  {[
                    { label: 'Total', value: items.length, icon: '📊', color: 'var(--accent)', bg: 'rgba(var(--accent-rgb), 0.1)' },
                    { label: 'Pending', value: items.filter(i => i.status === 'Pending').length, icon: '⏳', color: 'var(--warning)', bg: 'rgba(var(--warning-rgb), 0.1)' },
                    { label: 'Resolved', value: items.filter(i => i.status === 'Resolved').length, icon: '✅', color: 'var(--success)', bg: 'rgba(var(--success-rgb), 0.1)' }
                  ].map((stat, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                      className="card row" 
                      style={{ gap:16, background:'var(--card)' }}
                    >
                      <div className="icon-box" style={{ background: stat.bg, color: stat.color, padding:12, borderRadius:12 }}>{stat.icon}</div>
                      <div className="col" style={{ gap:2 }}>
                        <span className="muted text-sm">{stat.label}</span>
                        <strong className="text-xl">{stat.value}</strong>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div variants={itemVariants} className="card col" style={{ padding:0, overflow:'hidden' }}>
                  <div style={{ padding:16, borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
                    <strong>Recent Activity</strong>
                  </div>
                  <ComplaintList items={items.slice(0, 5)} onUpdate={fetchAll} />
                </motion.div>
              </motion.div>
            )}
            
            {section === 'list' && (
              <motion.div 
                key="list"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="col"
                style={{ gap: 20 }}
              >
                <h1 className="font-display text-2xl font-bold">My Complaints</h1>
                
                <div className="list-toolbar" style={{ marginBottom: 20, gap: 16 }}>
                  <div className="search-box" style={{ flex: 1, padding: '8px 16px' }}>
                    <Search size={18} className="muted" />
                    <input
                      className="toolbar-input"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search by title or description..."
                    />
                  </div>
                  
                  <div className="filter-box" style={{ borderLeft: '4px solid var(--info)' }}>
                    <div className="icon-box" style={{ background: 'rgba(var(--info-rgb), 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                      <Filter size={16} style={{ color: 'var(--info)' }} />
                    </div>
                    <select
                      className="toolbar-select"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Status</option>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  
                  <div className="filter-box" style={{ borderLeft: '4px solid var(--accent)' }}>
                    <div className="icon-box" style={{ background: 'rgba(var(--accent-rgb), 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                      <Filter size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <select
                      className="toolbar-select"
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  
                  <div className="filter-box" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <div className="icon-box" style={{ background: 'rgba(var(--warning-rgb), 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                      <Filter size={16} style={{ color: 'var(--warning)' }} />
                    </div>
                    <select
                      className="toolbar-select"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="created_at">Sort: Newest</option>
                      <option value="priority">Sort: Priority</option>
                      <option value="category">Sort: Category</option>
                      <option value="status">Sort: Status</option>
                    </select>
                  </div>
                </div>
                
                <ComplaintList items={filteredItems} onUpdate={fetchAll} />
              </motion.div>
            )}

            {section === 'submit' && (
              <motion.div 
                key="submit"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="col"
                style={{ gap: 20 }}
              >
                <h1 className="font-display text-2xl font-bold">Submit New Complaint</h1>
                <div className="card">
                  <ComplaintForm onCreated={(newComplaint) => {
                    // Optimistically add to list so it shows immediately
                    if (newComplaint) {
                      setItems(prev => {
                        // Prevent duplicates if real-time event already fired
                        if (prev.some(c => c.id === newComplaint.id)) return prev;
                        return [newComplaint, ...prev];
                      });
                    }
                    setSection('list');
                  }} />
                </div>
              </motion.div>
            )}

            {section === 'status' && (
              <motion.div 
                key="status"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="col" 
                style={{ gap:20 }}
              >
                <h1 className="font-display text-2xl font-bold">Complaint Status</h1>
                
                <div className="list-toolbar" style={{ marginBottom: 20, gap: 16 }}>
                  <div className="search-box" style={{ flex: 1, padding: '8px 16px' }}>
                    <Search size={18} className="muted" />
                    <input
                      className="toolbar-input"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search by title or description..."
                    />
                  </div>
                  
                  <div className="filter-box" style={{ borderLeft: '4px solid var(--info)' }}>
                    <div className="icon-box" style={{ background: 'rgba(var(--info-rgb), 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                      <Filter size={16} style={{ color: 'var(--info)' }} />
                    </div>
                    <select
                      className="toolbar-select"
                      value={statusFilter}
                      onChange={e => setStatusFilter(e.target.value)}
                    >
                      <option value="All">All Status</option>
                      {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  
                  <div className="filter-box" style={{ borderLeft: '4px solid var(--accent)' }}>
                    <div className="icon-box" style={{ background: 'rgba(var(--accent-rgb), 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                      <Filter size={16} style={{ color: 'var(--accent)' }} />
                    </div>
                    <select
                      className="toolbar-select"
                      value={categoryFilter}
                      onChange={e => setCategoryFilter(e.target.value)}
                    >
                      <option value="All">All Categories</option>
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>
                  
                  <div className="filter-box" style={{ borderLeft: '4px solid var(--warning)' }}>
                    <div className="icon-box" style={{ background: 'rgba(var(--warning-rgb), 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                      <Filter size={16} style={{ color: 'var(--warning)' }} />
                    </div>
                    <select
                      className="toolbar-select"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="created_at">Sort: Newest</option>
                      <option value="priority">Sort: Priority</option>
                      <option value="category">Sort: Category</option>
                      <option value="status">Sort: Status</option>
                    </select>
                  </div>
                </div>
                
                <div className="col" style={{ gap:16 }}>
                  {filteredItems.length === 0 ? (
                    <div className="card muted" style={{ textAlign:'center', padding:40 }}>No complaints found.</div>
                  ) : filteredItems.slice(0, statusLimit).map((c, i) => {
                    const s = c.status
                    
                    // Timeline step mapping
                    const step1Class = 'completed'
                    const step2Class = s === 'Pending' ? 'current' : (s === 'In Progress' ? 'current' : 'completed')
                    const step3Class = s === 'Resolved' ? 'completed' : 'upcoming'

                    // Color helpers for dots
                    const colors = {
                      completed: 'var(--success)',
                      current: 'var(--warning)',
                      upcoming: 'var(--border)',
                      pending: 'var(--danger)'
                    }
                    
                    // Signal color mapping for the main title
                    const signalColor = 
                      s === 'Pending' ? colors.pending : 
                      s === 'In Progress' ? colors.current : 
                      s === 'Resolved' ? colors.completed : 
                      'var(--muted)' 
                    
                    return (
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={c.id} 
                        className="card col" 
                        style={{ gap:16 }}
                      >
                        <div className="row" style={{ justifyContent:'space-between', alignItems: 'center' }}>
                          <div className="col" style={{ gap:4 }}>
                            <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                              <div 
                                className="status-signal" 
                                style={{ 
                                  width: 12, 
                                  height: 12, 
                                  borderRadius: '50%', 
                                  backgroundColor: signalColor,
                                  boxShadow: `0 0 10px ${signalColor}`
                                }} 
                              />
                              <strong className="text-lg">{c.title}</strong>
                            </div>
                            <span className="muted text-xs">ID: {c.id.slice(0,8)} • {new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}</span>
                          </div>
                          <span className={`pill status ${s.toLowerCase().replace(' ', '')}`}>{s}</span>
                        </div>
                        <div className="timeline-modern">
                          <div className={`timeline-step ${step1Class}`}>
                            <div className="timeline-dot"></div>
                            <div className="col" style={{ gap:4 }}>
                              <strong>Submitted</strong>
                              <span className="muted">{new Date(c.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: true })}</span>
                            </div>
                          </div>
                          <div className={`timeline-step ${step2Class}`}>
                            <div className="timeline-dot"></div>
                            <div className="col" style={{ gap:4 }}>
                              <strong>Processing</strong>
                              <span className="muted">
                                {s === 'Pending' ? 'Pending' : 
                                 s === 'In Progress' ? `In Progress • ${new Date(c.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: true })}` : 
                                 `Completed • ${new Date(c.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: true })}`}
                              </span>
                            </div>
                          </div>
                          <div className={`timeline-step ${step3Class}`}>
                            <div className="timeline-dot"></div>
                            <div className="col" style={{ gap:4 }}>
                              <strong>Resolution</strong>
                              <span className="muted">
                                {s === 'Resolved' ? `Resolved • ${new Date(c.updated_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short', hour12: true })}` : 'Upcoming'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* AI Summary Section */}
                        <div className="ai-summary-box">
                          <div className="row" style={{ gap:8, alignItems:'center', marginBottom:6, justifyContent:'space-between' }}>
                            <div className="row" style={{ gap:8, alignItems:'center' }}>
                              <BrainCircuit size={14} className="text-accent sparkle-icon" />
                              <strong className="text-xs">AI Insight</strong>
                            </div>
                            <span className="text-xs muted" style={{ fontSize:10 }}>{s}</span>
                          </div>
                          <p className="text-xs italic muted" style={{ lineHeight:1.4 }}>
                            "{summarizeComplaint(c.description)}"
                          </p>
                          <div className="row" style={{ gap:12, marginTop:8 }}>
                            <div className="ai-stat-mini">
                              <span>Mood:</span>
                              <span>{c.status === 'Resolved' ? '😊' : analyzeSentiment(c.description) < -0.2 ? '😠' : analyzeSentiment(c.description) > 0.2 ? '😊' : '😐'}</span>
                            </div>
                            <div className="ai-stat-mini">
                              <span>Priority:</span>
                              <span className={c.priority === 'High' ? 'text-danger' : ''}>{c.priority || 'Medium'}</span>
                            </div>
                          </div>
                        </div>

                        {(c.admin_remark || c.admin_image_url) && (
                          <div style={{ marginTop:12, padding:'12px', background:'var(--bg)', borderRadius:8, border:'1px solid var(--border)' }}>
                            <div className="row" style={{ gap:8, alignItems:'center', marginBottom:4 }}>
                              <span className="icon">💬</span>
                              <strong>Admin Message</strong>
                            </div>
                            {c.admin_remark && <div className="text-sm muted" style={{ marginBottom: 8 }}>{c.admin_remark}</div>}
                            {c.admin_image_url && (
                              <div 
                                style={{ 
                                  width: '100%', 
                                  background: '#1e293b', 
                                  borderRadius: '12px', 
                                  border: '1px solid #334155',
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  padding: '12px',
                                  textAlign: 'center'
                                }}
                                onClick={() => window.open(c.admin_image_url, '_blank', 'noopener,noreferrer')}
                              >
                                <img 
                                  src={c.admin_image_url} 
                                  alt="Admin Attachment"
                                  style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }}
                                />
                                <p style={{ color: '#94a3b8', marginTop: '8px', fontSize: '12px' }}>Click to open in new tab</p>
                              </div>
                            )}
                          </div>
                        )}

                        {c.category === 'Ragging' && (
                          <div style={{ marginTop:12, padding:'12px', background:'rgba(var(--danger-rgb), 0.1)', borderRadius:8, border:'1px solid rgba(var(--danger-rgb), 0.3)' }}>
                            <div className="row" style={{ gap:8, alignItems:'center', marginBottom:8, color:'var(--danger)' }}>
                              <AlertTriangle size={16} />
                              <strong className="text-sm">Emergency Actions</strong>
                            </div>
                            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                              <a href="tel:100" className="btn danger small" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
                                <PhoneCall size={14} /> Call Police
                              </a>
                              {(() => {
                                const locMatch = (c.description || '').match(/\n\n📍 Emergency Location: (https:\/\/maps\.google\.com\/\?q=[0-9.,-]+)/);
                                return locMatch ? (
                                  <a href={locMatch[1]} target="_blank" rel="noreferrer" className="btn brand small" style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' }}>
                                    <MapPin size={14} /> View Location
                                  </a>
                                ) : null;
                              })()}
                            </div>
                          </div>
                        )}

                        <div className="row" style={{ gap: 8, marginTop: 12 }}>
                          <Link to={`/complaint/${c.id}`} className="btn secondary" style={{ flex: 1, textAlign: 'center' }}>View Full Details</Link>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
                {filteredItems.length > statusLimit && (
                  <div className="row" style={{ justifyContent:'center' }}>
                    <button className="btn show-more" onClick={() => setStatusLimit(filteredItems.length)}>Show More</button>
                  </div>
                )}
              </motion.div>
            )}
            
            {section === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="card col profile-card" 
                style={{ gap:12 }}
              >
                <div className="row" style={{ justifyContent:'space-between', alignItems: 'center' }}>
                  <strong>Profile Details</strong>
                  <div className="row" style={{ gap: 10 }}>
                    {isEditing ? (
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn brand btn-sm" onClick={updateProfile} disabled={loading}>
                          {loading ? <div className="spinner-small" /> : 'Save Changes'}
                        </button>
                        <button className="btn secondary btn-sm" onClick={() => setIsEditing(false)}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn brand btn-sm" onClick={() => setIsEditing(true)}>Edit Profile</button>
                    )}
                    <span className="user-badge">{profile?.student_id || `STU${new Date().getFullYear()}${String(user.id).slice(0,4)}`}</span>
                  </div>
                </div>
                <div className="profile-header">
                  <div className="profile-avatar-container">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="profile-avatar-img" />
                    ) : (
                      <div className="profile-avatar">
                        {(profile?.name || user.email || '?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
                      </div>
                    )}
                    <div className="avatar-actions">
                      <label className="avatar-upload-label" title="Upload Photo">
                        <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} style={{ display: 'none' }} />
                        <div className="avatar-edit-icon">
                          {uploading ? <div className="spinner-small" /> : <Camera size={16} />}
                        </div>
                      </label>
                      {profile?.avatar_url && (
                        <button 
                          className="avatar-delete-btn" 
                          onClick={removeAvatar} 
                          disabled={uploading}
                          title="Remove Photo"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="col" style={{ gap:4 }}>
                    <div className="row" style={{ gap:8 }}>
                      <span className="badge">👤</span>
                      {isEditing ? (
                        <input 
                          className="input-modern" 
                          style={{ fontSize: '1rem', fontWeight: 700, padding: '4px 8px', height: 'auto', width: 'auto' }}
                          value={editForm.name} 
                          onChange={e => setEditForm({...editForm, name: e.target.value})} 
                          placeholder="Name"
                        />
                      ) : (
                        <strong>{profile?.name || '-'}</strong>
                      )}
                    </div>
                    <div className="profile-meta">
                      {isEditing ? (
                        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                          <span className="badge">🎓</span>
                          <select 
                            className="input-modern" 
                            style={{ padding: '2px 8px', height: 'auto', fontSize: '0.85rem' }}
                            value={editForm.department} 
                            onChange={e => setEditForm({...editForm, department: e.target.value})}
                          >
                            <option value="">Select Dept</option>
                            <option value="Computer Engineering">Computer Engineering</option>
                            <option value="Information Technology">Information Technology</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Mechanical">Mechanical</option>
                            <option value="Civil">Civil</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                      ) : (
                        <span className="badge">🎓 {profile?.department || 'Department N/A'}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="profile-grid">
                  <div className="profile-item">
                    <span className="profile-label">Full Name</span>
                    {isEditing ? (
                      <input className="input-modern" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} placeholder="Full Name" />
                    ) : (
                      <span className="profile-value">{profile?.name || '-'}</span>
                    )}
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Email Address</span>
                    <span className="profile-value muted">{user.email} (Fixed)</span>
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Student ID</span>
                    {isEditing ? (
                      <input className="input-modern" value={editForm.student_id} onChange={e => setEditForm({...editForm, student_id: e.target.value})} placeholder="e.g. STU2024001" />
                    ) : (
                      <span className="profile-value">{profile?.student_id || `STU${new Date().getFullYear()}${String(user.id).slice(0,4)}`}</span>
                    )}
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Phone Number</span>
                    {isEditing ? (
                      <input className="input-modern" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} placeholder="Phone Number" />
                    ) : (
                      <span className="profile-value">{profile?.phone || '-'}</span>
                    )}
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Department</span>
                    {isEditing ? (
                      <select className="input-modern" value={editForm.department} onChange={e => setEditForm({...editForm, department: e.target.value})}>
                        <option value="">Select Department</option>
                        <option value="Computer Engineering">Computer Engineering</option>
                        <option value="Information Technology">Information Technology</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Mechanical">Mechanical</option>
                        <option value="Civil">Civil</option>
                        <option value="Other">Other</option>
                      </select>
                    ) : (
                      <span className="profile-value">{profile?.department || '-'}</span>
                    )}
                  </div>
                  <div className="profile-item">
                    <span className="profile-label">Hostel/Residence</span>
                    {isEditing ? (
                      <input className="input-modern" value={editForm.hostel} onChange={e => setEditForm({...editForm, hostel: e.target.value})} placeholder="e.g. Hostel A, Room 101" />
                    ) : (
                      <span className="profile-value">{profile?.hostel || '-'}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {showForm && (
        <div className="modal">
          <div className="modal-card">
            <div className="row" style={{ justifyContent:'space-between' }}>
              <strong>New Complaint</strong>
              <button className="btn secondary" onClick={() => setShowForm(false)}>Close</button>
            </div>
            <ComplaintForm onCreated={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {/* AI Floating Assistant removed - using global ChatBot instead */}
    </div>
  )
}
