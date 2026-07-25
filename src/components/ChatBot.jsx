import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAiResponse } from '../utils/ai';
import { useAuth } from '../AuthContext';
import { MessageSquare, X, Send, Sparkles, User, Bot, Mic, Volume2, VolumeX, Terminal, Zap, Brain, ShieldCheck, Star } from 'lucide-react';

const ChatBot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chat_history_student');
    return saved ? JSON.parse(saved) : [
      { id: 1, text: "Hi there! I'm your AI Assistant. How can I help you today?", sender: 'bot' }
    ];
  });
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechEnabled, setIsSpeechEnabled] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('chat_history_student', JSON.stringify(messages));
  }, [messages]);

  // Quick suggestions
  const suggestions = [
    { label: 'Check Status', icon: <Zap size={14} />, query: 'how to check status' },
    { label: 'Submit New', icon: <Send size={14} />, query: 'how to submit complaint' },
    { label: 'Change Photo', icon: <User size={14} />, query: 'how to change profile pic' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Text to Speech
  const speak = (text) => {
    if (!isSpeechEnabled || !window.speechSynthesis) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean text of markdown/special characters for better speech
    const cleanText = text
      .replace(/[#*`]/g, '')
      .replace(/\n/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Try to find a nice English voice
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && v.name.includes('Google')) || voices.find(v => v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
    
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      // Logic for after speech ends if needed
    };

    window.speechSynthesis.speak(utterance);
  };

  // Speech to Text
  const recognitionRef = useRef(null);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const msg = `Browser Security Alert: Microphone/Speech features are blocked on non-secure (HTTP) sites when using IP addresses.`;
      
      window.dispatchEvent(new CustomEvent('app-notify', { 
        detail: { 
          message: msg, 
          type: 'error' 
        } 
      }));
      // We don't return here because some browsers/flags might still allow it, 
      // but we've warned the user why it's likely failing.
    }

    if (!navigator.onLine) {
      window.dispatchEvent(new CustomEvent('app-notify', { 
        detail: { 
          message: "Speech recognition requires an internet connection.", 
          type: 'error' 
        } 
      }));
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        // Automatically enable voice response when using mic
        if (!isSpeechEnabled) {
          setIsSpeechEnabled(true);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        let errorMsg = "Speech recognition error occurred.";
        if (event.error === 'not-allowed') {
          const isIP = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.protocol !== 'https:';
          errorMsg = isIP 
            ? "Microphone access blocked because you're using an IP address (192.168...). Use 'localhost' or HTTPS to fix this."
            : "Microphone access denied. Please check your browser's site permissions.";
        } else if (event.error === 'network') {
          errorMsg = "Network error. Speech recognition requires an internet connection (Google's service).";
        } else if (event.error === 'no-speech') {
          errorMsg = "No speech was detected. Please try again.";
        } else if (event.error === 'aborted') {
          return; // Ignore aborted
        }

        window.dispatchEvent(new CustomEvent('app-notify', { 
          detail: { 
            message: errorMsg, 
            type: 'error' 
          } 
        }));
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputValue(transcript);
          // Wait a tiny bit before sending so user sees the text
          setTimeout(() => {
            handleSend(null, transcript);
          }, 500);
        }
      };

      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      setIsListening(false);
    }
  };

  const handleSend = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const messageText = textOverride || inputValue;
    if (!messageText.trim()) return;

    const userMessage = { id: Date.now(), text: messageText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const responseText = getAiResponse(messageText, { 
        role: user?.role || 'student',
        userName: user?.name,
        items: [] // In student view we don't have all items yet, but we could pass user-specific ones if needed
      });
      
      // Split response into sections if it contains markdown headers for a "Pro" look
      const botMessage = { id: Date.now() + 1, text: responseText, sender: 'bot' };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      speak(responseText);
    }, 1000);
  };

  return (
    <div className="ai-chat-floating">
      {/* Chat Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="ai-chat-toggle"
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
        {isOpen ? <X size={28} /> : <MessageSquare size={28} />}
        {!isOpen && (
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
              background: '#4ade80',
              borderRadius: '50%',
              border: '3px solid var(--bg)'
            }}
          />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
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
            {/* Header */}
            <div className="ai-chat-header" style={{
              padding: '20px',
              background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div className="row" style={{ alignItems: 'center', gap: '12px' }}>
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
                    <strong style={{ fontSize: '16px', display: 'block' }}>Gemini Pro</strong>
                    <span style={{ 
                      fontSize: '9px', 
                      background: 'rgba(255,255,255,0.2)', 
                      padding: '2px 6px', 
                      borderRadius: '10px',
                      textTransform: 'uppercase',
                      fontWeight: 'bold',
                      letterSpacing: '0.5px'
                    }}>Ultra</span>
                  </div>
                  <span style={{ fontSize: '11px', opacity: 0.8, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80' }} />
                    Advanced AI Engine Active
                  </span>
                </div>
              </div>
              <div className="row" style={{ gap: 8 }}>
                <button 
                  onClick={() => {
                    if (window.confirm("Clear chat history?")) {
                      setMessages([{ id: 1, text: "Chat cleared. How can I help you now?", sender: 'bot' }]);
                      localStorage.removeItem('chat_history_student');
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'white', opacity: 0.8, cursor: 'pointer' }}
                  title="Clear Chat"
                >
                  <Zap size={18} />
                </button>
                <button 
                  onClick={() => setIsSpeechEnabled(!isSpeechEnabled)}
                  style={{ background: 'none', border: 'none', color: 'white', opacity: 0.8, cursor: 'pointer' }}
                >
                  {isSpeechEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'white', opacity: 0.8, cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="ai-chat-messages" style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              background: 'var(--bg)'
            }}>
              {messages.map(msg => (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  key={msg.id}
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
                    {msg.sender === 'user' ? <User size={10} /> : <Bot size={10} className="text-accent" />}
                    {msg.sender === 'user' ? 'You' : 'Gemini Ultra Pro'}
                    {msg.sender === 'bot' && <ShieldCheck size={10} style={{ color: '#4ade80' }} />}
                  </div>
                  <div 
                    className={`chat-bubble ${msg.sender}`}
                    style={{
                      background: msg.sender === 'user' ? 'linear-gradient(135deg, #4f46e5, #9333ea)' : 'var(--card)',
                      color: msg.sender === 'user' ? 'white' : 'var(--text)',
                      padding: '12px 16px',
                      borderRadius: '18px',
                      borderTopRightRadius: msg.sender === 'user' ? '4px' : '18px',
                      borderTopLeftRadius: msg.sender === 'bot' ? '4px' : '18px',
                      fontSize: '14px',
                      lineHeight: '1.6',
                      boxShadow: msg.sender === 'bot' ? '0 4px 15px rgba(0,0,0,0.1)' : '0 4px 15px rgba(79, 70, 229, 0.2)',
                      border: msg.sender === 'bot' ? '1px solid var(--border)' : 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {msg.sender === 'bot' && (
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
                      {msg.text.split('\n').map((line, i) => {
                        if (line.startsWith('###')) {
                          return <h3 key={i} style={{ margin: '8px 0', fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--accent)' }}>{line.replace('###', '')}</h3>
                        }
                        if (line.startsWith('•')) {
                          return <li key={i} style={{ marginLeft: '12px', listStyleType: 'none', display: 'flex', gap: '8px' }}>
                            <span style={{ color: 'var(--accent)' }}>•</span> {line.replace('•', '')}
                          </li>
                        }
                        if (line.includes('**')) {
                          const parts = line.split('**');
                          return <p key={i} style={{ margin: '4px 0' }}>
                            {parts.map((part, j) => j % 2 === 1 ? <strong key={j} style={{ color: 'var(--accent)' }}>{part}</strong> : part)}
                          </p>
                        }
                        return <p key={i} style={{ margin: '4px 0' }}>{line}</p>
                      })}
                    </div>
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center', padding: '0 8px' }}>
                  <div className="typing-dot" />
                  <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>AI is analyzing...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            <div style={{ padding: '8px 16px', display: 'flex', gap: 8, overflowX: 'auto', background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
              {suggestions.map((s, i) => (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={i}
                  onClick={() => handleSend(null, s.query)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    fontSize: '11px',
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer'
                  }}
                >
                  {s.icon}
                  {s.label}
                </motion.button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="ai-chat-input" style={{
              padding: '16px',
              background: 'var(--card)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type or speak to Gemini..."}
                style={{
                  flex: 1,
                  background: 'var(--bg)',
                  borderRadius: '14px',
                  padding: '12px 16px',
                  outline: 'none',
                  fontSize: '14px',
                  color: 'var(--text)',
                  transition: 'all 0.2s ease',
                  border: isListening ? '1px solid var(--accent)' : '1px solid var(--border)'
                }}
              />
              <div className="row" style={{ gap: 8 }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={startListening}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: isListening ? 'var(--accent)' : 'var(--bg)',
                    color: isListening ? 'white' : 'var(--muted)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Mic size={18} className={isListening ? 'pulse' : ''} />
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit" 
                  className="btn-send"
                  disabled={!inputValue.trim()}
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                    color: 'white',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    opacity: inputValue.trim() ? 1 : 0.5
                  }}
                >
                  <Send size={18} />
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatBot;
