import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../AuthContext'
import { motion } from 'framer-motion'
import { PhoneCall, MapPin, AlertTriangle, FileImage, FileText, Camera, X, Printer, Star, User, Clock, MessageSquare } from 'lucide-react'
import heic2any from 'heic2any'

export default function ComplaintDetails() {
  const { id } = useParams()
  const { isAdmin, user } = useAuth()
  const [item, setItem] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [isImage, setIsImage] = useState(true)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [convertedImageUrl, setConvertedImageUrl] = useState(null)
  const [converting, setConverting] = useState(false)
  const [adminFile, setAdminFile] = useState(null)
  const [adminFilePreview, setAdminFilePreview] = useState(null)
  const [uploadingAdminFile, setUploadingAdminFile] = useState(false)
  const [timeline, setTimeline] = useState([])
  const [admins, setAdmins] = useState([])
  const [assignedTo, setAssignedTo] = useState(null)
  const [rating, setRating] = useState(0)
  const [feedback, setFeedback] = useState('')
  const [submittingRating, setSubmittingRating] = useState(false)

  async function refreshTimeline() {
    try {
      const { data: timelineData } = await supabase
        .from('complaint_timeline')
        .select('*')
        .eq('complaint_id', id)
        .order('created_at', { ascending: true })
      let finalTimeline = []
      if (timelineData && timelineData.length > 0) {
        const tmUserIds = [...new Set(timelineData.map(t => t.user_id).filter(Boolean))]
        let tmProfiles = {}
        if (tmUserIds.length > 0) {
          const { data: tmPData } = await supabase.from('profiles').select('id, name').in('id', tmUserIds)
          if (tmPData) tmPData.forEach(p => { tmProfiles[p.id] = p })
        }
        finalTimeline = timelineData.map(t => ({ ...t, profiles: tmProfiles[t.user_id] || null }))
      }
      setTimeline(finalTimeline)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    async function fetchData() {
      setError('')
      setLoading(true)
      try {
        // Fetch complaint WITHOUT join (avoids multiple relationship error)
        const { data: complaintData, error: complaintErr } = await supabase
          .from('complaints')
          .select('*')
          .eq('id', id)
          .single()
        if (complaintErr) throw complaintErr

        // Manually attach profile for user_id
        let finalComplaint = complaintData
        if (complaintData.user_id) {
          const { data: pData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', complaintData.user_id)
            .maybeSingle()
          if (pData) finalComplaint = { ...complaintData, profiles: pData }
        }

        setItem(finalComplaint)
        setReply(finalComplaint.admin_remark || '')
        setRating(finalComplaint.rating || 0)
        setFeedback(finalComplaint.feedback || '')
        setAssignedTo(finalComplaint.assigned_to)

        // Fetch timeline WITHOUT join
        const { data: timelineData, error: timelineErr } = await supabase
          .from('complaint_timeline')
          .select('*')
          .eq('complaint_id', id)
          .order('created_at', { ascending: true })

        // Manually attach profiles to timeline entries
        let finalTimeline = []
        if (!timelineErr && timelineData) {
          const tmUserIds = [...new Set(timelineData.map(t => t.user_id).filter(Boolean))]
          let tmProfiles = {}
          if (tmUserIds.length > 0) {
            const { data: tmPData } = await supabase.from('profiles').select('id, name').in('id', tmUserIds)
            if (tmPData) tmPData.forEach(p => { tmProfiles[p.id] = p })
          }
          finalTimeline = timelineData.map(t => ({ ...t, profiles: tmProfiles[t.user_id] || null }))
        }
        setTimeline(finalTimeline)

        // Fetch admins for assignment dropdown
        if (isAdmin) {
          const { data: adminsData, error: adminsErr } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('role', 'admin')
          if (!adminsErr) setAdmins(adminsData)
        }

        setImageLoadError(false)
        setConvertedImageUrl(null)
        setConverting(false)
        
        if (finalComplaint.image_url) {
          const url = finalComplaint.image_url.toLowerCase()
          const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.heic', '.heif']
          const isImageFile = imageExtensions.some(ext => url.endsWith(ext))
          setIsImage(isImageFile)
          
          if (url.endsWith('.heic') || url.endsWith('.heif')) {
            convertHeicToImage(finalComplaint.image_url)
          }
        }
      } catch (err) {
        setError(err.message)
      }
      setLoading(false)
    }
    fetchData()
  }, [id, isAdmin])

  async function convertHeicToImage(url) {
    try {
      setConverting(true)
      const response = await fetch(url)
      const blob = await response.blob()
      const convertedBlob = await heic2any({
        blob: blob,
        toType: 'image/jpeg',
        quality: 0.8
      })
      const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob
      const imageUrl = URL.createObjectURL(finalBlob)
      setConvertedImageUrl(imageUrl)
    } catch (err) {
      console.error('Error converting HEIC:', err)
      setImageLoadError(true)
    } finally {
      setConverting(false)
    }
  }

  async function handleReply() {
    setSending(true)
    setUploadingAdminFile(true)
    try {
      let admin_image_url = item.admin_image_url || null
      if (adminFile) {
        const uuid = typeof crypto.randomUUID === 'function' 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2, 15) + Date.now().toString(36)
        const path = `admin-attachments/${uuid}-${adminFile.name}`
        
        const { error: uploadErr } = await supabase.storage.from('complaints').upload(path, adminFile)
        if (uploadErr) {
          throw new Error(`Upload failed: ${uploadErr.message}`)
        }
        
        const { data } = supabase.storage.from('complaints').getPublicUrl(path)
        admin_image_url = data.publicUrl
      }
      
      const { error: err } = await supabase.from('complaints').update({ 
        admin_remark: reply, 
        admin_image_url: admin_image_url 
      }).eq('id', id)
      
      if (err) {
        setError(err.message)
      } else {
        setItem(prev => ({ ...prev, admin_remark: reply, admin_image_url }))
        setAdminFile(null)
        setAdminFilePreview(null)
        await supabase.from('complaint_timeline').insert({
          complaint_id: id,
          user_id: user.id,
          action: 'reply_added',
          details: 'Admin added a reply'
        })
        await refreshTimeline()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
      setUploadingAdminFile(false)
    }
  }
  
  const handleAdminFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      setAdminFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAdminFilePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }
  
  const removeAdminFile = () => {
    setAdminFile(null)
    setAdminFilePreview(null)
  }

  async function handleStatusChange(newStatus) {
    try {
      const oldStatus = item.status
      const { error } = await supabase
        .from('complaints')
        .update({ status: newStatus })
        .eq('id', id)
      if (!error) {
        setItem(prev => ({ ...prev, status: newStatus }))
        // Add to timeline
        await supabase.from('complaint_timeline').insert({
          complaint_id: id,
          user_id: user.id,
          action: 'status_changed',
          details: `Status changed from ${oldStatus} to ${newStatus}`,
          old_value: oldStatus,
          new_value: newStatus
        })
        // Re-fetch timeline to get the update
        await refreshTimeline()
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleAssign() {
    try {
      const oldAssigned = item.assigned_to
      const { error } = await supabase.from('complaints').update({ assigned_to: assignedTo }).eq('id', id)
      if (!error) {
        setItem(prev => ({ ...prev, assigned_to: assignedTo }))
        await supabase.from('complaint_timeline').insert({
          complaint_id: id,
          user_id: user.id,
          action: 'assigned',
          details: `Complaint ${assignedTo ? `assigned to ${admins.find(a => a.id === assignedTo)?.name || 'admin'}` : 'unassigned'}`,
          old_value: oldAssigned ? admins.find(a => a.id === oldAssigned)?.name : null,
          new_value: assignedTo ? admins.find(a => a.id === assignedTo)?.name : null
        })
        await refreshTimeline()
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function handleRating() {
    setSubmittingRating(true)
    try {
      const { error } = await supabase.from('complaints').update({ rating, feedback }).eq('id', id)
      if (!error) {
        setItem(prev => ({ ...prev, rating, feedback }))
        await supabase.from('complaint_timeline').insert({
          complaint_id: id,
          user_id: user.id,
          action: 'rating_added',
          details: `User rated ${rating} stars${feedback ? ` with feedback: ${feedback}` : ''}`
        })
        await refreshTimeline()
      }
    } catch (e) {
      console.error(e)
    } finally {
      setSubmittingRating(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="container">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">Loading...</motion.div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card error">{error}</motion.div>
      </div>
    )
  }
  
  if (!item) {
    return (
      <div className="container">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">Not found</motion.div>
      </div>
    )
  }

  const isEmergency = item.category === 'Ragging'
  let displayDescription = item.description || ''
  let locationLink = null
  const locationMatch = displayDescription.match(/\n\n📍 (?:Emergency )?Location: (https:\/\/maps\.google\.com\/\?q=[0-9.,-]+)/)
  if (locationMatch) {
    locationLink = locationMatch[1]
    displayDescription = displayDescription.replace(locationMatch[0], '')
  }
  const displayImageUrl = convertedImageUrl || item.image_url

  return (
    <div className="container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card col" style={{ gap: 16, maxWidth: 800, margin: '0 auto' }} id="printable-area">
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <Link to={isAdmin ? "/admin" : "/dashboard"} className="btn secondary no-print">← Back</Link>
            <h2>Complaint Details</h2>
          </div>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <button type="button" onClick={handlePrint} className="btn secondary no-print" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Printer size={16} /> Print
            </button>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.status === 'Pending' ? '#ef4444' : item.status === 'In Progress' ? '#f59e0b' : '#10b981', boxShadow: `0 0 8px ${item.status === 'Pending' ? '#ef4444' : item.status === 'In Progress' ? '#f59e0b' : '#10b981'}` }} />
            <span className={`badge status ${item.status === 'Pending' ? 'pending' : item.status === 'In Progress' ? 'progress' : 'resolved'}`}>{item.status}</span>
          </div>
        </motion.div>
        


        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="col" style={{ gap: 8, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)', width: '100%' }}>
            <div className="row" style={{ gap: 16, alignItems: 'center' }}>
              {item.profiles?.avatar_url ? (
                <img src={item.profiles.avatar_url} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} alt="Student" />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                  {(item.profiles?.name || '?').charAt(0)}
                </div>
              )}
              <div className="col">
                <strong>{item.profiles?.name || 'Unknown Student'}</strong>
                <span className="muted">{item.profiles?.department || 'Department N/A'} • {item.profiles?.student_id || 'ID N/A'}</span>
              </div>
            </div>
          </motion.div>

          <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <span className="muted">ID: CMP{String(item.id).slice(-3).padStart(3, '0')}</span>
            <span className="muted">{new Date(item.created_at).toLocaleString([], { hour12: true })}</span>
          </div>
          <div className="text-xl font-bold">{item.title}</div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="badge">{item.category}</span>
            {isEmergency && (
              <span className="badge" style={{ background: 'var(--danger)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertTriangle size={14} /> High Priority Emergency
              </span>
            )}
          </div>
        </motion.div>

        {isEmergency && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className="card col" style={{ gap: 12, background: 'rgba(var(--danger-rgb), 0.1)', border: '1px solid rgba(var(--danger-rgb), 0.3)' }}>
            <div className="row" style={{ alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
              <AlertTriangle size={20} />
              <strong style={{ fontSize: '1.1rem' }}>Emergency Actions</strong>
            </div>
            <p className="text-sm muted" style={{ margin: 0 }}>This issue has been flagged as high-priority or ragging. Please take immediate action if necessary.</p>
            <div className="row no-print" style={{ gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
              <a href="tel:100" className="btn danger" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PhoneCall size={16} /> Call Police (100)
              </a>
              {locationLink && (
                <a href={locationLink} target="_blank" rel="noreferrer" className="btn brand" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MapPin size={16} /> View Live Location
                </a>
              )}
            </div>
          </motion.div>
        )}

        {!isEmergency && locationLink && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }} className="row no-print" style={{ marginTop: 8 }}>
            <a href={locationLink} target="_blank" rel="noreferrer" className="btn secondary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MapPin size={16} /> View Attached Location
            </a>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} style={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {displayDescription}
        </motion.div>
        
        {item.image_url && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }} className="col" style={{ gap: 8 }}>
            <strong>Attachment</strong>
            
            <div 
              style={{ 
                width: '100%', 
                background: '#1e293b', 
                borderRadius: '12px', 
                border: '1px solid #334155',
                overflow: 'hidden',
                cursor: 'pointer',
                padding: '20px',
                textAlign: 'center'
              }}
              onClick={() => window.open(item.image_url, '_blank', 'noopener,noreferrer')}
            >
              {converting ? (
                <div style={{ color: '#94a3b8', fontSize: '16px' }}>Converting image...</div>
              ) : (convertedImageUrl || (isImage && !imageLoadError)) ? (
                <div>
                  <img 
                    src={displayImageUrl} 
                    alt="Complaint attachment" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: '500px', 
                      objectFit: 'contain',
                      borderRadius: '8px'
                    }}
                    onError={() => {
                      console.error('Image load error')
                      setImageLoadError(true)
                    }}
                  />
                  <p style={{ color: '#94a3b8', marginTop: '10px', fontSize: '14px' }}>Click to open in new tab</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '80px', 
                      height: '80px', 
                      background: 'rgba(96, 165, 250, 0.1)', 
                      borderRadius: '16px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center' 
                    }}>
                      {isImage ? (
                        <FileImage size={40} color="#60a5fa" />
                      ) : (
                        <FileText size={40} color="#60a5fa" />
                      )}
                    </div>
                    <div>
                      <p style={{ color: 'white', fontSize: '16px', fontWeight: '500', margin: '0' }}>
                        {isImage ? 'Image Attachment' : 'File Attachment'}
                      </p>
                      <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px', margin: '0' }}>
                        Click to view file in new tab
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(item.admin_remark || isAdmin || item.admin_image_url) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} style={{ marginTop: 16, padding: '16px', background: 'var(--bg)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <span className="icon">💬</span>
              <strong>Admin Reply</strong>
            </div>
            
            {isAdmin ? (
              <div className="col" style={{ gap: 12 }}>
                <textarea className="input" rows={4} placeholder="Write a reply to the student..." value={reply} onChange={e => setReply(e.target.value)} style={{ background: 'var(--card)', color: 'var(--text)' }} />
                
                {!adminFile && !item.admin_image_url ? (
                  <div className="upload-dropzone no-print" style={{ padding: '20px' }} onClick={() => document.getElementById('admin-file-input').click()}>
                    <input 
                      type="file"
                      id="admin-file-input"
                      accept="image/*"
                      capture="environment"
                      onChange={handleAdminFileSelect}
                      style={{ display: 'none' }}
                    />
                    <div className="col" style={{ alignItems: 'center', gap: '4px' }}>
                      <Camera size={32} style={{ color: 'var(--accent)' }} />
                      <span className="muted">Click to add photo or take photo with camera</span>
                    </div>
                  </div>
                ) : (
                  <div className="col" style={{ gap: '8px' }}>
                    {(adminFilePreview || item.admin_image_url) && (
                      <div style={{ position: 'relative', width: '100%', background: '#1e293b', borderRadius: '12px', border: '1px solid #334155', overflow: 'hidden' }}>
                        <img 
                          src={adminFilePreview || item.admin_image_url} 
                          alt="Admin Attachment"
                          style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', width: '100%' }}
                        />
                        {adminFile && (
                          <button 
                            type="button" 
                            onClick={removeAdminFile}
                            style={{ position: 'absolute', top: 8, right: 8, background: 'var(--danger)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                            className="no-print"
                          >
                            <X size={16} style={{ color: 'white' }} />
                          </button>
                        )}
                      </div>
                    )}
                    {!adminFile && (
                      <button type="button" onClick={() => document.getElementById('admin-file-input').click()} className="btn secondary no-print" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Camera size={16} />
                        Change Photo
                      </button>
                    )}
                  </div>
                )}
                
                <div className="row no-print" style={{ justifyContent: 'flex-end' }}>
                  <button className="btn brand" onClick={handleReply} disabled={sending || uploadingAdminFile}>
                    {sending || uploadingAdminFile ? 'Sending...' : 'Update Reply'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="col" style={{ gap: 12 }}>
                {item.admin_remark && (
                  <div style={{ color: 'var(--text)', lineHeight: 1.5 }}>{item.admin_remark}</div>
                )}
                {item.admin_image_url && (
                  <div 
                    style={{ 
                      width: '100%', 
                      background: '#1e293b', 
                      borderRadius: '12px', 
                      border: '1px solid #334155',
                      overflow: 'hidden',
                      padding: '20px',
                      textAlign: 'center'
                    }}
                  >
                    <img 
                      src={item.admin_image_url} 
                      alt="Admin Attachment"
                      style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {item.status === 'Resolved' && !item.rating && !isAdmin && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card col no-print" style={{ gap: 12, background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center' }}>
              <Star size={20} style={{ color: '#fbbf24' }} />
              <strong>Rate the Resolution</strong>
            </div>
            <div className="row" style={{ gap: 8 }}>
              {[1,2,3,4,5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    fontSize: '24px',
                    color: star <= rating ? '#fbbf24' : '#4b5563'
                  }}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              className="input"
              rows={3}
              placeholder="Leave feedback (optional)..."
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              style={{ background: 'var(--card)', color: 'var(--text)' }}
            />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn brand" onClick={handleRating} disabled={submittingRating}>
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </motion.div>
        )}

        {item.rating && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
            <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Star size={20} style={{ color: '#fbbf24' }} />
              <strong>Rating:</strong>
              <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>
                {[...Array(item.rating)].map((_,i) => '★').join('')}
              </span>
            </div>
            {item.feedback && <p style={{ margin: 0, color: 'var(--text-muted)' }}>{item.feedback}</p>}
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card" style={{ background: 'var(--bg)', border: '1px solid var(--border)', maxHeight: '400px', overflowY: 'auto' }}>
          <div className="row" style={{ gap: 8, alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <Clock size={20} style={{ color: 'var(--accent)' }} />
            <strong>Complaint Timeline</strong>
          </div>
          
          <div className="col" style={{ gap: 16 }}>
            <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', marginTop: 4 }} />
              <div className="col" style={{ gap: 4, flex: 1 }}>
                <strong>Complaint Created</strong>
                <span className="muted" style={{ fontSize: '12px' }}>{new Date(item.created_at).toLocaleString([], { hour12: true })}</span>
                <span style={{ color: 'var(--text-muted)' }}>Student submitted the complaint</span>
              </div>
            </div>
            
            {timeline.map(entry => (
              <div key={entry.id} className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--accent)', marginTop: 4 }} />
                <div className="col" style={{ gap: 4, flex: 1 }}>
                  <div className="row" style={{ alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <strong>
                      {entry.action === 'status_changed' ? 'Status Updated' : 
                       entry.action === 'reply_added' ? 'Admin Replied' : 
                       entry.action === 'assigned' ? 'Complaint Assigned' : 
                       entry.action === 'rating_added' ? 'Feedback Submitted' : 'Updated'}
                    </strong>
                    {entry.profiles?.name && (
                      <span className="muted" style={{ fontSize: '13px' }}>by {entry.profiles.name}</span>
                    )}
                  </div>
                  <span className="muted" style={{ fontSize: '12px' }}>{new Date(entry.created_at).toLocaleString([], { hour12: true })}</span>
                  {entry.details && <span style={{ color: 'var(--text-muted)' }}>{entry.details}</span>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
