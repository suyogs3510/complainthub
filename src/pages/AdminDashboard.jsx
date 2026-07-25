import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate, Link } from 'react-router-dom'
import { 
  Sparkles, BrainCircuit, BarChart3, TrendingUp, AlertTriangle, 
  MessageSquare, Wand2, Lightbulb, ThumbsUp, ThumbsDown, Minus,
  Brain, Zap, ShieldAlert, CheckCircle2, Activity, Users, ClipboardList, Clock, ArrowUpRight, Search, Filter, Plus, ChevronRight,
  X, Send, Mic, MicOff, Sun, Moon, Download, Bot, ShieldCheck, Terminal, PhoneCall, MapPin, Building2, Trash2, Tag
} from 'lucide-react'
import { analyzeSentiment, summarizeComplaint, suggestRemark, predictCategory, suggestPriority, getAiResponse } from '../utils/ai'
import { useAuth } from '../AuthContext'
import { socket, hasSocketURL } from '../socket'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#4f46e5', '#7c3aed', '#16a34a', '#f59e0b', '#dc2626', '#0891b2', '#ea580c', '#db2777', '#ca8a04', '#65a30d']

const statuses = ['Pending', 'In Progress', 'Resolved']

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { logout, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [remarks, setRemarks] = useState({})
  const [section, setSection] = useState('dashboard')
  const [collapsed, setCollapsed] = useState(false)
  const [studentsCount, setStudentsCount] = useState(0)
  const [students, setStudents] = useState([])
  const [studentQuery, setStudentQuery] = useState('')
  const recentItems = useMemo(() => items.slice(0, 5), [items])
  const priorityClass = (p) => p === 'High' ? 'pill priority high' : p === 'Medium' ? 'pill priority medium' : 'pill priority low'
  const statusClass = (s) => s === 'Pending' ? 'pill status pending' : s === 'In Progress' ? 'pill status progress' : 'pill status resolved'
  const [search, setSearch] = useState('')
  const [showWelcome, setShowWelcome] = useState(true)
  const [statusFilter, setStatusFilter] = useState('All')
  const [priorityFilter, setPriorityFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [sortBy, setSortBy] = useState('created_at')
  const [selectedIds, setSelectedIds] = useState([])
  const [assignments, setAssignments] = useState({})
  const [statusUpdates, setStatusUpdates] = useState({})
  const [aiChatOpen, setAiChatOpen] = useState(false)
  const [aiMessages, setAiMessages] = useState(() => {
    const saved = localStorage.getItem('chat_history_admin');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: "Hello Admin! I am your AI assistant. How can I help you today?", sender: 'ai' }
    ];
  })
  const [aiInput, setAiInput] = useState('')

  useEffect(() => {
    localStorage.setItem('chat_history_admin', JSON.stringify(aiMessages));
  }, [aiMessages])
  const [strategyApplying, setStrategyApplying] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light')
  const [departments, setDepartments] = useState([])
  const [newDepartment, setNewDepartment] = useState('')
  // Default categories as fallback
  const [categories, setCategories] = useState([
    { id: '1', name: 'Academic', created_at: new Date().toISOString() },
    { id: '2', name: 'Administrative', created_at: new Date().toISOString() },
    { id: '3', name: 'Facilities', created_at: new Date().toISOString() },
    { id: '4', name: 'Faculty', created_at: new Date().toISOString() },
    { id: '5', name: 'Hostel', created_at: new Date().toISOString() },
    { id: '6', name: 'Library', created_at: new Date().toISOString() },
    { id: '7', name: 'Transportation', created_at: new Date().toISOString() },
    { id: '8', name: 'Ragging', created_at: new Date().toISOString() },
    { id: '9', name: 'Other', created_at: new Date().toISOString() }
  ])
  const [newCategory, setNewCategory] = useState('')

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const generateReport = () => {
    window.print()
  }

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light'
    setTheme(savedTheme)
    document.documentElement.setAttribute('data-theme', savedTheme)
  }, [])

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('speechRecognition' in window)) {
      notify('Not Supported', 'Speech recognition is not supported in this browser.', 'error')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      setIsListening(false)
      
      let errorMsg = "Speech recognition error occurred."
      if (event.error === 'not-allowed') {
        const isIP = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'https:';
        errorMsg = isIP 
          ? "Microphone blocked on IP address. Use 'localhost' or HTTPS."
          : "Microphone access denied."
      } else if (event.error === 'network') {
        errorMsg = "Network error. Speech recognition requires internet."
      } else if (event.error === 'no-speech') {
        errorMsg = "No speech detected."
      } else if (event.error === 'aborted') {
        return
      }
      notify('Speech Error', errorMsg, 'error')
    }
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setAiInput(transcript)
    }
    recognition.start()
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
  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  async function applySmartStrategy() {
    setStrategyApplying(true)
    
    if (!aiInsights.targetCategories || aiInsights.targetCategories.length === 0) {
      notify('AI Strategy', 'No active complaints to prioritize.', 'info')
      setStrategyApplying(false)
      return
    }

    // Identify complaints in target categories that are not resolved and not high priority
    const targets = items.filter(c => 
      aiInsights.targetCategories.includes(c.category) && 
      c.status !== 'Resolved' && 
      c.priority !== 'High'
    )

    if (targets.length === 0) {
      notify('AI Strategy', 'All relevant complaints are already prioritized.', 'info')
      setStrategyApplying(false)
      return
    }

    try {
      // Bulk update priority to High for all identified complaints
      const updates = targets.map(c => 
        supabase.from('complaints').update({ priority: 'High' }).eq('id', c.id)
      )
      
      await Promise.all(updates)
      notify('Strategy Applied', `Prioritized ${targets.length} complaints in ${aiInsights.targetCategories.join(' & ')}.`, 'success')
      await fetchAll(true)
    } catch (err) {
      setError(err.message)
      notify('Error', 'Failed to apply strategy', 'error')
    } finally {
      setStrategyApplying(false)
    }
  }

  async function addDepartment() {
    if (!newDepartment.trim()) {
      notify('Error', 'Please enter a department name', 'error')
      return
    }

    const name = newDepartment.trim()
    
    try {
      const { error } = await supabase
        .from('departments')
        .insert({ name })
      
      if (error) throw error
      
      setNewDepartment('')
      await fetchDepartments()
      notify('Success', `Department "${name}" added!`, 'success')
    } catch (err) {
      notify('Error', err.message, 'error')
    }
  }

  async function deleteDepartment(id, name) {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await fetchDepartments()
      notify('Success', `Department "${name}" removed!`, 'success')
    } catch (err) {
      notify('Error', err.message, 'error')
    }
  }

  async function addCategory() {
    if (!newCategory.trim()) {
      notify('Error', 'Please enter a category name', 'error')
      return
    }

    const name = newCategory.trim()
    
    try {
      const { error } = await supabase
        .from('categories')
        .insert({ name })
      
      if (error) throw error
      
      setNewCategory('')
      await fetchCategories()
      notify('Success', `Category "${name}" added!`, 'success')
    } catch (err) {
      notify('Error', err.message, 'error')
    }
  }

  async function deleteCategory(id, name) {
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await fetchCategories()
      notify('Success', `Category "${name}" removed!`, 'success')
    } catch (err) {
      notify('Error', err.message, 'error')
    }
  }

  async function fetchCategories() {
    console.log('AdminDashboard fetching categories...')
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')
      console.log('AdminDashboard categories result:', { data, error })
      
      if (error) {
        console.error('AdminDashboard categories error:', error)
        // Keep fallback categories
      } else if (data && data.length > 0) {
        setCategories(data)
      }
    } catch (err) {
      console.error('AdminDashboard categories fetch failed:', err)
      // Keep fallback categories
    }
  }

  async function fetchDepartments() {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name')
    if (!error) setDepartments(data || [])
  }

  async function fetchAll(background = false) {
    setError('')
    if (!background) setLoading(true)
    try {
      // Step 1: Fetch ALL complaints (simple without join - avoids relationship ambiguity error)
      const { data: complaintsData, error: complaintsErr } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })
      if (complaintsErr) throw complaintsErr

      let rows = Array.isArray(complaintsData) ? complaintsData : (complaintsData ? [complaintsData] : [])

      // Step 2: Fetch profiles for ALL user_ids in complaints
      if (rows.length > 0) {
        const userIds = [...new Set(rows.map(r => r.user_id).filter(Boolean))]
        if (userIds.length > 0) {
          const { data: profilesData, error: profilesErr } = await supabase
            .from('profiles')
            .select('id, name, email, hostel, department, phone, student_id, avatar_url, role')
            .in('id', userIds)
          if (!profilesErr && profilesData) {
            const pMap = {}
            profilesData.forEach(p => { pMap[p.id] = p })
            // Attach profile to each complaint
            rows = rows.map(r => ({ ...r, profiles: pMap[r.user_id] || null }))
          }
        }
      }

      setItems(rows)
      const init = {}
      rows.forEach(c => { init[c.id] = c.admin_remark || '' })
      setRemarks(init)
      const sel = {}
      rows.forEach(c => { sel[c.id] = c.priority || '' })
      setAssignments(sel)
      const ssel = {}
      rows.forEach(c => { ssel[c.id] = c.status || 'Pending' })
      setStatusUpdates(ssel)
    } catch (err) {
      setError(err.message)
    }
    
    // Fetch departments and categories
    await fetchDepartments()
    await fetchCategories()
    
    if (!background) setLoading(false)
  }

  const handleAdminAiChat = (e) => {
    if (e) e.preventDefault();
    if (!aiInput.trim()) return;

    const userMsg = { id: Date.now(), text: aiInput, sender: 'user' };
    setAiMessages(prev => [...prev, userMsg]);
    const currentInput = aiInput;
    setAiInput('');

    // Use the utility function with system context
    setTimeout(() => {
      const response = getAiResponse(currentInput, { 
        items, 
        role: 'admin',
        counts,
        analytics,
        aiInsights
      });

      setAiMessages(prev => [...prev, { id: Date.now() + 1, text: response, sender: 'ai' }]);
      // Auto-speak for admin too
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(response.replace(/###|[*]/g, ''));
        window.speechSynthesis.speak(utterance);
      }
    }, 600);
  };

  useEffect(() => { 
    fetchAll()
    
    // Set up polling fallback for real-time updates (every 10 seconds)
    const pollInterval = setInterval(() => {
      fetchAll(true)
    }, 10000)
    
    return () => clearInterval(pollInterval)
  }, [])

  useEffect(() => {
    async function fetchStudents() {
      try {
        const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).neq('role', 'admin')
        setStudentsCount(count ?? 0)
        
        // Try with avatar_url first, if fails try without
        let data
        try {
          const result = await supabase.from('profiles').select('id, name, phone, student_id, department, hostel, role, avatar_url').neq('role', 'admin').order('name', { ascending: true })
          data = result.data
        } catch (err) {
          // If avatar_url doesn't exist yet, try without it
          const result = await supabase.from('profiles').select('id, name, phone, student_id, department, hostel, role').neq('role', 'admin').order('name', { ascending: true })
          data = result.data
        }
        
        setStudents(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Error fetching students:', err)
        setStudents([])
      }
    }
    if (isAdmin) {
      fetchStudents()
    }
  }, [isAdmin])

  useEffect(() => {
    const channel = supabase.channel('complaints-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, payload => {
        const { eventType, new: now, old } = payload
        
        if (eventType === 'INSERT') {
          setItems(prev => {
            if (prev.some(c => c.id === now.id)) return prev;
            return [now, ...prev];
          })
          notify('New Complaint', `${now.title || 'New complaint'} • ${now.category || ''}`, 'success')
        } else if (eventType === 'UPDATE') {
          setItems(prev => prev.map(c => c.id === now.id ? { ...c, ...now } : c))
          if (old && old.status !== now.status) {
            notify('Status Updated', `CMP${String(now.id).padStart(3,'0')} → ${now.status}`, 'info')
          }
        } else if (eventType === 'DELETE') {
          setItems(prev => prev.filter(c => c.id !== old.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function updateStatus(id, status) {
    const { error: err } = await supabase.from('complaints').update({ status }).eq('id', id)
    if (err) setError(err.message)
    else {
      // Items are updated via real-time channel
      notify('Status Updated', `Complaint status saved.`, 'success')
    }
  }

  async function addRemark(id) {
    const remark = remarks[id] || ''
    const { error: err } = await supabase.from('complaints').update({ admin_remark: remark }).eq('id', id)
    if (err) setError(err.message)
    else {
      // Items are updated via real-time channel
      notify('Remark Added', `Remark saved successfully.`, 'success')
    }
  }
  async function savePriority(id) {
    const val = assignments[id] || null
    const { error: err } = await supabase.from('complaints').update({ priority: val || null }).eq('id', id)
    if (err) setError(err.message)
    else {
      // Items are updated via real-time channel
      notify('Priority Updated', `Priority saved successfully.`, 'success')
    }
  }
  async function saveAllPriorities() {
    const updates = items.map(c => {
      const val = assignments[c.id] || null
      if ((c.priority || null) !== (val || null)) {
        return supabase.from('complaints').update({ priority: val || null }).eq('id', c.id)
      }
      return null
    }).filter(Boolean)
    if (updates.length > 0) {
      const { error: err } = await Promise.all(updates)
      if (err) setError(err.message)
      else notify('All Priorities Updated', `Updated ${updates.length} items.`, 'success')
    }
  }
  async function saveStatus(id) {
    const val = statusUpdates[id] || 'Pending'
    const { error: err } = await supabase.from('complaints').update({ status: val }).eq('id', id)
    if (err) setError(err.message)
    else {
      // Items are updated via real-time channel
      notify('Status Updated', `Status saved successfully.`, 'success')
    }
  }
  async function saveAllStatuses() {
    const updates = items.map(c => {
      const val = statusUpdates[c.id] || c.status
      if (c.status !== val) {
        return supabase.from('complaints').update({ status: val }).eq('id', c.id)
      }
      return null
    }).filter(Boolean)
    if (updates.length > 0) {
      const { error: err } = await Promise.all(updates)
      if (err) setError(err.message)
      else notify('All Statuses Updated', `Updated ${updates.length} items.`, 'success')
    }
  }

  const toggleSelectAll = (listItems) => {
    if (selectedIds.length === listItems.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(listItems.map(c => c.id))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  async function bulkUpdateStatus(newStatus) {
    if (selectedIds.length === 0) return
    try {
      const updates = selectedIds.map(id => 
        supabase.from('complaints').update({ status: newStatus }).eq('id', id)
      )
      await Promise.all(updates)
      notify('Bulk Update Complete', `Updated ${selectedIds.length} complaints to ${newStatus}`, 'success')
      setSelectedIds([])
      await fetchAll(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function bulkUpdatePriority(newPriority) {
    if (selectedIds.length === 0) return
    try {
      const updates = selectedIds.map(id => 
        supabase.from('complaints').update({ priority: newPriority }).eq('id', id)
      )
      await Promise.all(updates)
      notify('Bulk Update Complete', `Updated ${selectedIds.length} complaints to ${newPriority} priority`, 'success')
      setSelectedIds([])
      await fetchAll(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const sectionItems = useMemo(() => {
    let filtered = items
    
    // Apply section filter first
    if (section === 'active') filtered = filtered.filter(c => c.status === 'In Progress')
    else if (section === 'pending') filtered = filtered.filter(c => c.status === 'Pending')
    else if (section === 'resolved') filtered = filtered.filter(c => c.status === 'Resolved')
    
    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(c => c.status === statusFilter)
    }
    
    // Apply priority filter
    if (priorityFilter !== 'All') {
      filtered = filtered.filter(c => c.priority === priorityFilter)
    }
    
    // Apply category filter
    if (categoryFilter !== 'All') {
      filtered = filtered.filter(c => c.category === categoryFilter)
    }
    
    // Apply department filter
    if (departmentFilter !== 'All') {
      filtered = filtered.filter(c => c.profiles?.department === departmentFilter)
    }
    
    // Apply search filter
    if (search.trim()) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(searchLower) || 
        c.description.toLowerCase().includes(searchLower) ||
        (c.profiles?.name && c.profiles.name.toLowerCase().includes(searchLower))
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
  }, [items, section, statusFilter, priorityFilter, categoryFilter, departmentFilter, search, sortBy])

  const chart = useMemo(() => {
    const m = {}
    categories.forEach(cat => { m[cat.name] = 0 })
    items.forEach(c => { if (m[c.category] !== undefined) m[c.category]++ })
    const arr = categories.map(cat => ({ cat: cat.name, count: m[cat.name] }))
    const max = Math.max(1, ...arr.map(x => x.count))
    return { arr, max }
  }, [items, categories])

  const uniqueCategories = useMemo(() => {
    return categories.map(c => c.name).sort()
  }, [categories])

  const uniqueDepartments = useMemo(() => {
    return departments.map(d => d.name).sort()
  }, [departments])
  const counts = useMemo(() => {
    const total = items.length
    const active = items.filter(c => c.status === 'In Progress').length
    const pending = items.filter(c => c.status === 'Pending').length
    const resolved = items.filter(c => c.status === 'Resolved').length
    return { total, active, pending, resolved }
  }, [items])
  const priorityStats = useMemo(() => {
    const low = items.filter(c => c.priority === 'Low').length
    const medium = items.filter(c => c.priority === 'Medium').length
    const high = items.filter(c => c.priority === 'High').length
    return { low, medium, high }
  }, [items])

  const sentimentStats = useMemo(() => {
    let positive = 0, neutral = 0, negative = 0;
    items.forEach(c => {
      const score = analyzeSentiment(c.description || '');
      if (score > 0.1) positive++;
      else if (score < -0.1) negative++;
      else neutral++;
    });
    return [
      { name: 'Positive', value: positive, color: 'var(--success)' },
      { name: 'Neutral', value: neutral, color: 'var(--muted)' },
      { name: 'Negative', value: negative, color: 'var(--danger)' }
    ];
  }, [items])

  const priorityChartData = useMemo(() => [
    { name: 'High', value: priorityStats.high, color: 'var(--danger)' },
    { name: 'Medium', value: priorityStats.medium, color: 'var(--warning)' },
    { name: 'Low', value: priorityStats.low, color: 'var(--success)' }
  ].filter(d => d.value > 0), [priorityStats])

  const statusChartData = useMemo(() => [
    { name: 'Pending', value: counts.pending, color: 'var(--warning)' },
    { name: 'In Progress', value: counts.active, color: 'var(--info)' },
    { name: 'Resolved', value: counts.resolved, color: 'var(--success)' }
  ].filter(d => d.value > 0), [counts])
  const studentAnalytics = useMemo(() => {
    const total = students.length || studentsCount
    const activeUsers = new Set(items.filter(c => c.status !== 'Resolved').map(c => c.user_id))
    const activeCount = activeUsers.size
    const totalComplaints = items.length
    return { total, activeCount, totalComplaints }
  }, [students, studentsCount, items])
  const filteredStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return students
    return students.filter(s => {
      const name = (s.name || '').toLowerCase()
      const sid = (s.student_id || '').toLowerCase()
      const dept = (s.department || '').toLowerCase()
      const id = (s.id || '').toLowerCase()
      const phone = (s.phone || '').toLowerCase()
      return name.includes(q) || sid.includes(q) || dept.includes(q) || id.includes(q) || phone.includes(q)
    })
  }, [students, studentQuery])
  const trendData = useMemo(() => {
    const days = []
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      const label = d.toLocaleDateString('en-US', { weekday: 'short' })
      const key = d.toISOString().slice(0, 10)
      days.push({ label, key })
    }
    
    return days.map(d => {
      const count = items.filter(c => new Date(c.created_at).toISOString().slice(0, 10) === d.key).length
      const resolved = items.filter(c => c.status === 'Resolved' && new Date(c.updated_at).toISOString().slice(0, 10) === d.key).length
      return { name: d.label, complaints: count, resolved: resolved }
    })
  }, [items])

  const analytics = useMemo(() => {
    const total = items.length
    const resolved = items.filter(c => c.status === 'Resolved').length
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0
    const resolvedItems = items.filter(c => c.status === 'Resolved')
    const avgDays = (() => {
      if (resolvedItems.length === 0) return 0
      const sum = resolvedItems.reduce((acc, c) => {
        const start = new Date(c.created_at).getTime()
        const end = c.updated_at ? new Date(c.updated_at).getTime() : start
        const diffDays = Math.max(0, (end - start) / (1000 * 60 * 60 * 24))
        return acc + diffDays
      }, 0)
      return Number((sum / resolvedItems.length).toFixed(1))
    })()
    const satisfaction = resolutionRate
    const byCat = (() => {
      const counts = {}
      const resolvedCounts = {}
      uniqueCategories.forEach(cat => { counts[cat] = 0; resolvedCounts[cat] = 0 })
      items.forEach(c => { 
        if (counts[c.category] !== undefined) {
          counts[c.category]++
          if (c.status === 'Resolved') resolvedCounts[c.category]++
        }
      })
      const arr = uniqueCategories.map(cat => {
        const count = counts[cat]
        const resolved = resolvedCounts[cat]
        const pct = total > 0 ? Math.round((count / total) * 100) : 0
        const resRate = count > 0 ? Math.round((resolved / count) * 100) : 0
        return { cat, count, pct, resRate }
      })
      const maxCount = Math.max(1, ...arr.map(a => a.count))
      return { arr, maxCount }
    })()
    const months = (() => {
      const out = []
      const now = new Date()
      const seen = new Set()
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
        if (!seen.has(key)) {
          const label = d.toLocaleString('en-US', { month: 'short' })
          out.push({ key, label })
          seen.add(key)
        }
      }
      return out
    })()
    const submittedMap = {}
    const resolvedMap = {}
    months.forEach(m => { submittedMap[m.key] = 0; resolvedMap[m.key] = 0 })
    items.forEach(c => {
      const mk = (() => {
        const d = new Date(c.created_at)
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      })()
      if (submittedMap[mk] !== undefined) submittedMap[mk]++
      if (c.status === 'Resolved') {
        const rd = c.updated_at ? new Date(c.updated_at) : new Date(c.created_at)
        const rk = `${rd.getFullYear()}-${String(rd.getMonth()+1).padStart(2,'0')}`
        if (resolvedMap[rk] !== undefined) resolvedMap[rk]++
      }
    })
    const monthly = months.map(m => ({
      label: m.label,
      submitted: submittedMap[m.key],
      resolved: resolvedMap[m.key]
    }))
    const maxMonthly = Math.max(1, ...monthly.map(x => Math.max(x.submitted, x.resolved)))
    return { total, resolutionRate, avgDays, satisfaction, byCat, monthly, maxMonthly }
  }, [items, uniqueCategories])

  const studentStats = useMemo(() => {
    const total = studentsCount || students.length
    const activeComplainants = new Set(items.map(c => c.user_id)).size
    const avgPerStudent = studentsCount > 0 ? (items.length / studentsCount) : 0
    const health = Math.min(100, Math.max(0, 
      (counts.resolved / (counts.total || 1)) * 60 + 
      (analytics.satisfaction / 100) * 40
    )).toFixed(0)
    return { total: studentsCount, activeComplainants, avgPerStudent: Number(avgPerStudent.toFixed(1)), health }
  }, [studentsCount, items, counts, analytics])
  const aiInsights = useMemo(() => {
    const urgentIssues = items.filter(c => {
      const fullText = `${c.title || ''} ${c.description || ''}`;
      const suggested = suggestPriority(fullText);
      const isRagging = c.category === 'Ragging';
      return (suggested === 'High' || isRagging) && c.priority !== 'High' && c.status !== 'Resolved';
    });

    const categoryMismatches = items.filter(c => {
      const suggested = predictCategory(c.description);
      return suggested !== 'Other' && suggested !== c.category;
    });

    const sentimentTrend = items.slice(0, 10).map(c => analyzeSentiment(c.description));
    const avgSentiment = sentimentTrend.reduce((a, b) => a + b, 0) / (sentimentTrend.length || 1);

    let topCategory = 'None';
    let recommendations = [];
    let strategyText = 'Not enough data to generate an AI strategy. Waiting for more student complaints.';

    let targetCategories = [];

    if (items.length > 0) {
      const catCounts = {};
      items.forEach(c => { catCounts[c.category] = (catCounts[c.category] || 0) + 1 });
      const sortedCats = Object.entries(catCounts).sort((a,b) => b[1] - a[1]);
      topCategory = sortedCats[0]?.[0] || 'None';
      targetCategories = sortedCats.slice(0, 2).map(sc => sc[0]);

      if (sortedCats.length > 0) {
        const primaryCat = sortedCats[0][0];
        const secondaryCat = sortedCats[1] ? sortedCats[1][0] : null;
        
        strategyText = secondaryCat 
          ? `According to our analysis, focusing on ${primaryCat} and ${secondaryCat} could increase student satisfaction by ${Math.min(100, Math.floor((sortedCats[0][1] + sortedCats[1][1]) / items.length * 100))}% next week.`
          : `According to our analysis, focusing on ${primaryCat} could increase student satisfaction significantly as it accounts for ${Math.floor(sortedCats[0][1] / items.length * 100)}% of current issues.`;
          
        recommendations.push({
          icon: '🚀',
          title: `Resolve ${primaryCat} Complaints Faster`,
          desc: `${primaryCat} issues are affecting overall satisfaction by ${Math.floor(sortedCats[0][1] / items.length * 100)}%.`,
          impact: 'High Impact',
          priority: 'high'
        });
      }
      
      if (counts.pending > items.length * 0.3) {
        recommendations.push({
          icon: '📢',
          title: 'Increase Status Updates',
          desc: 'Over 30% of complaints are Pending. Students feel more satisfied when they see progress.',
          impact: 'Medium Impact',
          priority: 'medium'
        });
      } else {
         recommendations.push({
          icon: '🤖',
          title: 'Smart Auto-Assign',
          desc: 'Automatically route simple complaints to relevant departments.',
          impact: 'Optimization',
          priority: 'low'
        });
      }

      if (urgentIssues.length > 0) {
         recommendations.push({
          icon: '⚠️',
          title: 'Address Urgent Risks',
          desc: `There are ${urgentIssues.length} high-risk complaints needing immediate attention.`,
          impact: 'Critical',
          priority: 'high'
        });
      }
    }

    if (items.length > 0 && recommendations.length < 3) {
      recommendations.push({
        icon: '💡',
        title: 'Review Student Feedback',
        desc: 'Regularly checking student comments can prevent future issues.',
        impact: 'Optimization',
        priority: 'low'
      });
    }

    if (items.length === 0) {
      recommendations = [
        { icon: '✨', title: 'System Ready', desc: 'No active complaints. The system is ready for new submissions.', impact: 'Healthy', priority: 'low' }
      ];
    }

    return { urgentIssues, categoryMismatches, avgSentiment, strategyText, topCategory, targetCategories, recommendations: recommendations.slice(0, 3) };
  }, [items, counts]);

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

  const RecentActivity = () => (
    <div className="activity-timeline">
      {items.slice(0, 5).map((item, idx) => (
        <div key={item.id} className="activity-item">
          <div className="activity-dot" style={{ backgroundColor: item.status === 'Resolved' ? 'var(--success)' : item.status === 'In Progress' ? 'var(--info)' : 'var(--warning)' }}></div>
          <div className="activity-content col">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-sm font-bold">{item.title}</span>
              <span className="text-xs muted">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
            </div>
            <span className="text-xs muted">{item.profiles?.name || 'Student'} submitted a new complaint in {item.category}</span>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div className="container fluid col" style={{ gap: 16 }}>
      <div className="admin-layout">
        <motion.div 
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className={`sidebar col ${collapsed ? 'collapsed' : ''}`}
        >
          <motion.div 
            whileHover={{ scale: 1.02 }}
            className="card col profile-sidebar-card" 
            style={{ alignItems:'center', gap:10, padding: '20px 10px' }}
          >
            <div className="logo" style={{ width: 85, height: 85, fontSize: '2.5rem', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--danger), var(--warning))' }}>
              A
            </div>
            <div className="col" style={{ alignItems: 'center', gap: 4 }}>
              <strong style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>Admin</strong>
              <span className="user-badge" style={{ fontSize: '0.85rem', borderColor: 'var(--danger)', color: 'var(--danger)', background: 'rgba(var(--danger-rgb), 0.1)' }}>Administrator</span>
            </div>
          </motion.div>
          
          <div className="col" style={{ gap: 4 }}>
            {[
              { id: 'dashboard', icon: <BarChart3 size={18} />, label: 'Overview', short: 'Overview' },
              { id: 'list', icon: <ClipboardList size={18} />, label: 'Complaints', short: 'Complaints' },
              { id: 'categories', icon: <Tag size={18} />, label: 'Categories', short: 'Categories' },
              { id: 'departments', icon: <Building2 size={18} />, label: 'Departments', short: 'Depts' },
              { id: 'ai-insights', icon: <BrainCircuit size={18} />, label: 'AI Insights', short: 'AI' },
              { id: 'priority', icon: <Zap size={18} />, label: 'Priorities', short: 'Priority' },
              { id: 'status', icon: <Clock size={18} />, label: 'Status', short: 'Status' },
              { id: 'students', icon: <Users size={18} />, label: 'Students', short: 'Users' },
              { id: 'reports', icon: <TrendingUp size={18} />, label: 'Analytics', short: 'Stats' }
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
                onClick={() => {
                  supabase.auth.signOut();
                  window.location.href = '/admin/login';
                }}
              >
                Logout
              </button>
            </div>
          </div>

        </motion.div>
        <div className="content">
          <AnimatePresence mode="wait">
            {section === 'dashboard' ? (
              <motion.div 
                key="dashboard"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -20 }}
                className="col" 
                style={{ gap:16 }}
              >
                <motion.div variants={itemVariants} className="row" style={{ justifyContent:'space-between', alignItems: 'center' }}>
                  <div className="col">
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Admin Command Center</h2>
                    <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                      <span className="muted text-sm">System Overview • {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      <div className="row" style={{ gap: 6, alignItems: 'center' }}>
                        <div className="status-dot online"></div>
                        <span className="text-xs font-bold success">Live</span>
                      </div>
                    </div>
                  </div>
                  <div className="row" style={{ gap: 12 }}>
                    <div className="ai-status-badge pulse-glow">
                      <Sparkles size={14} className="sparkle-icon" />
                      <span>AI Engine Active</span>
                    </div>
                    <button className="btn brand btn-sm row" style={{ gap: 8 }} onClick={() => setSection('list')}>
                      <ClipboardList size={16} />
                      <span>Review Complaints</span>
                    </button>
                  </div>
                </motion.div>
                
                {/* Daily Narrative Briefing - Moved to Home for better visibility */}
                <motion.div variants={itemVariants} className="card glass" style={{ padding: 20, border: '1px solid var(--accent-light)', background: 'linear-gradient(90deg, var(--card), var(--bg))', marginBottom: 8 }}>
                  <div className="row" style={{ gap: 20 }}>
                    <div className="col" style={{ alignItems: 'center', gap: 6 }}>
                      <div className="ai-pulse-container" style={{ width: 48, height: 48, background: 'var(--accent-light)', borderRadius: '50%' }}>
                        <Wand2 size={24} className="text-accent sparkle-icon" />
                      </div>
                      <span className="badge" style={{ fontSize: '10px' }}>Daily Story</span>
                    </div>
                    <div className="col" style={{ flex: 1, gap: 8 }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem' }} className="gradient-text">Daily Insights Briefing</h3>
                        <span className="text-xs muted">Updated {new Date().toLocaleTimeString([], { hour12: true })}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5 }}>
                        {items.length === 0 ? (
                          <>Hello Admin! The system is currently empty. There are <strong>0 complaints</strong> in the system today. Your dashboard is ready for new student submissions.</>
                        ) : (
                          <>
                            Hello Admin! There are <strong>{items.length} total complaints</strong> in the system today. 
                            Student sentiment is currently <strong>{aiInsights.avgSentiment > 0.2 ? 'Positive' : aiInsights.avgSentiment < -0.2 ? 'Critical' : 'Neutral'}</strong>. 
                            Notably, complaints in the <strong>{aiInsights.topCategory}</strong> category are most frequent. 
                            {aiInsights.targetCategories?.length > 0 && ` Focusing on ${aiInsights.targetCategories[0]} issues might improve student satisfaction quickly!`}
                          </>
                        )}
                      </p>
                      <div className="row" style={{ gap: 8 }}>
                        {['Why mood is low?', 'Show hostel trends', 'How to improve?'].map(q => (
                          <button key={q} className="pill" style={{ fontSize: '10px', cursor: 'pointer', padding: '4px 12px' }} onClick={() => {
                            setAiChatOpen(true);
                            setAiInput(q);
                          }}>{q}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="admin-metrics" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  {[
                    { label: 'Total Complaints', value: counts.total, icon: <ClipboardList />, color: 'var(--accent)', sub: `+${Math.max(0, counts.total - 5)} new` },
                    { label: 'Pending Action', value: counts.pending, icon: <Clock />, color: 'var(--warning)', sub: 'Awaiting review' },
                    { label: 'Active Issues', value: counts.active, icon: <Activity />, color: 'var(--info)', sub: 'In progress' },
                    { label: 'Total Students', value: studentsCount, icon: <Users />, color: 'var(--success)', sub: 'Registered' }
                  ].map((metric, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                      className="metric-card"
                    >
                      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                        <div className="icon-box" style={{ color: metric.color, background: `${metric.color}15`, padding: 8, borderRadius: 8 }}>
                          {metric.icon}
                        </div>
                        <div className="text-xs success font-bold row" style={{ gap: 4 }}>
                          <ArrowUpRight size={12} />
                          {metric.sub}
                        </div>
                      </div>
                      <div className="metric-number">{metric.value}</div>
                      <div className="metric-title">{metric.label}</div>
                      <div className="system-health-bar">
                        <div className="system-health-fill" style={{ width: metric.label === 'Total Complaints' ? '100%' : `${(metric.value / (counts.total || 1)) * 100}%`, backgroundColor: metric.color }}></div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* AI Quick Insights Banner */}
                {aiInsights.urgentIssues.length > 0 && (
                  <motion.div 
                    variants={itemVariants}
                    className="ai-alert-banner"
                    onClick={() => setSection('ai-insights')}
                  >
                    <AlertTriangle className="alert-icon" />
                    <div className="col">
                      <strong>AI Alert: {aiInsights.urgentIssues.length} potentially high-priority complaints detected.</strong>
                      <span className="text-xs">Click to review AI suggestions and re-prioritize.</span>
                    </div>
                    <Wand2 size={20} className="wand-icon" />
                  </motion.div>
                )}
                <div className="grid" style={{ gridTemplateColumns: '1fr 350px', gap: 20 }}>
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="card col"
                    style={{ gap: 20 }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                        <BarChart3 className="text-accent" />
                        <strong>Complaint Categories</strong>
                      </div>
                      <button className="btn btn-xs secondary" onClick={() => setSection('reports')}>Analytics</button>
                    </div>
                    <div style={{ height: 300, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chart.arr.slice(0, 6)}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="cat" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--muted)' }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }}
                            cursor={{ fill: 'rgba(var(--accent-rgb), 0.05)' }}
                          />
                          <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} barSize={32} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="card col"
                    style={{ gap: 20 }}
                  >
                    <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                      <Activity className="text-success" />
                      <strong>Recent Activity</strong>
                    </div>
                    <RecentActivity />
                    <button className="btn btn-sm secondary" onClick={() => setSection('list')}>View All History</button>
                  </motion.div>
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="table-card" 
                  style={{ marginTop:16 }}
                >
                  <div className="row" style={{ justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
                    <strong>Recent Complaints</strong>
                    <button className="btn secondary" onClick={() => setSection('list')}>View All →</button>
                  </div>
                  <div className="list-header" style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr 1fr 1fr 1fr auto' }}>
                    <div>ID</div>
                    <div>Student</div>
                    <div>Category</div>
                    <div>Priority</div>
                    <div>Status</div>
                    <div>Date</div>
                    <div>Action</div>
                  </div>
                  {recentItems.map((c, i) => {
                    const studentProfile = c.profiles || {}
                    return (
                      <motion.div 
                        key={c.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + (i * 0.05) }}
                        className="list-row" 
                        style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr 1fr 1fr 1fr auto' }}
                      >
                        <div className="list-cell">{String(c.id)}</div>
                        <div className="list-cell">
                          <div className="row" style={{ gap:8, alignItems:'center' }}>
                            {studentProfile.avatar_url ? (
                              <img src={studentProfile.avatar_url} style={{ width:20, height:20, borderRadius:'50%', objectFit:'cover' }} alt="" />
                            ) : (
                              <div style={{ width:20, height:20, borderRadius:'50%', background:'var(--accent)', color:'white', fontSize:9, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                {(studentProfile.name || '?').charAt(0)}
                              </div>
                            )}
                            <span>{studentProfile.name || c.user_id}</span>
                          </div>
                        </div>
                        <div className="list-cell"><span className="pill">{c.category}</span></div>
                      <div className="list-cell"><span className={priorityClass(c.priority || '')}>{c.priority || '—'}</span></div>
                      <div className="list-cell">
                        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                          <div 
                            style={{ 
                              width: 8, 
                              height: 8, 
                              borderRadius: '50%', 
                              backgroundColor: 
                                c.status === 'Pending' ? 'var(--danger)' : 
                                c.status === 'In Progress' ? 'var(--warning)' : 
                                'var(--success)',
                              boxShadow: `0 0 8px ${
                                c.status === 'Pending' ? 'var(--danger)' : 
                                c.status === 'In Progress' ? 'var(--warning)' : 
                                'var(--success)'
                              }`
                            }} 
                          />
                          <span className={statusClass(c.status)}>{c.status}</span>
                        </div>
                      </div>
                      <div className="list-cell">{new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}</div>
                      <div className="list-cell"><Link to={`/complaint/${c.id}`}>View</Link></div>
                    </motion.div>
                  )})}
                </motion.div>
              </motion.div>
            ) : section === 'ai-insights' ? (
              <motion.div 
                key="ai-insights"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, x: -20 }}
                className="col" 
                style={{ gap:24, position: 'relative' }}
              >
                <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
                  <div className="col">
                    <h1 className="font-display text-2xl font-bold gradient-text">AI Intelligence Dashboard</h1>
                    <span className="muted text-sm">Smart insights and AI recommendations for your system</span>
                  </div>
                  <div className="row" style={{ gap: 12 }}>
                    <div className="ai-summary-pill" style={{ cursor: 'pointer' }} onClick={() => setAiChatOpen(true)}>
                      <div className="ai-pulse-container" style={{ width: 24, height: 24 }}>
                        <div className="ai-pulse-ring"></div>
                        <MessageSquare size={16} className="text-accent" />
                      </div>
                      <span className="text-xs font-bold">Ask AI Assistant</span>
                    </div>
                    <div className="ai-summary-pill">
                      <div className="ai-pulse-container" style={{ width: 24, height: 24 }}>
                        <div className="ai-pulse-ring"></div>
                        <BrainCircuit size={16} className="text-accent" />
                      </div>
                      <span className="text-xs font-bold">Live Analysis: ON</span>
                    </div>
                  </div>
                </div>

                {/* AI Intelligence Stats Grid */}
                <div className="ai-insight-grid">
                  <motion.div variants={itemVariants} className="card ai-card-glowing" style={{ padding: 20 }}>
                    <div className="col" style={{ gap: 16 }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <div className="icon-box" style={{ background: 'rgba(var(--accent-rgb), 0.1)', padding: 10, borderRadius: 12 }}>
                          <BrainCircuit size={20} className="text-accent" />
                        </div>
                        <span className="insight-tag ai">Mood</span>
                      </div>
                      <div className="col" style={{ gap: 4 }}>
                        <span className="muted text-xs">Overall Sentiment Mood</span>
                        <strong className="text-xl">
                          {items.length === 0 ? 'No Data 📭' : aiInsights.avgSentiment < -0.2 ? 'Critical ⚠️' : aiInsights.avgSentiment > 0.2 ? 'Positive ✨' : 'Neutral ⚖️'}
                        </strong>
                      </div>
                      <div className="mood-visualizer">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: items.length === 0 ? '0%' : `${(aiInsights.avgSentiment + 1) * 50}%` }}
                          className="mood-bar" 
                          style={{ background: items.length === 0 ? 'var(--muted)' : aiInsights.avgSentiment < -0.2 ? 'var(--danger)' : aiInsights.avgSentiment > 0.2 ? 'var(--success)' : 'var(--warning)' }}
                        />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="card ai-card-glowing" style={{ padding: 20 }}>
                    <div className="col" style={{ gap: 16 }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <div className="icon-box" style={{ background: 'rgba(var(--danger-rgb), 0.1)', padding: 10, borderRadius: 12 }}>
                          <ShieldAlert size={20} className="text-danger" />
                        </div>
                        <span className="insight-tag alert">Risk</span>
                      </div>
                      <div className="col" style={{ gap: 4 }}>
                        <span className="muted text-xs">Urgent Risks</span>
                        <strong className="text-xl">{aiInsights.urgentIssues.length} Complaints</strong>
                      </div>
                      <p className="text-xs muted">High-priority complaints identified by AI that need immediate attention.</p>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="card ai-card-glowing" style={{ padding: 20 }}>
                    <div className="col" style={{ gap: 16 }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <div className="icon-box" style={{ background: 'rgba(var(--success-rgb), 0.1)', padding: 10, borderRadius: 12 }}>
                          <Activity size={20} className="text-success" />
                        </div>
                        <span className="insight-tag ai">Health</span>
                      </div>
                      <div className="col" style={{ gap: 4 }}>
                        <span className="muted text-xs">System Efficiency</span>
                        <strong className="text-xl">{analytics.resolutionRate}% Resolved</strong>
                      </div>
                      <div className="mood-visualizer">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${analytics.resolutionRate}%` }}
                          className="mood-bar" 
                          style={{ background: 'var(--success)' }}
                        />
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="card ai-card-glowing" style={{ padding: 20 }}>
                    <div className="col" style={{ gap: 16 }}>
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <div className="icon-box" style={{ background: 'rgba(var(--warning-rgb), 0.1)', padding: 10, borderRadius: 12 }}>
                          <Zap size={20} className="text-warning" />
                        </div>
                        <span className="insight-tag ai">Smart</span>
                      </div>
                      <div className="col" style={{ gap: 4 }}>
                        <span className="muted text-xs">Smart Fixes</span>
                        <strong className="text-xl">{aiInsights.categoryMismatches.length} Available</strong>
                      </div>
                      <p className="text-xs muted">AI suggested re-classification for complaints in incorrect categories.</p>
                    </div>
                  </motion.div>
                </div>

                <div className="ai-insight-grid" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                  {/* Actionable Insights */}
                  <motion.div variants={itemVariants} className="card col" style={{ gap: 20 }}>
                    <div className="row" style={{ gap: 12 }}>
                      <Lightbulb className="text-warning" />
                      <div className="col" style={{ gap: 2 }}>
                        <strong className="text-lg">AI Recommendations</strong>
                        <span className="muted text-xs">Tips to improve your complaint management system</span>
                      </div>
                    </div>
                    
                    <div className="col" style={{ gap: 12 }}>
                      {aiInsights.recommendations.map((rec, i) => (
                        <div key={i} className="ai-recommendation-card card p-4">
                          <div className="row" style={{ gap: 16 }}>
                            <div style={{ fontSize: '24px' }}>{rec.icon}</div>
                            <div className="col" style={{ flex: 1, gap: 4 }}>
                              <strong className="text-sm">{rec.title}</strong>
                              <p className="text-xs muted">{rec.desc}</p>
                            </div>
                            <span className={`pill priority ${rec.priority}`}>{rec.impact}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>

                  {/* AI Strategy Card */}
                  <motion.div variants={itemVariants} className="ai-strategy-card">
                    <div className="col" style={{ gap: 24, height: '100%', justifyContent: 'space-between' }}>
                      <div className="col" style={{ gap: 16 }}>
                        <div className="ai-pulse-container" style={{ width: 50, height: 50, background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>
                          <Brain size={28} />
                        </div>
                        <div className="col" style={{ gap: 8 }}>
                          <h3 style={{ margin: 0, color: 'white' }}>AI Strategy Generated</h3>
                          <p className="text-sm" style={{ opacity: 0.8, lineHeight: 1.5 }}>
                            {aiInsights.strategyText}
                          </p>
                        </div>
                      </div>
                      <button 
                        className={`ai-glow-button ${strategyApplying ? 'applying' : ''}`}
                        onClick={applySmartStrategy}
                        disabled={strategyApplying}
                      >
                        {strategyApplying ? <Sparkles className="spin" size={18} /> : <Zap size={18} />}
                        {strategyApplying ? 'Applying...' : 'Apply Smart Strategy'}
                      </button>
                    </div>
                  </motion.div>
                </div>

                {/* Risk List (Compact) */}
                {aiInsights.urgentIssues.length > 0 && (
                  <motion.div variants={itemVariants} className="card col" style={{ gap: 16 }}>
                    <div className="row" style={{ gap: 12 }}>
                      <ShieldAlert className="text-danger" />
                      <strong className="text-lg">Complaints Requiring Immediate Attention</strong>
                    </div>
                    <div className="col" style={{ gap: 12 }}>
                      {aiInsights.urgentIssues.map(c => (
                        <div key={c.id} className="row" style={{ background: 'var(--bg)', padding: '12px 16px', borderRadius: 12, justifyContent: 'space-between' }}>
                          <div className="col" style={{ gap: 4 }}>
                            <span className="text-sm font-bold">{c.title}</span>
                            <span className="text-xs muted">Category: {c.category} • AI Priority: High</span>
                          </div>
                          <button className="btn brand" onClick={() => {
                            setAssignments(prev => ({ ...prev, [c.id]: 'High' }));
                            savePriority(c.id);
                          }}>Fix Now</button>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}


              </motion.div>
            ) : (
              <motion.div 
                key="other-sections"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="col"
                style={{ gap: 16 }}
              >
            <>
              <div className="card row" style={{ justifyContent: 'space-between' }}>
                <strong>
                  {section === 'list' ? 'All Complaints'
                  : section === 'priority' ? 'Assign Priority'
                  : section === 'status' ? 'Update Status'
                  : section === 'active' ? 'Active Complaints'
                  : section === 'pending' ? 'Pending Complaints'
                  : section === 'resolved' ? 'Resolved Complaints'
                  : 'Reports'}
                </strong>
              </div>
              {error && <div className="error">{error}</div>}
              {loading && <div className="card">Loading...</div>}
              {section === 'list' ? (
                <>
                  <div className="list-toolbar" style={{ marginBottom: 20, gap: 16 }}>
                    <div className="search-box" style={{ flex: 1, padding: '8px 16px' }}>
                      <Search size={18} className="muted" />
                      <input
                        className="toolbar-input"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by student, ID, subject..."
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
                    <div className="filter-box" style={{ borderLeft: '4px solid var(--warning)' }}>
                      <div className="icon-box" style={{ background: 'rgba(var(--warning-rgb), 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                        <Zap size={16} style={{ color: 'var(--warning)' }} />
                      </div>
                      <select
                        className="toolbar-select"
                        value={priorityFilter}
                        onChange={e => setPriorityFilter(e.target.value)}
                      >
                        <option value="All">All Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
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
                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                    <div className="filter-box" style={{ borderLeft: '4px solid var(--success)' }}>
                      <div className="icon-box" style={{ background: 'rgba(var(--success-rgb), 0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                        <Filter size={16} style={{ color: 'var(--success)' }} />
                      </div>
                      <select
                        className="toolbar-select"
                        value={departmentFilter}
                        onChange={e => setDepartmentFilter(e.target.value)}
                      >
                        <option value="All">All Departments</option>
                        {uniqueDepartments.map(dept => <option key={dept} value={dept}>{dept}</option>)}
                      </select>
                    </div>
                    <div className="filter-box" style={{ borderLeft: '4px solid var(--muted)' }}>
                      <div className="icon-box" style={{ background: 'rgba(0,0,0,0.1)', padding: 6, borderRadius: 8, display: 'flex' }}>
                        <Filter size={16} style={{ color: 'var(--muted)' }} />
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
                  {(() => {
                    const listItems = sectionItems
                    return (
                      <div className="table-card">
                        <div className="row" style={{ justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)', flexWrap:'wrap', gap:'8px' }}>
                          <div className="row" style={{ gap:'8px', alignItems:'center' }}>
                            <label className="row" style={{ alignItems:'center', gap:'8px' }}>
                              <input 
                                type="checkbox" 
                                checked={listItems.length > 0 && selectedIds.length === listItems.length}
                                onChange={() => toggleSelectAll(listItems)}
                                style={{ width:'16px', height:'16px', cursor:'pointer' }}
                              />
                              <strong>Complaints ({listItems.length})</strong>
                            </label>
                            {selectedIds.length > 0 && (
                              <div className="row" style={{ gap:'8px', marginLeft:'16px', alignItems:'center' }}>
                                <span className="text-muted-foreground text-sm">{selectedIds.length} selected</span>
                                <select 
                                  className="toolbar-select"
                                  style={{ padding:'6px 10px', fontSize:'12px' }}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      bulkUpdateStatus(e.target.value)
                                    }
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Bulk Status</option>
                                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select 
                                  className="toolbar-select"
                                  style={{ padding:'6px 10px', fontSize:'12px' }}
                                  onChange={(e) => {
                                    if (e.target.value) {
                                      bulkUpdatePriority(e.target.value)
                                    }
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Bulk Priority</option>
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="list-header" style={{ display:'grid', gridTemplateColumns:'0.5fr 0.8fr 1.2fr 1fr 2fr 0.6fr 1fr 1fr 0.6fr 1fr auto' }}>
                          <div></div>
                          <div>ID</div>
                          <div>Student</div>
                          <div>Category</div>
                          <div>Title</div>
                          <div>AI</div>
                          <div>Priority</div>
                          <div>Status</div>
                          <div>Rating</div>
                          <div>Date</div>
                          <div>Actions</div>
                        </div>
                        {listItems.map(c => {
                          const sentiment = analyzeSentiment(c.description || '')
                          const summary = summarizeComplaint(c.description || '')
                          const studentProfile = c.profiles || {}
                          return (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              key={c.id} 
                              style={{ borderBottom:'1px solid var(--border)', background:'var(--card)' }}
                            >
                              <div className="list-row" style={{ display:'grid', gridTemplateColumns:'0.5fr 0.8fr 1.2fr 1fr 2fr 0.6fr 1fr 1fr 0.6fr 1fr auto', borderBottom:'none' }}>
                                <div className="list-cell">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedIds.includes(c.id)}
                                    onChange={() => toggleSelect(c.id)}
                                    style={{ width:'16px', height:'16px', cursor:'pointer' }}
                                  />
                                </div>
                                <div className="list-cell">{String(c.id)}</div>
                                <div className="list-cell">
                                  <div className="row" style={{ gap:8, alignItems:'center' }}>
                                    {studentProfile.avatar_url ? (
                                      <img src={studentProfile.avatar_url} style={{ width:24, height:24, borderRadius:'50%', objectFit:'cover' }} alt="" />
                                    ) : (
                                      <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--accent)', color:'white', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                        {(studentProfile.name || '?').charAt(0)}
                                      </div>
                                    )}
                                    <span>{studentProfile.name || c.user_id}</span>
                                  </div>
                                </div>
                                <div className="list-cell"><span className="pill">{c.category}</span></div>
                                <div className="list-cell" title={summary}>{c.title}</div>
                                <div className="list-cell">
                                  {sentiment > 0 ? (
                                    <ThumbsUp size={16} color="var(--success)" title="Positive Sentiment" />
                                  ) : sentiment < 0 ? (
                                    <ThumbsDown size={16} color="var(--danger)" title="Negative Sentiment" />
                                  ) : (
                                    <Minus size={16} color="var(--muted)" title="Neutral Sentiment" />
                                  )}
                                </div>
                                <div className="list-cell"><span className={priorityClass(c.priority || '')}>{c.priority || '—'}</span></div>
                                <div className="list-cell">
                                  <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                                    <div 
                                      style={{ 
                                        width: 8, 
                                        height: 8, 
                                        borderRadius: '50%', 
                                        backgroundColor: 
                                        c.status === 'Pending' ? 'var(--danger)' : 
                                        c.status === 'In Progress' ? 'var(--warning)' : 
                                        'var(--success)',
                                      boxShadow: `0 0 8px ${
                                        c.status === 'Pending' ? 'var(--danger)' : 
                                        c.status === 'In Progress' ? 'var(--warning)' : 
                                        'var(--success)'
                                      }`
                                      }} 
                                    />
                                    <span className={statusClass(c.status || '')}>{c.status}</span>
                                  </div>
                                </div>
                                <div className="list-cell">
                                  {c.rating && c.rating > 0 ? (
                                    <span 
                                      title={`${c.rating}/5 stars${c.feedback ? ` • ${c.feedback}` : ''}`}
                                      style={{ 
                                        color: '#fbbf24', 
                                        fontWeight: 'bold', 
                                        fontSize: '13px',
                                        whiteSpace: 'nowrap'
                                      }}
                                    >
                                      {'★'.repeat(c.rating)}<span style={{ color:'var(--muted)' }}>{'☆'.repeat(5-c.rating)}</span>
                                    </span>
                                  ) : (
                                    <span style={{ color:'var(--muted)' }}>—</span>
                                  )}
                                </div>
                                <div className="list-cell">{new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}</div>
                                <div className="col" style={{ gap:8 }}>
                                  <div className="row" style={{ gap: 8 }}>
                                    <Link to={`/complaint/${c.id}`} className="btn secondary small">View</Link>
                                    <button className="btn secondary small" onClick={() => updateStatus(c.id, 'In Progress')}>Update</button>
                                    <button className="btn brand small" onClick={() => updateStatus(c.id, 'Resolved')}>Resolve</button>
                                  </div>
                                  {c.category === 'Ragging' && (
                                    <div className="row" style={{ gap: 8, marginTop: 4 }}>
                                      <a href="tel:100" className="btn danger small" title="Call Police" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
                                        <PhoneCall size={12} /> Call
                                      </a>
                                      {(() => {
                                        const locMatch = (c.description || '').match(/\n\n📍 Emergency Location: (https:\/\/maps\.google\.com\/\?q=[0-9.,-]+)/);
                                        return locMatch ? (
                                          <a href={locMatch[1]} target="_blank" rel="noreferrer" className="btn brand small" title="View Location" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px' }}>
                                            <MapPin size={12} /> Location
                                          </a>
                                        ) : null;
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            <div className="row" style={{ padding:'0 16px 16px 16px', gap:12, alignItems: 'center' }}>
                              <span className="icon" style={{ color: 'var(--muted)' }}>↪️</span>
                              <input
                                className="input"
                                placeholder="Write a reply to the student..."
                                style={{ flex:1 }}
                                value={remarks[c.id] || ''}
                                onChange={e => setRemarks(prev => ({ ...prev, [c.id]: e.target.value }))}
                              />
                              <button className="btn secondary small" onClick={() => addRemark(c.id)}>Send Reply</button>
                            </div>
                          </motion.div>
                        )})}
                      </div>
                    )
                  })()}
                </>
              ) : section === 'priority' ? (
                <>
                  <div className="row" style={{ justifyContent:'space-between' }}>
                    <div className="col">
                      <strong>Assign Priority</strong>
                      <span className="muted">Set priority levels for pending complaints</span>
                    </div>
                    <button className="btn brand btn-lg" onClick={saveAllPriorities}>Save All Changes</button>
                  </div>
                  <div className="card" style={{ background:'var(--bg)' }}>
                    <div className="row" style={{ gap:20, alignItems:'center' }}>
                      <div className="row" style={{ gap:8 }}>
                        <span>⚠️</span><strong>Priority Guidelines</strong>
                      </div>
                      <div className="row" style={{ gap:16, flexWrap:'wrap' }}>
                        <span className="pill priority high">High</span><span className="muted">Urgent issues affecting safety, health, or academics immediately</span>
                        <span className="pill priority medium">Medium</span><span className="muted">Important issues that need attention within 3–5 days</span>
                        <span className="pill priority low">Low</span><span className="muted">Minor issues or suggestions that can wait</span>
                      </div>
                    </div>
                  </div>
                  {(() => {
                    const assignList = items.filter(c => !c.priority || c.priority === '' || c.priority === null)
                    const rows = assignList.length > 0 ? assignList : items
                    return (
                      <div className="table-card" style={{ marginTop:16 }}>
                        <div className="row" style={{ justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
                          <strong>Pending Priority Assignment ({rows.length})</strong>
                        </div>
                        <div className="list-header" style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr 2fr 1fr 1fr 1fr auto' }}>
                          <div>ID</div>
                          <div>Student</div>
                          <div>Category</div>
                          <div>Title</div>
                          <div>Current Priority</div>
                          <div>Assign Priority</div>
                          <div>Date</div>
                          <div>Action</div>
                        </div>
                        {rows.map((c, idx) => (
                          <motion.div 
                            key={c.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="list-row" 
                            style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr 2fr 1fr 1fr 1fr auto' }}
                          >
                            <div className="list-cell">{String(c.id)}</div>
                            <div className="list-cell">{c.profiles?.name || c.user_id}</div>
                            <div className="list-cell"><span className="pill">{c.category}</span></div>
                            <div className="list-cell">{c.title}</div>
                            <div className="list-cell">
                              <span className={c.priority ? priorityClass(c.priority) : 'badge'}>{c.priority || 'Not Set'}</span>
                            </div>
                            <div className="list-cell">
                              <select className="input" value={assignments[c.id] ?? ''} onChange={e => setAssignments(a => ({ ...a, [c.id]: e.target.value }))}>
                                <option value="">Select</option>
                                <option>Low</option>
                                <option>Medium</option>
                                <option>High</option>
                              </select>
                            </div>
                            <div className="list-cell">{new Date(c.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short', hour12: true })}</div>
                            <div className="list-cell">
                              <button className="btn secondary" onClick={() => savePriority(c.id)}>Save</button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )
                  })()}
                </>
              ) : section === 'status' ? (
                <>
                  <div className="row" style={{ justifyContent:'space-between' }}>
                    <div className="col">
                      <strong>Update Status</strong>
                      <span className="muted">Update the status of active complaints</span>
                    </div>
                    <button className="btn brand btn-lg" onClick={saveAllStatuses}>Save All Changes</button>
                  </div>
                  <div className="admin-metrics">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{counts.pending}</div>
                      <div className="metric-title">Pending</div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{counts.active}</div>
                      <div className="metric-title">In Progress</div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{counts.resolved}</div>
                      <div className="metric-title">Ready to Resolve</div>
                    </motion.div>
                  </div>
                  {(() => {
                    const rows = items.filter(c => c.status !== 'Resolved')
                    return (
                      <div className="table-card" style={{ marginTop:16 }}>
                        <div className="row" style={{ justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
                          <strong>Active Complaints ({rows.length})</strong>
                        </div>
                        <div className="list-header" style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 2fr 1fr 1fr 1fr auto' }}>
                          <div>ID</div>
                          <div>Student</div>
                          <div>Title</div>
                          <div>Priority</div>
                          <div>Current Status</div>
                          <div>Update To</div>
                          <div>Actions</div>
                        </div>
                        {rows.map((c, idx) => (
                          <motion.div 
                            key={c.id} 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="list-row" 
                            style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 2fr 1fr 1fr 1fr auto' }}
                          >
                            <div className="list-cell">{String(c.id)}</div>
                            <div className="list-cell">{c.profiles?.name || c.user_id}</div>
                            <div className="list-cell">{c.title}</div>
                            <div className="list-cell"><span className={priorityClass(c.priority || '')}>{c.priority || '—'}</span></div>
                            <div className="list-cell"><span className={statusClass(c.status || '')}>{c.status}</span></div>
                            <div className="list-cell">
                              <select className="input" value={statusUpdates[c.id] ?? c.status} onChange={e => setStatusUpdates(s => ({ ...s, [c.id]: e.target.value }))}>
                                {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </div>
                            <div className="list-cell">
                              <button className="btn secondary" onClick={() => saveStatus(c.id)}>Save</button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )
                  })()}
                </>
              ) : section === 'categories' ? (
                <>
                  <div className="row" style={{ justifyContent:'space-between' }}>
                    <div className="col">
                      <strong>Manage Categories</strong>
                      <span className="muted">Add or remove complaint categories</span>
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card"
                    style={{ marginBottom: 20 }}
                  >
                    <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
                      <div className="col" style={{ flex: 1, gap: 6 }}>
                        <label className="label" style={{ margin: 0 }}>New Category Name</label>
                        <div className="input-group-modern">
                          <input
                            className="input-modern"
                            placeholder="Enter category name"
                            value={newCategory}
                            onChange={e => setNewCategory(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addCategory()}
                          />
                        </div>
                      </div>
                      <button className="btn brand" onClick={addCategory}>
                        <Plus size={18} />
                        <span>Add Category</span>
                      </button>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="table-card"
                  >
                    <div className="row" style={{ justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
                      <strong>Categories ({categories.length})</strong>
                    </div>
                    <div className="list-header" style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto' }}>
                      <div>Category Name</div>
                      <div>Created At</div>
                      <div>Actions</div>
                    </div>
                    {categories.map((cat, idx) => (
                      <motion.div 
                        key={cat.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.03 }}
                        className="list-row" 
                        style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto' }}
                      >
                        <div className="list-cell">
                          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                            <div className="icon-box" style={{ background: 'rgba(var(--accent-rgb), 0.1)', padding: 8, borderRadius: 10, display: 'flex' }}>
                              <Tag size={18} style={{ color: 'var(--accent)' }} />
                            </div>
                            <strong>{cat.name}</strong>
                          </div>
                        </div>
                        <div className="list-cell">{new Date(cat.created_at).toLocaleDateString()}</div>
                        <div className="list-cell">
                          <button 
                            className="btn danger btn-sm" 
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${cat.name}"?`)) {
                                deleteCategory(cat.id, cat.name);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {categories.length === 0 && (
                      <div className="col" style={{ padding: '40px', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <Tag size={40} className="muted" />
                        <p className="muted text-center">No categories yet. Add your first category above!</p>
                      </div>
                    )}
                  </motion.div>
                </>
              ) : section === 'departments' ? (
                <>
                  <div className="row" style={{ justifyContent:'space-between' }}>
                    <div className="col">
                      <strong>Manage Departments</strong>
                      <span className="muted">Add or remove departments</span>
                    </div>
                  </div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="card"
                    style={{ marginBottom: 20 }}
                  >
                    <div className="row" style={{ gap: 12, alignItems: 'flex-end' }}>
                      <div className="col" style={{ flex: 1, gap: 6 }}>
                        <label className="label" style={{ margin: 0 }}>New Department Name</label>
                        <div className="input-group-modern">
                          <input
                            className="input-modern"
                            placeholder="Enter department name"
                            value={newDepartment}
                            onChange={e => setNewDepartment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && addDepartment()}
                          />
                        </div>
                      </div>
                      <button className="btn brand" onClick={addDepartment}>
                        <Plus size={18} />
                        <span>Add Department</span>
                      </button>
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="table-card"
                  >
                    <div className="row" style={{ justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
                      <strong>Departments ({departments.length})</strong>
                    </div>
                    <div className="list-header" style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto' }}>
                      <div>Department Name</div>
                      <div>Created At</div>
                      <div>Actions</div>
                    </div>
                    {departments.map((dept, idx) => (
                      <motion.div 
                        key={dept.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + idx * 0.03 }}
                        className="list-row" 
                        style={{ display:'grid', gridTemplateColumns:'2fr 1fr auto' }}
                      >
                        <div className="list-cell">
                          <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                            <div className="icon-box" style={{ background: 'rgba(var(--accent-rgb), 0.1)', padding: 8, borderRadius: 10, display: 'flex' }}>
                              <Building2 size={18} style={{ color: 'var(--accent)' }} />
                            </div>
                            <strong>{dept.name}</strong>
                          </div>
                        </div>
                        <div className="list-cell">{new Date(dept.created_at).toLocaleDateString()}</div>
                        <div className="list-cell">
                          <button 
                            className="btn danger btn-sm" 
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to delete "${dept.name}"?`)) {
                                deleteDepartment(dept.id, dept.name);
                              }
                            }}
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      </motion.div>
                    ))}
                    {departments.length === 0 && (
                      <div className="col" style={{ padding: '40px', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                        <Building2 size={40} className="muted" />
                        <p className="muted text-center">No departments yet. Add your first department above!</p>
                      </div>
                    )}
                  </motion.div>
                </>
              ) : section === 'reports' ? (
                <>
                  <div className="row" style={{ justifyContent:'space-between' }}>
                    <div className="col">
                      <strong>Reports & Analytics</strong>
                      <span className="muted">Overview of complaint metrics and trends</span>
                    </div>
                    <button className="btn secondary row" style={{ gap: 8 }} onClick={generateReport}>
                      <Download size={16} />
                      <span>Download PDF Report</span>
                    </button>
                  </div>
                  <div className="admin-metrics">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{analytics.total}</div>
                      <div className="metric-title">Total Complaints</div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{analytics.resolutionRate}%</div>
                      <div className="metric-title">Resolution Rate</div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{analytics.avgDays} days</div>
                      <div className="metric-title">Avg. Resolution</div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ y: -5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 }}
                      className="metric-card"
                    >
                      <div className="row" style={{ justifyContent: 'space-between', width: '100%' }}>
                        <div className="col">
                          <div className="metric-number">{studentStats.health}%</div>
                          <div className="metric-title">System Health</div>
                        </div>
                        <Activity className="text-accent" size={24} />
                      </div>
                      <div className="health-meter">
                        <div className="health-fill" style={{ width: `${studentStats.health}%` }}></div>
                      </div>
                    </motion.div>
                  </div>
                  <div className="dashboard-panels" style={{ gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))', gap:16 }}>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="panel card" 
                      style={{ minHeight: 400 }}
                    >
                      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 20 }}>
                        <div className="row" style={{ gap:8 }}>
                          <span>📈</span><strong>Weekly Trend</strong>
                        </div>
                        <div className="row" style={{ gap: 12 }}>
                          <div className="row" style={{ gap: 4, alignItems: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }}></div>
                            <span className="text-xs muted">New</span>
                          </div>
                          <div className="row" style={{ gap: 4, alignItems: 'center' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)' }}></div>
                            <span className="text-xs muted">Resolved</span>
                          </div>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={trendData}>
                          <defs>
                            <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--success)" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                          />
                          <Area type="monotone" dataKey="complaints" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorNew)" />
                          <Area type="monotone" dataKey="resolved" stroke="var(--success)" strokeWidth={3} fillOpacity={1} fill="url(#colorRes)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="panel card" 
                      style={{ minHeight: 400 }}
                    >
                      <div className="row" style={{ gap:8, marginBottom: 16 }}>
                        <span>📊</span><strong>Complaints by Category</strong>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analytics.byCat.arr.filter(x => x.count > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="cat"
                            stroke="none"
                          >
                            {analytics.byCat.arr.filter(x => x.count > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
                          />
                          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 }}
                      className="panel card" 
                      style={{ minHeight: 400 }}
                    >
                      <div className="row" style={{ gap:8, marginBottom: 16 }}>
                        <span>🧠</span><strong>AI Sentiment Analysis</strong>
                      </div>
                      <div className="row" style={{ gap:16, marginBottom: 20 }}>
                        <div className="col" style={{ flex: 1, padding: '12px', background: 'rgba(var(--success-rgb), 0.1)', borderRadius: '12px', border: '1px solid rgba(var(--success-rgb), 0.2)' }}>
                          <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 'bold' }}>Positive</span>
                          <span style={{ fontSize: '24px', color: 'var(--success)', fontWeight: 'bold' }}>{sentimentStats[0].value}</span>
                        </div>
                        <div className="col" style={{ flex: 1, padding: '12px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 'bold' }}>Neutral</span>
                          <span style={{ fontSize: '24px', color: 'var(--text)', fontWeight: 'bold' }}>{sentimentStats[1].value}</span>
                        </div>
                        <div className="col" style={{ flex: 1, padding: '12px', background: 'rgba(var(--danger-rgb), 0.1)', borderRadius: '12px', border: '1px solid rgba(var(--danger-rgb), 0.2)' }}>
                          <span style={{ fontSize: '12px', color: 'var(--danger)', fontWeight: 'bold' }}>Negative</span>
                          <span style={{ fontSize: '24px', color: 'var(--danger)', fontWeight: 'bold' }}>{sentimentStats[2].value}</span>
                        </div>
                      </div>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={sentimentStats.filter(x => x.value > 0)}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            nameKey="name"
                          >
                            {sentimentStats.filter(x => x.value > 0).map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend verticalAlign="bottom" height={36}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="panel card" 
                      style={{ minHeight: 400 }}
                    >
                      <div className="row" style={{ gap:8, marginBottom: 16 }}>
                        <span>📈</span><strong>Monthly Trend</strong>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={analytics.monthly}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--muted)', fontSize: 12 }} />
                          <Tooltip cursor={{ fill: 'var(--bg)' }} contentStyle={{ background: 'var(--card)', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: 'var(--shadow)', color: 'var(--text)' }} />
                          <Legend wrapperStyle={{ paddingTop: '10px' }} />
                          <Bar dataKey="submitted" name="Submitted" fill="var(--info)" radius={[4, 4, 0, 0]} barSize={30} />
                          <Bar dataKey="resolved" name="Resolved" fill="var(--success)" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      </ResponsiveContainer>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 }}
                      className="panel card" 
                      style={{ minHeight: 400 }}
                    >
                      <div className="row" style={{ gap:8, marginBottom: 16 }}>
                        <span>📊</span><strong>Complaints by Status</strong>
                      </div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </motion.div>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9 }}
                    className="card col" 
                    style={{ gap:12, marginTop:16 }}
                  >
                    <strong>Current Status Summary</strong>
                    <div className="grid" style={{ gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
                      <div className="stat-card" style={{ background:'rgba(var(--warning-rgb), 0.08)', borderColor:'rgba(var(--warning-rgb), 0.25)' }}>
                        <div className="col" style={{ alignItems:'center', gap:6 }}>
                          <div className="icon">⚠️</div>
                          <div className="stat-number" style={{ color:'var(--warning)' }}>{counts.pending}</div>
                          <span className="muted">Pending Review</span>
                        </div>
                      </div>
                      <div className="stat-card" style={{ background:'rgba(var(--accent-rgb), 0.08)', borderColor:'rgba(var(--accent-rgb), 0.25)' }}>
                        <div className="col" style={{ alignItems:'center', gap:6 }}>
                          <div className="icon">🕒</div>
                          <div className="stat-number" style={{ color:'var(--info)' }}>{counts.active}</div>
                          <span className="muted">In Progress</span>
                        </div>
                      </div>
                      <div className="stat-card" style={{ background:'rgba(var(--success-rgb), 0.08)', borderColor:'rgba(var(--success-rgb), 0.25)' }}>
                        <div className="col" style={{ alignItems:'center', gap:6 }}>
                          <div className="icon">✅</div>
                          <div className="stat-number" style={{ color:'var(--success)' }}>{counts.resolved}</div>
                          <span className="muted">Resolved</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </>
              ) : section === 'students' ? (
                <>
                  <div className="row" style={{ justifyContent:'space-between' }}>
                    <div className="col">
                      <strong>Manage Students</strong>
                      <span className="muted">View and manage registered students</span>
                    </div>
                  </div>
                  <div className="admin-metrics" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{studentAnalytics.total}</div>
                      <div className="metric-title">Total Students</div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{studentAnalytics.activeCount}</div>
                      <div className="metric-title">With Active Complaints</div>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="metric-card"
                    >
                      <div className="metric-top"></div>
                      <div className="metric-number">{studentAnalytics.totalComplaints}</div>
                      <div className="metric-title">Total Complaints Filed</div>
                    </motion.div>
                  </div>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="list-toolbar" 
                    style={{ marginBottom: 10 }}
                  >
                    <div className="search-box" style={{ flex: 1 }}>
                      <input
                        className="toolbar-input"
                        value={studentQuery}
                        onChange={e => setStudentQuery(e.target.value)}
                        placeholder="Search by name, ID, email, or department..."
                      />
                    </div>
                  </motion.div>
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="table-card"
                  >
                    <div className="row" style={{ justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg)' }}>
                      <strong>Students ({filteredStudents.length})</strong>
                    </div>
                    <div className="list-header" style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 2fr 1fr auto' }}>
                      <div>Student</div>
                      <div>Student ID</div>
                      <div>Department</div>
                      <div>Contact</div>
                      <div>Complaints</div>
                      <div>Action</div>
                    </div>
                    {filteredStudents.map((s, idx) => {
                      const sid = s.student_id || `STU${new Date().getFullYear()}${String(s.id).slice(0,4)}`
                      const dept = s.department || '—'
                      const complaints = items.filter(c => c.user_id === s.id)
                      const total = complaints.length
                      const active = complaints.filter(c => c.status !== 'Resolved').length
                      const initials = (s.name || 'NA').split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase()
                      return (
                        <motion.div 
                          key={s.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + (idx * 0.03) }}
                          className="list-row" 
                          style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 2fr 1fr auto' }}
                        >
                          <div className="list-cell">
                            <div className="row" style={{ gap:12, alignItems:'center' }}>
                              {s.avatar_url ? (
                                <img src={s.avatar_url} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                              ) : (
                                <div className="logo">{initials}</div>
                              )}
                              <div className="col">
                                <strong>{s.name || 'Unnamed'}</strong>
                                <span className="muted">{s.hostel ? `Hostel: ${s.hostel}` : ''}</span>
                              </div>
                            </div>
                          </div>
                          <div className="list-cell">{sid}</div>
                          <div className="list-cell"><span className="pill">{dept}</span></div>
                          <div className="list-cell">
                            <div className="col" style={{ gap:4 }}>
                              <div className="row" style={{ gap:6, alignItems:'center' }}><span className="icon">✉️</span><span className="muted">{s.email || '—'}</span></div>
                              <div className="row" style={{ gap:6, alignItems:'center' }}><span className="icon">📞</span><span className="muted">{s.phone || '—'}</span></div>
                            </div>
                          </div>
                          <div className="list-cell">
                            <div className="row" style={{ gap:8, alignItems:'center' }}>
                              <span className="muted">{total} total</span>
                              {active > 0 && <span className="badge status progress">{active} active</span>}
                            </div>
                          </div>
                          <div className="list-cell">
                            <button className="btn secondary" onClick={() => { setSection('list'); setSearch(s.name || sid) }}>
                              View
                            </button>
                          </div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                </>
              ) : (
                <div className="cards-grid">
                  {sectionItems.map(c => (
                    <div key={c.id} className="card col">
                      <div className="row" style={{ justifyContent:'space-between' }}>
                        <strong>{c.title}</strong>
                        <span className="badge">{c.status}</span>
                      </div>
                      <div className="muted">{c.category}</div>
                      <div>{c.description}</div>
                      {c.image_url && <img className="image-thumb" src={c.image_url} alt="attachment" />}
                      <div className="controls col">
                        <div className="row" style={{ justifyContent:'space-between' }}>
                          <span className="badge">User: {c.profiles?.name || c.user_id}</span>
                        </div>
                        <div className="card-controls">
                          {section === 'priority' ? (
                            <select className="input" value={c.priority ?? ''} onChange={e => supabase.from('complaints').update({ priority: e.target.value }).eq('id', c.id)}>
                              <option value="">Select Priority</option>
                              <option>Low</option>
                              <option>Medium</option>
                              <option>High</option>
                            </select>
                          ) : (
                            <select className="input" value={c.status} onChange={e => updateStatus(c.id, e.target.value)}>
                              {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          )}
                          <input className="input remark-input" value={remarks[c.id] ?? ''} onChange={e => setRemarks(r => ({ ...r, [c.id]: e.target.value }))} placeholder="Admin Remark" />
                          <button className="btn secondary" onClick={() => addRemark(c.id)}>Update</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick Action FAB */}
      <motion.button 
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        className="quick-action-fab"
        onClick={() => setSection(section === 'dashboard' ? 'list' : 'dashboard')}
      >
        {section === 'dashboard' ? <ClipboardList size={24} /> : <BarChart3 size={24} />}
      </motion.button>

      {/* Floating AI Assistant - Global Access */}
      <div className="ai-chat-floating">
        <AnimatePresence>
          {aiChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9, transformOrigin: 'bottom right' }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="ai-chat-window glass"
              style={{
                position: 'absolute',
                bottom: '80px',
                right: 0,
                width: '380px',
                height: '550px',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border)',
                background: 'var(--card)'
              }}
            >
              <div className="ai-chat-header" style={{
                padding: '20px',
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.2)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <Brain size={22} className="pulse" />
                  </div>
                  <div className="col" style={{ gap: '2px' }}>
                    <div className="row" style={{ alignItems: 'center', gap: 6 }}>
                      <strong style={{ fontSize: '16px', display: 'block' }}>Admin Gemini</strong>
                      <span style={{ 
                        fontSize: '9px', 
                        background: 'rgba(255,255,255,0.2)', 
                        padding: '2px 6px', 
                        borderRadius: '10px',
                        textTransform: 'uppercase',
                        fontWeight: 'bold'
                      }}>Ultra Pro</span>
                    </div>
                    <span style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
                      Deep System Context Loaded
                    </span>
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button 
                    onClick={() => {
                      if (window.confirm("Clear chat history?")) {
                        setAiMessages([{ id: 1, text: "Chat history cleared. System ready for new analysis.", sender: 'ai' }]);
                        localStorage.removeItem('chat_history_admin');
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'white', opacity: 0.8, cursor: 'pointer' }}
                    title="Clear Chat"
                  >
                    <Zap size={18} />
                  </button>
                  <button 
                    onClick={() => setAiChatOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'white', opacity: 0.8, cursor: 'pointer' }}
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="ai-chat-messages" style={{
                flex: 1,
                overflowY: 'auto',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                background: 'var(--bg)'
              }}>
                {aiMessages.length === 0 ? (
                  <div className="col" style={{ alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 20, textAlign: 'center' }}>
                    <Wand2 size={32} className="muted sparkle-icon" />
                    <p className="muted text-sm">Hello Admin! I'm your Gemini Pro assistant. I have full access to system stats and complaint trends.</p>
                  </div>
                ) : (
                  aiMessages.map((msg, i) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      key={i} 
                      style={{
                        alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                        maxWidth: '85%'
                      }}
                    >
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                        fontSize: '10px',
                        color: 'var(--muted)',
                        marginBottom: '2px',
                        padding: '0 4px'
                      }}>
                        {msg.sender === 'user' ? <Users size={10} /> : <Bot size={10} className="text-accent" />}
                        {msg.sender === 'user' ? 'You (Admin)' : 'Gemini Ultra Pro'}
                        {msg.sender === 'ai' && <ShieldCheck size={10} style={{ color: 'var(--success)' }} />}
                      </div>
                      <div 
                        className={`chat-bubble ${msg.sender}`}
                        style={{
                          background: msg.sender === 'user' ? 'linear-gradient(135deg, var(--accent), var(--accent-2))' : 'var(--card)',
                          color: msg.sender === 'user' ? 'white' : 'var(--text)',
                          padding: '12px 16px',
                          borderRadius: '18px',
                          borderTopRightRadius: msg.sender === 'user' ? '4px' : '18px',
                          borderTopLeftRadius: msg.sender === 'ai' ? '4px' : '18px',
                          fontSize: '14px',
                          lineHeight: '1.6',
                          boxShadow: msg.sender === 'ai' ? '0 4px 15px rgba(0,0,0,0.1)' : '0 4px 15px rgba(var(--accent-rgb), 0.2)',
                          border: msg.sender === 'ai' ? '1px solid var(--border)' : 'none',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {msg.sender === 'ai' && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            padding: '4px',
                            opacity: 0.1
                          }}>
                            <Sparkles size={12} />
                          </div>
                        )}
                        <div style={{ whiteSpace: 'pre-wrap' }}>
                          {msg.text.split('\n').map((line, idx) => {
                            if (line.startsWith('###')) {
                              return <h3 key={idx} style={{ margin: '8px 0', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{line.replace('###', '')}</h3>
                            }
                            if (line.startsWith('•')) {
                              return <li key={idx} style={{ marginLeft: '12px', listStyleType: 'none', display: 'flex', gap: '8px' }}>
                                <span style={{ color: 'var(--accent)' }}>•</span> {line.replace('•', '')}
                              </li>
                            }
                            if (line.includes('**')) {
                              const parts = line.split('**');
                              return <p key={idx} style={{ margin: '4px 0' }}>
                                {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: 'var(--accent)' }}>{part}</strong> : part)}
                              </p>
                            }
                            return <p key={idx} style={{ margin: '4px 0' }}>{line}</p>
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
                {loading && aiMessages.length > 0 && aiMessages[aiMessages.length-1].sender === 'user' && (
                  <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center', padding: '0 8px' }}>
                    <div className="typing-dot" />
                    <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>AI is analyzing system data...</span>
                  </div>
                )}
              </div>

              <div style={{ padding: '8px 16px', display: 'flex', gap: 8, overflowX: 'auto', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
                {[
                  { label: 'System Stats', query: 'count total complaints' },
                  { label: 'Most Common', query: 'what is the most common category' },
                  { label: 'Latest Task', query: 'latest complaint' },
                  { label: 'Efficiency', query: 'system efficiency' }
                ].map((s, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setAiInput(s.query);
                      handleAdminAiChat({ preventDefault: () => {} });
                    }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      fontSize: '11px',
                      color: 'var(--text)',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer'
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAdminAiChat} className="ai-chat-input" style={{
                padding: '16px',
                background: 'var(--card)',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                gap: '10px',
                alignItems: 'center'
              }}>
                <input 
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  placeholder="Ask system intelligence..." 
                  style={{
                    flex: 1,
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: '14px',
                    padding: '12px 16px',
                    outline: 'none',
                    fontSize: '14px',
                    color: 'var(--text)',
                    transition: 'all 0.2s ease'
                  }}
                />
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit" 
                  disabled={!aiInput.trim()}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: aiInput.trim() ? 'pointer' : 'not-allowed',
                    opacity: aiInput.trim() ? 1 : 0.5
                  }}
                >
                  <Send size={18} />
                </motion.button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1, rotate: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setAiChatOpen(!aiChatOpen)}
          className={`ai-chat-toggle ${aiChatOpen ? 'active' : ''}`}
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color: 'white',
            border: 'none',
            boxShadow: '0 8px 32px rgba(var(--accent-rgb), 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          {aiChatOpen ? <X size={28} /> : <Brain size={28} />}
          {!aiChatOpen && (
            <motion.div 
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="ai-ping"
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '15px',
                height: '15px',
                background: 'var(--success)',
                borderRadius: '50%',
                border: '3px solid var(--bg)'
              }}
            />
          )}
        </motion.button>
      </div>
    </div>
  </div>
</div>
)
}
