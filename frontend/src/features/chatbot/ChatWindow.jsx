import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../../api/client';
import { motion, AnimatePresence } from 'framer-motion';
import { HiPaperAirplane, HiTrash, HiSparkles } from 'react-icons/hi2';
import './Chat.css';

const QUICK_PROMPTS = [
  "Why is my cycle late?",
  "What should I eat during luteal phase?",
  "How can I reduce cramps naturally?",
  "What's my current cycle phase?",
  "Tips for better sleep during PMS",
  "Is my cycle regular?",
];

export default function ChatWindow() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      const { data } = await chatAPI.getHistory();
      setMessages(data || []);
    } catch {}
    setLoading(false);
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || sending) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', message: msg, id: Date.now() }]);
    setSending(true);

    try {
      const { data } = await chatAPI.sendMessage(msg);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        message: data.message, 
        id: Date.now() + 1 
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        message: 'Sorry, I had trouble processing that. Please try again.',
        id: Date.now() + 1 
      }]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = async () => {
    try {
      await chatAPI.clearHistory();
      setMessages([]);
    } catch {}
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-page">
      <div className="chat-header-bar">
        <div className="chat-title">
          <HiSparkles className="chat-title-icon" />
          <div>
            <h2>SYNCHER AI</h2>
            <span className="chat-subtitle">Your personal health assistant</span>
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={clearChat}>
          <HiTrash /> Clear
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && !loading && (
          <div className="chat-welcome">
            <div className="welcome-icon">✨</div>
            <h3>Hello! I'm SYNCHER AI</h3>
            <p>I can help you understand your cycle, symptoms, and give personalized health tips. Ask me anything!</p>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  className="quick-prompt-btn"
                  onClick={() => sendMessage(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`chat-bubble ${msg.role}`}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {msg.role === 'assistant' && (
                <div className="bubble-avatar">
                  <span>S</span>
                </div>
              )}
              <div className="bubble-content">
                <div className="bubble-text" 
                  dangerouslySetInnerHTML={{ 
                    __html: msg.message
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\n/g, '<br/>') 
                  }} 
                />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sending && (
          <div className="chat-bubble assistant">
            <div className="bubble-avatar"><span>S</span></div>
            <div className="bubble-content">
              <div className="typing-indicator">
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="chat-input-bar">
        <textarea
          className="chat-input"
          placeholder="Ask about your cycle, symptoms, health tips..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={sending}
        />
        <button
          className="chat-send-btn"
          onClick={() => sendMessage()}
          disabled={!input.trim() || sending}
        >
          <HiPaperAirplane />
        </button>
      </div>
    </div>
  );
}
