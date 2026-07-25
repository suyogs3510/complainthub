import { useState, useEffect } from 'react'
import { Link, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Landing from './pages/Landing.jsx'
import UserDashboard from './pages/UserDashboard.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import ComplaintDetails from './pages/ComplaintDetails.jsx'
import FAQ from './pages/FAQ.jsx'
import { Sun, Moon, Wifi, WifiOff } from 'lucide-react'
import { hasSupabaseConfig, supabase, checkSupabaseConnection } from './supabaseClient.js'
import Toast from './components/Toast.jsx'
import ChatBot from './components/ChatBot.jsx'
import InstallApp from './components/InstallApp.jsx'
import SplashScreen from './components/SplashScreen.jsx'
import { socket } from './socket'

function Protected({ children, admin = false }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) return <div className="container"><div className="card">Loading...</div></div>
  if (!user) return <Navigate to={admin ? "/admin/login" : "/login"} replace />
  if (admin && !isAdmin) return <Navigate to="/admin/login" replace />
  return children
}

const ShieldCheck = ({ className }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

function Nav({ theme, toggleTheme, dbStatus, socketStatus }) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()
  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header className="sticky top-0 z-50 glass border-b">
      <div className="nav-container">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-primary-foreground" />
            </div>
            <Link to="/" className="font-display text-xl font-bold text-foreground">ComplaintHub</Link>
          </div>



          <div className="hidden md:flex items-center gap-6 absolute-center">
            <Link to="/" className="nav-item text-muted-foreground hover:text-foreground transition-colors font-medium">Home</Link>
            <Link to="/faq" className="nav-item text-muted-foreground hover:text-foreground transition-colors font-medium">FAQ</Link>
            {!user && (
              <>
                <a href="#features" className="nav-item text-muted-foreground hover:text-foreground transition-colors font-medium">Features</a>
                <a href="#about" className="nav-item text-muted-foreground hover:text-foreground transition-colors font-medium">About</a>
              </>
            )}
            {user && (
              <>
                <Link to={isAdmin ? '/admin' : '/dashboard'} className="nav-item text-muted-foreground hover:text-foreground transition-colors font-medium">
                  {isAdmin ? 'Admin Dashboard' : 'My Complaints'}
                </Link>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="theme-toggle-modern"
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={theme}
                  initial={{ y: -20, opacity: 0, rotate: -90 }}
                  animate={{ y: 0, opacity: 1, rotate: 0 }}
                  exit={{ y: 20, opacity: 0, rotate: 90 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center"
                >
                  {theme === 'dark' ? (
                    <Sun size={20} className="text-yellow-400" fill="currentColor" />
                  ) : (
                    <Moon size={20} className="text-indigo-400" fill="currentColor" />
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="theme-toggle-glow"></div>
            </motion.button>
            {user ? (
              <>
                <span className="text-muted-foreground hidden md:block">{user.email}</span>
                <button 
                  onClick={handleLogout}
                  className="variant-ghost hover:opacity-90 transition-opacity"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <button className="variant-ghost hover:opacity-90 transition-opacity font-bold">Login</button>
                </Link>
                <Link to="/register">
                  <button className="btn btn-square brand gradient-primary border-0 hover:opacity-90 transition-opacity">Register</button>
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

const MapPin = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 1 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
)
const Phone = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.86 19.86 0 0 1-8.63-3.11 19.5 19.5 0 0 1-6-6 19.86 19.86 0 0 1-3.11-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.2 1.43.71 2.79 1.49 4.02a2 2 0 0 1-.45 2.59l-1.27 1.27a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.59-.45 12.3 12.3 0 0 0 4.02 1.49A2 2 0 0 1 22 16.92z"/></svg>
)
const Mail = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="m22 6-10 7L2 6"/></svg>
)

export default function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')
  const [toast, setToast] = useState(null)
  const [dbStatus, setDbStatus] = useState('checking') // checking, ok, error
  const [socketStatus, setSocketStatus] = useState('disconnected')
  const [showSplash, setShowSplash] = useState(() => {
    return !sessionStorage.getItem('splashShown')
  })
  const location = useLocation()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    const checkConnections = async () => {
      const db = await checkSupabaseConnection()
      setDbStatus(db.ok ? 'ok' : 'error')
      if (!db.ok) {
        console.error('Database connection failed:', db.message)
      }
    }
    
    checkConnections()
    
    if (socket) {
      setSocketStatus(socket.connected ? 'connected' : 'disconnected')
      socket.on('connect', () => setSocketStatus('connected'))
      socket.on('disconnect', () => setSocketStatus('disconnected'))
    }

    // Global listener for custom notifications
    const handleNotify = (e) => {
      setToast({ message: e.detail.message, type: e.detail.type || 'info' })
    }
    window.addEventListener('app-notify', handleNotify)
    return () => window.removeEventListener('app-notify', handleNotify)
  }, [])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const hideFooter = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/complaint') || location.pathname.startsWith('/admin') || location.pathname === '/login' || location.pathname === '/register'
  return (
    <AuthProvider>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={() => {
          setShowSplash(false)
          sessionStorage.setItem('splashShown', 'true')
        }} />}
      </AnimatePresence>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Nav theme={theme} toggleTheme={toggleTheme} dbStatus={dbStatus} socketStatus={socketStatus} />
        {!hasSupabaseConfig && (
          <div className="container">
            <div className="card">
              <div className="error">Supabase environment not configured. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.</div>
            </div>
          </div>
        )}
        <main>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <Routes location={location} key={location.pathname}>
                <Route path="/" element={<Landing />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/login" element={<Login mode="student" />} />
                <Route path="/admin/login" element={<Login mode="admin" />} />
                <Route path="/register" element={<Register />} />
                <Route path="/dashboard" element={<Protected><UserDashboard /></Protected>} />
                <Route path="/complaint/:id" element={<Protected><ComplaintDetails /></Protected>} />
                <Route path="/admin" element={<Protected admin><AdminDashboard /></Protected>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </motion.div>
          </AnimatePresence>
        </main>
      {!hideFooter && (
        <footer className="bg-footer text-primary-foreground py-12 footer-gradient">
          <div className="hero-container px-4">
            <div className="grid md:grid-cols-2 gap-12 mb-8">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className="font-display text-xl font-bold">ComplaintHub</span>
                </div>
                <p className="text-primary-foreground/70">
                  Empowering students to voice their concerns and drive positive change.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-semibold mb-4">Quick Links</h3>
                  <ul className="space-y-2 text-primary-foreground/70">
                    <li><a href="#home" className="hover:text-primary-foreground transition-colors">Home</a></li>
                    <li><Link to="/faq" className="hover:text-primary-foreground transition-colors">FAQ</Link></li>
                    <li><a href="#features" className="hover:text-primary-foreground transition-colors">Features</a></li>
                    <li><a href="#about" className="hover:text-primary-foreground transition-colors">About</a></li>
                    <li><Link to="/login" className="hover:text-primary-foreground transition-colors">Login</Link></li>
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-4">Contact Information</h3>
                  <ul className="space-y-3 text-primary-foreground/70">
                    <li className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 footer-icon" />
                      Sterling Institute of Management System, Nerul
                    </li>
                    <li className="flex items-center gap-2">
                      <Phone className="w-4 h-4 footer-icon" />
                      +91-9004971944
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="w-4 h-4 footer-icon" />
                      admin@gmail.com
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="border-t border-primary-foreground/20 pt-8 text-center text-primary-foreground/60">
              <p>© {new Date().getFullYear()} ComplaintHub - Student Complaint Management System. All rights reserved.</p>
            </div>
          </div>
        </footer>
      )}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
      {!location.pathname.startsWith('/admin') && <ChatBot />}
      <InstallApp />
      </div>
    </AuthProvider>
  )
}
