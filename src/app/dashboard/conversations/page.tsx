"use client";

import { Search, Clock, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function ConversationsPage() {
  const [conversations] = useState([
    { id: "1", visitor: "Visitor #124", preview: "Hi, do you have any appointments available today?", time: "2m ago", status: "resolved" },
    { id: "2", visitor: "Visitor #123", preview: "What is the fee for specialist?", time: "1h ago", status: "resolved" },
    { id: "3", visitor: "Visitor #122", preview: "I need to talk to a human", time: "3h ago", status: "pending" },
  ]);

  const [messages, setMessages] = useState([
    { role: 'user', content: 'Hi, do you have any appointments available today?' },
    { role: 'assistant', content: 'Hello! Yes, we have a slot available at 4:30 PM today. Would you like me to book it for you?' },
    { role: 'user', content: 'Yes please. Name is Ali.' },
    { role: 'assistant', content: "Great! I've booked your appointment for 4:30 PM today. See you then, Ali! 😊" }
  ]);
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [provider, setProvider] = useState("gemini");

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      let localData: any = {};
      let globalRules: any = {};
      try {
        localData = JSON.parse(sessionStorage.getItem('agentify_business_data') || '{}');
        localData.knowledge = sessionStorage.getItem('business_knowledge') || '';
        localData.commands = sessionStorage.getItem('business_commands') || '';
        
        const globalSysRules = JSON.parse(localStorage.getItem('global_system_rules') || '{}');
        globalRules = {
          knowledge: globalSysRules.instructions || '',
          commands: globalSysRules.globalCommands || ''
        };
      } catch(e) {}

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: "dashboard_test",
          sessionId: "dashboard_sess",
          message: input,
          history: newMessages.slice(-10),
          businessData: localData,
          globalRules: globalRules,
          provider: provider
        })
      });

      const data = await response.json();
      setIsTyping(false);
      
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...newMessages, { role: 'assistant', content: "Error connecting to AI." }]);
      }
    } catch (e) {
      setIsTyping(false);
      setMessages([...newMessages, { role: 'assistant', content: "Offline." }]);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col max-w-6xl mx-auto border border-border rounded-2xl overflow-hidden bg-card">
      <div className="flex items-center justify-between p-4 border-b border-border bg-background">
        <h2 className="text-xl font-bold">Conversations (Test AI)</h2>
        <div className="flex items-center gap-4">
          <select 
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="bg-card border border-border rounded-lg py-2 px-3 text-sm outline-none focus:border-primary"
          >
            <option value="gemini">Google (Gemini 3.8 Flash)</option>
            <option value="groq">Groq (Llama 3)</option>
          </select>
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Search chats..." 
              className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
        {/* List */}
        <div className="w-full md:w-1/3 h-48 md:h-auto border-b md:border-b-0 md:border-r border-border overflow-y-auto bg-background shrink-0">
          {conversations.map((c) => (
            <div key={c.id} className="p-4 border-b border-border hover:bg-card cursor-pointer transition-colors">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-sm">{c.visitor}</span>
                <span className="text-xs text-text-secondary">{c.time}</span>
              </div>
              <p className="text-sm text-text-secondary truncate mb-2">{c.preview}</p>
              {c.status === "resolved" ? (
                <span className="inline-flex items-center gap-1 text-xs text-green-500 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> Resolved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-orange-500 font-medium">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
          ))}
        </div>
        
        {/* Chat Detail */}
        <div className="flex-1 flex flex-col bg-card">
          <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
            {messages.map((m, i) => (
              <div 
                key={i}
                className={`p-3 rounded-2xl text-sm max-w-[80%] ${
                  m.role === 'user'
                    ? 'self-end bg-primary text-white rounded-tl-2xl rounded-tr-sm rounded-bl-2xl rounded-br-2xl'
                    : 'self-start bg-background border border-border rounded-tr-2xl rounded-tl-sm rounded-bl-2xl rounded-br-2xl'
                }`}
              >
                {m.content}
              </div>
            ))}
            {isTyping && (
              <div className="self-start bg-background border border-border p-3 rounded-2xl rounded-tl-sm text-sm text-text-secondary">
                AI is typing...
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border bg-background flex gap-2">
            <input 
              type="text" 
              placeholder="Test the AI agent..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-card border border-border rounded-xl px-4 py-2 text-sm outline-none focus:border-primary"
            />
            <button 
              onClick={handleSend}
              disabled={isTyping || !input.trim()}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
