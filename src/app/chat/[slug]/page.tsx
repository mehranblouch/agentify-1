"use client";

import { useEffect, useState } from "react";
import { ArrowRight, MapPin, Clock, ShieldCheck } from "lucide-react";
import Head from "next/head";

export default function HostedChatPage({ params }: { params: { slug: string } }) {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Welcome to City Medical Clinic! How can I help you today? 😊" }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    let sid = localStorage.getItem('agentify_session_id');
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('agentify_session_id', sid);
    }
    setSessionId(sid);
  }, []);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: "agt_hosted_demo",
          sessionId,
          message: text,
          history: newMessages.slice(-10)
        })
      });

      const data = await response.json();
      setIsTyping(false);
      
      if (data.reply) {
        setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: "assistant", content: "I'm sorry, I'm having trouble connecting right now." }]);
      }
    } catch (e) {
      setIsTyping(false);
      setMessages([...newMessages, { role: "assistant", content: "I'm offline at the moment. Please try again later." }]);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4 sm:px-6">
      {/* Header Info */}
      <div className="w-full max-w-2xl bg-card border border-border rounded-2xl p-6 mb-8 text-center shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
        <div className="relative">
          <div className="w-20 h-20 mx-auto bg-primary/10 border-2 border-primary/20 rounded-full flex items-center justify-center text-4xl mb-4">
            🏥
          </div>
          <h1 className="text-3xl font-bold mb-2">City Medical Clinic</h1>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-text-secondary">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> Karachi, Pakistan</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Mon - Sat: 9 AM - 7 PM</span>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="w-full max-w-2xl flex-1 bg-card border border-border rounded-2xl flex flex-col overflow-hidden shadow-2xl h-[600px] max-h-[60vh]">
        <div className="p-4 bg-background border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="text-2xl">🤖</div>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
            </div>
            <div>
              <h2 className="font-bold text-sm">AI Assistant</h2>
              <p className="text-xs text-text-secondary">Replies instantly</p>
            </div>
          </div>
          <ShieldCheck className="w-5 h-5 text-green-500" />
        </div>

        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`max-w-[85%] text-sm p-4 rounded-2xl \${
                msg.role === 'user' 
                  ? 'bg-primary text-white self-end rounded-tr-sm' 
                  : 'bg-background border border-border self-start rounded-tl-sm'
              }`}
            >
              {msg.content}
            </div>
          ))}
          {isTyping && (
            <div className="bg-background border border-border self-start rounded-2xl rounded-tl-sm p-4 flex gap-1.5">
              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-background">
          <div className="flex gap-2 overflow-x-auto pb-3 mb-1 scrollbar-hide">
            {["📅 Book Appointment", "💰 Fees", "🕐 Timings", "👨‍⚕️ Available Doctors"].map((qr, i) => (
              <button 
                key={i}
                onClick={() => sendMessage(qr)}
                className="whitespace-nowrap px-4 py-1.5 border border-primary text-primary rounded-full text-xs font-medium hover:bg-primary hover:text-white transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-2">
            <input 
              type="text" 
              placeholder="Type your message..." 
              className="flex-1 bg-transparent border-none outline-none text-sm px-2"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
            />
            <button 
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="p-3 bg-primary rounded-lg text-white disabled:opacity-50 transition-opacity"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-sm text-text-secondary flex items-center gap-2">
        Powered by <span className="font-bold text-foreground">🤖 Agentify</span>
      </div>
    </div>
  );
}
