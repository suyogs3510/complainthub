import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Smartphone, X } from 'lucide-react';

export default function InstallApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Check if already installed or dismissed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || localStorage.getItem('installPromptDismissed') === 'true') {
      return;
    }

    const handler = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Show the native install prompt
      deferredPrompt.prompt();
      // Wait for the user to respond
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  // Only show the banner if the REAL native prompt is ready
  if (!deferredPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        style={{
          position: 'fixed',
          bottom: '90px',
          left: '16px',
          right: '16px',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
      >
        <div 
          className="card glass row" 
          style={{ 
            padding: '12px 16px', 
            gap: '12px', 
            border: '2px solid var(--accent)', 
            background: 'linear-gradient(135deg, var(--card), var(--bg))',
            boxShadow: '0 10px 40px rgba(var(--accent-rgb), 0.4)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '400px',
            alignItems: 'center',
            pointerEvents: 'auto'
          }}
        >
          <div className="icon-box" style={{ background: 'var(--accent)', color: 'white', padding: '10px', borderRadius: '12px', flexShrink: 0 }}>
            <Smartphone size={20} />
          </div>
          
          <div className="col" style={{ flex: 1, gap: '2px', minWidth: 0 }}>
            <strong style={{ fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Install ComplaintHub
            </strong>
            <span className="text-xs muted" style={{ lineHeight: 1.2 }}>
              Add to Home Screen
            </span>
          </div>
          
          <button 
            className="btn brand" 
            onClick={handleInstallClick}
            style={{ 
              padding: '8px 16px', 
              borderRadius: '99px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              fontSize: '0.9rem',
              flexShrink: 0
            }}
          >
            <Download size={16} />
            Install
          </button>
          
          <button 
            onClick={() => {
              setDeferredPrompt(null);
              localStorage.setItem('installPromptDismissed', 'true');
            }}
            style={{ 
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}