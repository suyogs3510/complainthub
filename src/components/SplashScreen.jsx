import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';

export default function SplashScreen({ onComplete }) {
  useEffect(() => {
    // Keep splash screen visible for 2.5 seconds
    const timer = setTimeout(() => {
      onComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#0f172a', // Dark professional background
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999, // On top of everything
        color: 'white'
      }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          duration: 0.8, 
          ease: [0.16, 1, 0.3, 1], // Custom spring-like easing
          delay: 0.2 
        }}
        style={{
          width: '100px',
          height: '100px',
          background: 'linear-gradient(135deg, #4f46e5, #818cf8)',
          borderRadius: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '24px',
          boxShadow: '0 20px 40px rgba(79, 70, 229, 0.4)'
        }}
      >
        <ShieldCheck size={54} color="white" strokeWidth={2.5} />
      </motion.div>
      
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.5 }}
        style={{
          fontSize: '1.75rem',
          fontWeight: '800',
          letterSpacing: '0.5px',
          margin: 0,
          fontFamily: 'var(--font-display)'
        }}
      >
        Complaint<span style={{ color: '#818cf8' }}>Hub</span>
      </motion.h1>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        style={{ 
          color: '#94a3b8', 
          marginTop: '8px', 
          fontSize: '1rem',
          fontWeight: '500'
        }}
      >
        Management System
      </motion.p>
      
      {/* Loading spinner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 1.2 }}
        style={{
          position: 'absolute',
          bottom: '50px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          style={{
            width: '24px',
            height: '24px',
            border: '3px solid rgba(129, 140, 248, 0.3)',
            borderTopColor: '#818cf8',
            borderRadius: '50%'
          }}
        />
        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Loading...</span>
      </motion.div>
    </motion.div>
  );
}