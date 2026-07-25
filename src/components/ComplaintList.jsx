import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

export default function ComplaintList({ items: propItems, loading: propLoading, onUpdate }) {
  const { user } = useAuth()
  const [internalItems, setInternalItems] = useState([])
  const [error, setError] = useState('')
  const [internalLoading, setInternalLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const items = propItems || internalItems
  const loading = propLoading !== undefined ? propLoading : internalLoading

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  }

  async function fetchAll() {
    if (propItems) return // Don't fetch if items are passed as props
    setError('')
    setInternalLoading(true)
    const { data, error: err } = await supabase
      .from('complaints')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (err) setError(err.message)
    else setInternalItems(data ?? [])
    setInternalLoading(false)
  }

  useEffect(() => {
    if (!user?.id || propItems) return
    fetchAll()
    const channel = supabase.channel('complaints-user')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints', filter: `user_id=eq.${user.id}` }, () => {
        fetchAll()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, propItems])


  async function updateItem(id, patch) {
    const { error: err } = await supabase.from('complaints').update(patch).eq('id', id)
    if (err) setError(err.message)
  }

  async function deleteItem(id) {
    const { error: err } = await supabase.from('complaints').delete().eq('id', id)
    if (err) setError(err.message)
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return items.filter(c => {
      const matchesStatus = statusFilter === 'All' ? true : c.status === statusFilter
      const idStr = `CMP${String(c.id).padStart(3,'0')}`.toLowerCase()
      const title = (c.title || '').toLowerCase()
      const category = (c.category || '').toLowerCase()
      return matchesStatus && (
        term === '' ||
        idStr.includes(term) ||
        title.includes(term) ||
        category.includes(term)
      )
    })
  }, [items, search, statusFilter])

  return (
    <div className="card col" style={{ gap:12 }}>
      <div className="row" style={{ justifyContent:'space-between' }}>
        <strong>Complaints ({items.length})</strong>
      </div>
      <div className="list-toolbar">
        <div className="search-box">
          <span className="icon">🔍</span>
          <input
            className="toolbar-input"
            placeholder="Search by ID, subject, or category..."
            value={search}
            onChange={e=>setSearch(e.target.value)}
          />
        </div>
        <div className="filter-box">
          <span className="icon">🧰</span>
          <select className="toolbar-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option>All</option>
            <option>Pending</option>
            <option>In Progress</option>
            <option>Resolved</option>
          </select>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      {loading && <div>Loading...</div>}
      {!loading && items.length === 0 && <div>No complaints yet.</div>}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="table-card"
      >
        <div className="list-header" style={{ gridTemplateColumns:'1fr 1fr 2fr 1fr 1fr 1fr 1fr' }}>
          <div>Complaint ID</div>
          <div>Category</div>
          <div>Subject</div>
          <div>Priority</div>
          <div>Date</div>
          <div>Status</div>
          <div>Action</div>
        </div>
        <AnimatePresence mode="popLayout">
          {filtered.map(c => {
            const code = `CMP${String(c.id).padStart(3,'0')}`
            const p = c.priority
            const date = new Date(c.created_at).toISOString().slice(0,10)
            return (
              <motion.div 
                layout
                key={c.id} 
                variants={itemVariants}
                exit={{ opacity: 0, x: 20 }}
                style={{ borderBottom:'1px solid var(--border)', background:'var(--card)' }}
              >
                <div className="list-row" style={{ gridTemplateColumns:'1fr 1fr 2fr 1fr 1fr 1fr 1fr', borderBottom:'none' }}>
                  <div className="list-cell">{code}</div>
                  <div><span className="badge">{c.category}</span></div>
                  <div className="list-cell">{c.title}</div>
                  <div>{p ? <span className={`pill priority ${p.toLowerCase()}`}>{p}</span> : <span className="muted">-</span>}</div>
                  <div className="list-cell">{date}</div>
                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                    <div 
                      style={{ 
                         width: 8, 
                         height: 8, 
                         borderRadius: '50%', 
                         backgroundColor: 
                           c.status === 'Pending' ? '#ef4444' : 
                           c.status === 'In Progress' ? '#f59e0b' : 
                           '#10b981',
                         boxShadow: `0 0 8px ${
                           c.status === 'Pending' ? '#ef4444' : 
                           c.status === 'In Progress' ? '#f59e0b' : 
                           '#10b981'
                         }`
                       }} 
                    />
                    <span className={`badge status ${c.status==='Pending'?'pending':c.status==='In Progress'?'progress':'resolved'}`}>{c.status}</span>
                  </div>
                  <div className="row" style={{ gap:8 }}>
                    <span className="icon">👁️</span>
                    <Link to={`/complaint/${c.id}`}>View</Link>
                  </div>
                </div>
                {c.admin_remark && (
                  <div style={{ padding:'0 16px 16px 16px', display:'flex', gap:12 }}>
                    <div style={{ flex:1, background:'var(--accent-light)', borderRadius:8, padding:'10px 14px', borderLeft:'3px solid var(--accent)' }}>
                      <div className="row" style={{ gap:6, marginBottom:4, alignItems:'center' }}>
                        <span className="icon" style={{ fontSize:14 }}>💬</span>
                        <strong style={{ fontSize:12, color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.5px' }}>Admin Reply</strong>
                      </div>
                      <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.5 }}>{c.admin_remark}</div>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
