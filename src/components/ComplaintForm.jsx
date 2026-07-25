import { useState, useEffect, useRef } from 'react'
import { supabase, BUCKET } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import { predictCategory, suggestPriority, improveDescription, generateDescription } from '../utils/ai'
import { Sparkles, BrainCircuit, Wand2, MapPin, AlertTriangle } from 'lucide-react'

const priorities = ['Low', 'Medium', 'High']

export default function ComplaintForm({ onCreated }) {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categories, setCategories] = useState(['Academic', 'Administrative', 'Facilities', 'Faculty', 'Hostel', 'Library', 'Transportation', 'Ragging', 'Other'])
  const [category, setCategory] = useState('Academic')
  const [priority, setPriority] = useState('Medium')
  const [file, setFile] = useState(null)
  const [locationLink, setLocationLink] = useState('')
  const [isLocating, setIsLocating] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiAnalyzing, setAiAnalyzing] = useState(false)
  const [isImproving, setIsImproving] = useState(false)

  const textareaRef = useRef(null)

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      console.log('Fetching categories...')
      try {
        const { data, error } = await supabase.from('categories').select('name').order('name')
        console.log('Categories fetch result:', { data, error })
        
        if (error) {
          console.error('Error fetching categories:', error)
          // Keep default categories
        } else if (data && data.length > 0) {
          const categoryNames = data.map(c => c.name)
          console.log('Setting categories:', categoryNames)
          setCategories(categoryNames)
          if (!category || !categoryNames.includes(category)) {
            setCategory(categoryNames[0])
          }
        }
      } catch (err) {
        console.error('Categories fetch failed:', err)
        // Keep default categories
      }
    }
    fetchCategories()
  }, [])



  // Auto-grow textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.max(textarea.scrollHeight, 200) + 'px'
    }
  }, [description])

  // AI suggestion logic
  useEffect(() => {
    if (description.length > 10) {
      setAiAnalyzing(true)
      const timer = setTimeout(() => {
        const suggestedCategory = predictCategory(description)
        const suggestedPriority = suggestPriority(description)
        
        if (suggestedCategory && suggestedCategory !== 'Other') {
          setCategory(suggestedCategory)
        }
        setPriority(suggestedPriority)
        setAiAnalyzing(false)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [description])

  const handleImproveDescription = () => {
    setIsImproving(true)
    setTimeout(() => {
      let result = ''
      if (!description.trim()) {
        // Auto-generate based on title and category
        result = generateDescription(title, category)
      } else {
        // Improve existing description
        result = improveDescription(description)
      }
      setDescription(result)
      setIsImproving(false)
    }, 1200)
  }



  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const link = `https://maps.google.com/?q=${latitude},${longitude}`
        setLocationLink(link)
        setIsLocating(false)
      },
      (err) => {
        console.error(err)
        setError('Failed to get location. Please allow location access.')
        setIsLocating(false)
      }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    let image_url = null
    try {
      if (file) {
        if (!user) throw new Error('You must be logged in to upload files')
        console.log('Uploading file:', file.name, 'to bucket:', BUCKET)
        const uuid = typeof crypto.randomUUID === 'function' 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        const path = `${user.id}/${uuid}-${file.name}`
        
        const { error: upErr, data: upData } = await supabase.storage.from(BUCKET).upload(path, file, { 
          upsert: false,
          cacheControl: '3600'
        })
        
        if (upErr) {
          console.error('Upload Error Details:', upErr)
          throw new Error(`Upload failed: ${upErr.message}`)
        }
        
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
        image_url = data.publicUrl
        console.log('File uploaded successfully, URL:', image_url)
      }
      let finalDescription = description
      if (locationLink) {
        finalDescription += `\n\n📍 Location: ${locationLink}`
      }

      let payload = {
        user_id: user.id,
        title,
        description: finalDescription,
        category,
        priority,
        image_url,
        status: 'Pending'
      }
      let res = await supabase.from('complaints').insert(payload).select('*').single()
      if (res.error) {
        const msg = (res.error.message || '').toLowerCase()
        if (msg.includes('priority')) {
          delete payload.priority
          res = await supabase.from('complaints').insert(payload).select('*').single()
        }
      }
      if (res.error) {
        const msg2 = (res.error.message || '').toLowerCase()
        if (msg2.includes('complaints_category_check') || (msg2.includes('category') && msg2.includes('check'))) {
          payload.category = 'Other'
          res = await supabase.from('complaints').insert(payload).select('*').single()
        }
      }
      const data = res.data
      const insErr = res.error
      if (insErr) throw insErr
      setTitle('')
      setDescription('')
      setCategory(categories[0])
      setPriority('Medium')
      setFile(null)
      setLocationLink('')
      onCreated?.(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="card col complaint-form" onSubmit={handleSubmit}>
      <div className="col" style={{ gap:6 }}>
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <h3>Submit a Complaint</h3>
          {aiAnalyzing && (
            <div className="ai-badge" style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, background:'var(--accent-light)', color:'var(--accent)', padding:'4px 10px', borderRadius:20 }}>
              <Sparkles size={14} className="animate-pulse" />
              <span>AI Analyzing...</span>
            </div>
          )}
        </div>
        <span className="muted">Fill out the form below to submit your complaint. All fields marked with * are required.</span>
      </div>

      <label className="label">Category *</label>
      <select className="input" value={category} onChange={e=>setCategory(e.target.value)}>
        {categories.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <label className="label">Subject *</label>
      <input 
        className="input" 
        value={title} 
        onChange={e=>setTitle(e.target.value)} 
        placeholder="Brief description of your complaint..." 
        style={{ minHeight: '50px', fontSize: '16px' }} 
        required 
      />
      <div className="col">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="label">Description *</label>
          <div className="row" style={{ gap:8 }}>

            <button 
              type="button"
              onClick={handleImproveDescription}
              disabled={isImproving}
              className="text-xs flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              {isImproving ? (
                <>
                  <Sparkles size={12} className="animate-spin" />
                  <span>Improving...</span>
                </>
              ) : (
                <>
                  <Wand2 size={12} />
                  <span>Help me write this (AI)</span>
                </>
              )}
            </button>
          </div>
        </div>
        <textarea 
          ref={textareaRef}
          className="input" 
          value={description} 
          onChange={e=>setDescription(e.target.value)} 
          placeholder="Provide detailed information about your complaint..." 
          rows={8} 
          style={{ minHeight: '200px', resize: 'none' }}
          required 
        />
      </div>
      <label className="label">Priority Level *</label>
      <div className="priority-group">
        {priorities.map(p => (
          <button
            key={p}
            type="button"
            className={`priority-option ${priority===p?'active':''}`}
            onClick={() => setPriority(p)}
            style={{
              backgroundColor: priority === p 
                ? (p === 'Low' ? 'rgba(16, 185, 129, 0.15)' : p === 'Medium' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)')
                : 'var(--card)',
              borderColor: priority === p 
                ? (p === 'Low' ? 'var(--success)' : p === 'Medium' ? 'var(--warning)' : 'var(--danger)')
                : 'var(--border)',
              color: priority === p 
                ? (p === 'Low' ? 'var(--success)' : p === 'Medium' ? 'var(--warning)' : 'var(--danger)')
                : 'var(--text)'
            }}
          >
            <strong>{p}</strong>
            <span className="muted" style={{ color: priority === p ? 'inherit' : 'var(--muted)' }}>
              {p==='Low'?'Can wait, not urgent':p==='Medium'?'Should be addressed soon':'Urgent, needs immediate attention'}
            </span>
          </button>
        ))}
      </div>

      <div className="col" style={{ gap: 8, background: category === 'Ragging' ? 'rgba(var(--danger-rgb), 0.1)' : 'var(--bg)', padding: '16px', borderRadius: '12px', border: category === 'Ragging' ? '1px solid rgba(var(--danger-rgb), 0.2)' : '1px dashed var(--border)' }}>
        <div className="row" style={{ alignItems: 'center', gap: 8, color: category === 'Ragging' ? 'var(--danger)' : 'var(--text)' }}>
          {category === 'Ragging' ? <AlertTriangle size={18} /> : <MapPin size={18} />}
          <strong style={{ fontSize: '0.9rem' }}>
            {category === 'Ragging' ? 'Emergency Location Sharing' : 'Share Location (Optional)'}
          </strong>
        </div>
        <span className="text-xs muted">
          {category === 'Ragging' 
            ? 'For ragging issues, please share your live location for faster assistance.' 
            : 'You can attach your current location to help us resolve the issue faster.'}
        </span>
        {locationLink ? (
          <div className="row" style={{ alignItems: 'center', gap: 8, background: 'var(--bg)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <MapPin size={16} className="text-success" />
            <span className="text-sm font-bold text-success">Location Attached Successfully</span>
            <button type="button" className="text-xs muted" onClick={() => setLocationLink('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>Remove</button>
          </div>
        ) : (
          <button 
            type="button" 
            className={category === 'Ragging' ? "btn danger" : "btn secondary"} 
            style={{ width: 'fit-content', display: 'flex', alignItems: 'center', gap: 8 }}
            onClick={handleGetLocation}
            disabled={isLocating}
          >
            {isLocating ? <Sparkles size={16} className="animate-spin" /> : <MapPin size={16} />}
            {isLocating ? 'Getting Location...' : 'Share My Live Location'}
          </button>
        )}
      </div>

      <label className="label">Attachments (Optional)</label>
      <div className="upload-dropzone">
        {!file ? (
          <div className="col" style={{ alignItems:'center', gap:4 }}>
            <div className="logo">⬆️</div>
            <span className="muted">Drag and drop files here, or <span style={{ color:'var(--accent)' }}>browse</span></span>
            <span className="muted">Supports: PDF, DOC, DOCX, JPG, PNG (Max 5MB)</span>
          </div>
        ) : (
          <div className="row" style={{ alignItems:'center', justifyContent:'center', gap:12, width:'100%' }}>
            <div className="file-preview-icon" style={{ background:'var(--accent-light)', padding:8, borderRadius:8 }}>
              {file.type.startsWith('image/') ? '🖼️' : '📄'}
            </div>
            <div className="col" style={{ alignItems:'flex-start', flex:1, overflow:'hidden' }}>
              <span style={{ fontWeight:500, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', width:'100%', textAlign:'left' }}>{file.name}</span>
              <span className="muted" style={{ fontSize:11 }}>{(file.size / 1024).toFixed(1)} KB</span>
            </div>
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
              className="text-xs"
              style={{ background:'var(--bg-light)', border:'1px solid var(--border)', padding:'4px 8px', borderRadius:6, cursor:'pointer' }}
            >
              Remove
            </button>
          </div>
        )}
        <input
          className="drop-input"
          type="file"
          accept="application/pdf,.doc,.docx,image/*"
          onChange={e=>setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      {error && <div className="error">{error}</div>}
      <button className="btn brand submit-wide" disabled={loading} type="submit">Submit Complaint</button>
    </form>
  )
}
