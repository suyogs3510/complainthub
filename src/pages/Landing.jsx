import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { motion } from 'framer-motion'
import { Sparkles, BrainCircuit, Zap, ShieldCheck, HeartHandshake, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../AuthContext'

export default function Landing() {
  const { user, isAdmin } = useAuth()
  const [resolvedCount, setResolvedCount] = useState('5,000+')

  useEffect(() => {
    const fetchStats = async () => {
      if (!supabase) return
      
      try {
        // Try fetching via RPC first (bypass RLS)
        const { data, error } = await supabase.rpc('complaint_stats')
        
        if (error) throw error

        if (data && data.length > 0) {
          const resolved = data[0].resolved
          if (resolved > 0) {
            setResolvedCount(resolved.toLocaleString() + '+')
          }
        }
      } catch (err) {
        console.warn('RPC fetch failed, trying direct select...', err.message)
        
        // Fallback to direct select (might fail if RLS blocks anon)
        try {
          const { count, error } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Resolved')
  
          if (!error && count !== null && count > 0) {
            setResolvedCount(count.toLocaleString() + '+')
          }
        } catch (e) {
          console.warn('Direct fetch failed:', e.message)
        }
      }
    }

    fetchStats()
  }, [])

  // Icon Components
  const Shield = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  )
  const ShieldCheck = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
  )
  const ArrowRight = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  )
  const Users = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  )
  const ChevronRight = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>
  )
  const FileText = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
  )
  const Search = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
  )
  const Clock = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  )
  const CheckCircle = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
  )
  
  const ListItem = ({ text }) => (
    <li className="flex items-center gap-3">
      <CheckCircle className="w-5 h-5 success flex-shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </li>
  )

  const FeatureCard = ({ icon, title, description, delay }) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`feature-card-modern`}
    >
      <div className="feature-card-border" />
      <div className="feature-icon-modern">
        {icon}
      </div>
      <h3 className="font-bold text-lg mb-3">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </motion.div>
  )

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  }

  return (
    <div className="min-h-screen">
       {/* Hero Section */} 
       <section id="home" className="hero-gradient hero-fit relative overflow-hidden"> 
         {/* Decorative elements - Floating Blobs */} 
         <motion.div 
           animate={{ 
             scale: [1, 1.2, 1],
             x: [0, 30, 0],
             y: [0, -30, 0],
           }}
           transition={{ 
             duration: 10, 
             repeat: Infinity,
             ease: "easeInOut"
           }}
           className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" 
         /> 
         <motion.div 
           animate={{ 
             scale: [1, 1.3, 1],
             x: [0, -40, 0],
             y: [0, 40, 0],
           }}
           transition={{ 
             duration: 12, 
             repeat: Infinity,
             ease: "easeInOut",
             delay: 1
           }}
           className="absolute bottom-10 left-10 w-96 h-96 bg-secondary/10 rounded-full blur-3xl" 
         /> 

         <div className="hero-container px-2 relative z-10"> 
           <motion.div 
             variants={containerVariants}
             initial="hidden"
             animate="visible"
             className="max-w-4xl mx-auto text-center"
           > 
            <motion.div 
              variants={itemVariants}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/50 backdrop-blur-md border border-border/60 text-primary mb-6" 
              style={{ background: 'var(--accent-light)', borderColor: 'var(--border)' }}
            > 
               <Shield className="w-4 h-4" /> 
               <span className="text-sm font-medium">Secure & Transparent Platform</span> 
             </motion.div> 
             
             <motion.h1 
               variants={itemVariants}
               className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6"
             > 
               Student Complaint 
               <span className="text-gradient block mt-2">Management System</span> 
             </motion.h1> 
             
             <motion.p 
               variants={itemVariants}
               className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
             > 
               A smart platform to submit, track, and resolve student complaints efficiently. 
               Your voice matters – we ensure it's heard. 
             </motion.p> 
 
            <motion.div 
              variants={itemVariants}
              className="login-cards-container"
            > 
              {user ? (
                <Link to={isAdmin ? "/admin" : "/dashboard"} className="login-card-modern w-full" style={{ gridColumn: 'span 2' }}> 
                    <div className="card-icon-wrapper student-card-icon">
                      <LayoutDashboard size={32} /> 
                    </div>
                    <div className="card-content">
                      <span className="card-title">Go to Dashboard</span>
                      <p className="card-description">Welcome back! Manage your complaints and track status updates.</p>
                    </div>
                    <ArrowRight className="card-arrow" size={24} /> 
                 </Link> 
              ) : (
                <>
                  <Link to="/login" className="login-card-landing"> 
                    <div className="card-icon-wrapper student-card-icon">
                      <ShieldCheck size={32} /> 
                    </div>
                    <div className="card-content">
                      <span className="card-title">Student Login</span>
                      <p className="card-description">Submit and track your complaints with ease.</p>
                    </div>
                    <ArrowRight className="card-arrow" size={24} /> 
                  </Link>
                  <Link to="/admin/login" className="login-card-landing admin"> 
                    <div className="card-icon-wrapper admin-card-icon">
                      <Users size={32} /> 
                    </div>
                    <div className="card-content">
                      <span className="card-title">Admin Login</span>
                      <p className="card-description">Manage student complaints and campus insights.</p>
                    </div>
                    <ArrowRight className="card-arrow" size={24} /> 
                  </Link>
                </>
              )}
             </motion.div> 
          </motion.div> 
        </div> 
      </section> 

      {/* Floating Shapes Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: -1 }}>
        <motion.div 
          animate={{ 
            y: [0, -20, 0],
            rotate: [0, 10, 0]
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="bg-shape shape-1"
        />
        <motion.div 
          animate={{ 
            y: [0, 20, 0],
            rotate: [0, -10, 0]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="bg-shape shape-2"
        />
      </div> 
 
       {/* Features Section */} 
      <section id="features" className="py-20 lg:py-28 relative overflow-hidden"> 
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2" />
        <div className="landing-container px-4 relative z-10"> 
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-24"
          > 
            <motion.span 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              className="px-4 py-1.5 rounded-full bg-accent-light text-accent text-sm font-bold uppercase tracking-wider mb-4 inline-block"
            >
              Our Core Features
            </motion.span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4"> 
              Why Choose Our System? 
            </h2> 
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto"> 
              Streamlined complaint handling with modern features designed for efficiency 
            </p> 
          </motion.div> 

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10"> 
            <FeatureCard 
              icon={<FileText className="w-6 h-6" />} 
              title="Easy Submission" 
              description="Submit complaints with just a few clicks. Attach files and set priorities effortlessly." 
            /> 
            <FeatureCard 
              icon={<Search className="w-6 h-6" />} 
              title="Complaint Tracking" 
              description="Track your complaint status in real-time from submission to resolution." 
            /> 
            <FeatureCard 
              icon={<Clock className="w-6 h-6" />} 
              title="Faster Resolution" 
              description="Streamlined workflow ensures quick response and efficient complaint handling." 
            /> 
            <FeatureCard 
              icon={<Shield className="w-6 h-6" />} 
              title="Secure & Transparent" 
              description="Your data is protected with enterprise-grade security and full transparency." 
            /> 
          </div> 
        </div> 
      </section>

      {/* Stats Section - NEW & COOL */}
      <section className="py-16 bg-card/30 backdrop-blur-sm border-y border-border/50">
        <div className="landing-container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {[
              { label: 'Active Students', value: '12,000+', icon: '🎓' },
              { label: 'Total Complaints', value: '45,000+', icon: '📝' },
              { label: 'Resolved Issues', value: resolvedCount, icon: '✅' },
              { label: 'Satisfaction Rate', value: '98%', icon: '⭐' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl mb-2">{stat.icon}</div>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium uppercase tracking-wide">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

       {/* AI Powered Section */}
       <section className="py-20 bg-[var(--bg)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-20" />
        <div className="landing-container px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -top-10 -left-10 w-40 h-40 bg-[var(--accent)]/5 rounded-full blur-3xl" />
              <div className="relative z-10 p-8 rounded-3xl bg-[var(--card)] border border-[var(--border)] shadow-2xl shadow-[var(--accent)]/5">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-12 h-12 rounded-2xl bg-[var(--accent)] flex items-center justify-center text-white shadow-lg shadow-[var(--accent)]/20">
                     <BrainCircuit size={24} />
                   </div>
                   <h3 className="text-2xl font-bold">Smart Assistant</h3>
                 </div>
                 <div className="space-y-6">
                   <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex gap-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                     <div className="w-8 h-8 rounded-full bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
                       <Zap size={16} />
                     </div>
                     <div>
                       <h4 className="font-semibold mb-1">Auto-Categorization</h4>
                       <p className="text-sm text-muted-foreground">Our AI automatically detects the category of your complaint as you type.</p>
                     </div>
                   </div>
                   <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--border)] flex gap-4" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
                     <div className="w-8 h-8 rounded-full bg-[var(--success)]/10 flex items-center justify-center text-[var(--success)] flex-shrink-0">
                       <Sparkles size={16} />
                     </div>
                     <div>
                       <h4 className="font-semibold mb-1">Sentiment Analysis</h4>
                       <p className="text-sm text-muted-foreground">Admins can see the emotional tone of complaints to prioritize effectively.</p>
                     </div>
                   </div>
                 </div>
               </div>
             </motion.div>
             <div className="space-y-8">
               <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent-light)] text-[var(--accent)] text-sm font-medium"
              >
                <Sparkles size={14} />
                <span>Next Generation Support</span>
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                Smarter Support for a <span className="text-[var(--accent)]">Better Campus</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                We've integrated artificial intelligence to help both students and administrators. 
                Get faster resolutions and smarter insights with our AI-powered features.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <span className="text-3xl font-bold text-[var(--accent)]">40%</span>
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Faster Routing</span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-3xl font-bold text-[var(--accent)]">AI</span>
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Driven Insights</span>
                </div>
              </div>
             </div>
           </div>
         </div>
       </section>

      {/* About Section */}
      <section id="about" className="about-fit py-20">
        <div className="landing-container px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-6">
                Empowering Students,
                <span className="text-gradient block">Enabling Change</span>
              </h2>
              <p className="text-muted-foreground text-lg mb-6">
                Our Student Complaint Management System bridges the gap between students and administration.
                We believe every concern deserves attention and every student deserves to be heard.
              </p>
              <ul className="space-y-4">
                <ListItem text="Transparent complaint handling process" />
                <ListItem text="Direct communication with administrators" />
                <ListItem text="Regular updates on complaint status" />
                <ListItem text="Secure and confidential submissions" />
              </ul>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="relative"
            >
              <div className="absolute inset-0 gradient-primary rounded-2xl opacity-10 blur-3xl animate-float" />
              <div className="relative card rounded-2xl p-8 border border-[var(--border)] bg-[var(--card)]/60 backdrop-blur-xl shadow-xl" style={{ background: 'var(--card)', opacity: 0.8 }}>
                <div className="grid grid-cols-2 gap-8">
                  <div className="about-tile text-center p-6 rounded-xl bg-[var(--bg)]/50 hover:bg-[var(--card)] transition-colors" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="text-4xl font-bold text-primary mb-2">24/7</div>
                    <div className="text-sm text-muted-foreground">Support Available</div>
                  </div>
                  <div className="about-tile text-center p-6 rounded-xl bg-[var(--bg)]/50 hover:bg-[var(--card)] transition-colors" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                     <div className="text-4xl font-bold text-accent-2 mb-2">{resolvedCount}</div>
                     <div className="text-sm text-muted-foreground">Complaints Resolved</div>
                  </div>
                  <div className="about-tile text-center p-6 rounded-xl bg-[var(--bg)]/50 hover:bg-[var(--card)] transition-colors" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="text-4xl font-bold text-accent-3 mb-2">100%</div>
                    <div className="text-sm text-muted-foreground">Transparent</div>
                  </div>
                  <div className="about-tile text-center p-6 rounded-xl bg-[var(--bg)]/50 hover:bg-[var(--card)] transition-colors" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                    <div className="text-4xl font-bold text-[var(--success)] mb-2">Fast</div>
                    <div className="text-sm text-muted-foreground">Response Time</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  )
}
