(function() {
  // Prevent multiple initializations
  if (window.AgentifyWidget) return;
  window.AgentifyWidget = true;

  // Configuration
  const scriptTag = document.currentScript;
  const token = scriptTag.getAttribute('data-token') || 'test-token';
  const businessName = scriptTag.getAttribute('data-business') || 'AI Assistant';
  
  // Create Session ID
  let sessionId = localStorage.getItem('agentify_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('agentify_session_id', sessionId);
  }

  // Styles
  const style = document.createElement('style');
  style.innerHTML = `
    #agentify-widget-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #agentify-button {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #16a34a;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s;
      border: none;
      outline: none;
    }
    #agentify-button:hover {
      transform: scale(1.05);
    }
    #agentify-button svg {
      width: 30px;
      height: 30px;
      fill: white;
    }
    #agentify-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background-color: #ef4444;
      color: white;
      font-size: 12px;
      font-weight: bold;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid white;
    }
    #agentify-chat-window {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 360px;
      height: 520px;
      background-color: #111111;
      border: 1px solid #222222;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
      color: #ffffff;
    }
    @media (max-width: 480px) {
      #agentify-chat-window {
        position: fixed;
        bottom: 0;
        right: 0;
        width: 100vw;
        height: 100vh;
        border-radius: 0;
      }
    }
    #agentify-header {
      background-color: #1a1a1a;
      padding: 16px;
      border-bottom: 1px solid #222222;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    #agentify-header-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #agentify-avatar {
      width: 36px;
      height: 36px;
      background-color: #16a34a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    #agentify-title {
      font-weight: bold;
      font-size: 14px;
      margin: 0;
    }
    #agentify-status {
      font-size: 12px;
      color: #16a34a;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    #agentify-status::before {
      content: '';
      display: block;
      width: 6px;
      height: 6px;
      background-color: #16a34a;
      border-radius: 50%;
    }
    #agentify-close {
      background: none;
      border: none;
      color: #888888;
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
    }
    #agentify-messages {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .agentify-message {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 14px;
      line-height: 1.4;
      word-wrap: break-word;
    }
    .agentify-message.bot {
      background-color: #222222;
      color: #ffffff;
      align-self: flex-start;
      border-top-left-radius: 2px;
    }
    .agentify-message.user {
      background-color: #16a34a;
      color: #ffffff;
      align-self: flex-end;
      border-top-right-radius: 2px;
    }
    #agentify-quick-replies {
      padding: 0 16px 12px;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      scrollbar-width: none;
    }
    #agentify-quick-replies::-webkit-scrollbar {
      display: none;
    }
    .agentify-qr-btn {
      white-space: nowrap;
      background-color: transparent;
      border: 1px solid #16a34a;
      color: #16a34a;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .agentify-qr-btn:hover {
      background-color: #16a34a;
      color: #ffffff;
    }
    #agentify-input-area {
      padding: 12px 16px;
      border-top: 1px solid #222222;
      background-color: #1a1a1a;
      display: flex;
      gap: 8px;
    }
    #agentify-input {
      flex: 1;
      background-color: #0a0a0a;
      border: 1px solid #222222;
      color: #ffffff;
      padding: 10px 14px;
      border-radius: 20px;
      font-size: 14px;
      outline: none;
    }
    #agentify-input:focus {
      border-color: #16a34a;
    }
    #agentify-send {
      background-color: #16a34a;
      color: white;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    #agentify-send svg {
      width: 18px;
      height: 18px;
      fill: currentColor;
    }
    .agentify-typing {
      display: flex;
      gap: 4px;
      padding: 12px 16px;
      background-color: #222222;
      border-radius: 12px;
      border-top-left-radius: 2px;
      align-self: flex-start;
      width: fit-content;
    }
    .agentify-dot {
      width: 6px;
      height: 6px;
      background-color: #888888;
      border-radius: 50%;
      animation: agentify-bounce 1.4s infinite ease-in-out both;
    }
    .agentify-dot:nth-child(1) { animation-delay: -0.32s; }
    .agentify-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes agentify-bounce {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
  `;
  document.head.appendChild(style);

  // HTML Structure
  const container = document.createElement('div');
  container.id = 'agentify-widget-container';
  container.innerHTML = `
    <div id="agentify-chat-window">
      <div id="agentify-header">
        <div id="agentify-header-info">
          <div id="agentify-avatar">🤖</div>
          <div>
            <h4 id="agentify-title">${businessName}</h4>
            <p id="agentify-status">Online</p>
          </div>
        </div>
        <button id="agentify-close">&times;</button>
      </div>
      <div id="agentify-messages"></div>
      <div id="agentify-quick-replies">
        <button class="agentify-qr-btn">📅 Book Appointment</button>
        <button class="agentify-qr-btn">💰 Fees</button>
        <button class="agentify-qr-btn">🕐 Timings</button>
      </div>
      <div id="agentify-input-area">
        <input type="text" id="agentify-input" placeholder="Type your message..." autocomplete="off" />
        <button id="agentify-send">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>
    </div>
    <button id="agentify-button">
      <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg>
      <div id="agentify-badge">1</div>
    </button>
  `;
  document.body.appendChild(container);

  // Elements
  const btnOpen = document.getElementById('agentify-button');
  const btnClose = document.getElementById('agentify-close');
  const chatWindow = document.getElementById('agentify-chat-window');
  const badge = document.getElementById('agentify-badge');
  const messagesDiv = document.getElementById('agentify-messages');
  const inputEl = document.getElementById('agentify-input');
  const btnSend = document.getElementById('agentify-send');
  const qrBtns = document.querySelectorAll('.agentify-qr-btn');

  let isOpen = false;
  let hasOpened = false;
  let chatHistory = [];

  // Functions
  const toggleChat = () => {
    isOpen = !isOpen;
    chatWindow.style.display = isOpen ? 'flex' : 'none';
    if (isOpen && !hasOpened) {
      badge.style.display = 'none';
      hasOpened = true;
      appendMessage('bot', \`Welcome to \${businessName}! How can I help you today? 😊\`);
    }
  };

  const appendMessage = (sender, text) => {
    const msg = document.createElement('div');
    msg.className = \`agentify-message \${sender}\`;
    msg.innerText = text;
    messagesDiv.appendChild(msg);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    if (sender === 'user') {
      chatHistory.push({ role: 'user', content: text });
    } else if (sender === 'bot') {
      chatHistory.push({ role: 'assistant', content: text });
    }
  };

  const showTyping = () => {
    const typing = document.createElement('div');
    typing.id = 'agentify-typing-indicator';
    typing.className = 'agentify-typing';
    typing.innerHTML = '<div class="agentify-dot"></div><div class="agentify-dot"></div><div class="agentify-dot"></div>';
    messagesDiv.appendChild(typing);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  };

  const hideTyping = () => {
    const typing = document.getElementById('agentify-typing-indicator');
    if (typing) typing.remove();
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    appendMessage('user', text);
    inputEl.value = '';
    
    showTyping();

    try {
      const baseUrl = window.location.origin.includes('localhost') ? 'http://localhost:3000' : 'https://agentify.io';
      
      let localData = null;
      try {
        localData = JSON.parse(localStorage.getItem('agentify_business_data'));
      } catch(e) {}

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          sessionId,
          message: text,
          history: chatHistory.slice(-10),
          businessData: localData
        })
      });

      const data = await response.json();
      hideTyping();
      if (data.reply) {
        appendMessage('bot', data.reply);
      } else {
        appendMessage('bot', "I'm sorry, I'm having trouble connecting right now.");
      }
    } catch (e) {
      hideTyping();
      appendMessage('bot', "I'm offline at the moment. Please try again later.");
    }
  };

  // Event Listeners
  btnOpen.addEventListener('click', toggleChat);
  btnClose.addEventListener('click', toggleChat);
  
  btnSend.addEventListener('click', () => sendMessage(inputEl.value));
  inputEl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage(inputEl.value);
  });

  qrBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      sendMessage(btn.innerText);
    });
  });

})();
