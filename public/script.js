// ============================================
// THEME
// ============================================
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
  document.body.classList.add('light');
}

function toggleTheme() {
  const isLight = document.body.classList.toggle('light');
  document.getElementById('themeIcon').textContent  = isLight ? '🌙' : '☀️';
  document.getElementById('themeLabel').textContent = isLight ? 'Dark mode' : 'Light mode';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// ============================================
// GOOGLE SIGN IN
// ============================================
function handleGoogleLogin(response) {
  const payload = JSON.parse(atob(response.credential.split('.')[1]));

  const user = {
    googleId: payload.sub,
    name:     payload.name,
    email:    payload.email,
    picture:  payload.picture
  };

  // Save user to localStorage
  localStorage.setItem('lochan_user', JSON.stringify(user));

  // Save user to MongoDB
  fetch('/api/user/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(user)
  });

  // Load chat history then show app
  loadHistory(user);
}

async function loadHistory(user) {
  showApp(user);

  try {
    const res  = await fetch(`/api/history/${user.googleId}`);
    const data = await res.json();

    if (data.messages && data.messages.length > 0) {
      // Remove welcome screen
      const welcome = document.getElementById('welcome');
      if (welcome) welcome.remove();

      // Load old messages
      data.messages.forEach(msg => {
        conversationHistory.push({ role: msg.role, content: msg.content });
        addMessage(msg.role === 'user' ? 'user' : 'bot', msg.content);
      });
    }
  } catch (err) {
    console.error('History load error:', err);
  }
}

function showApp(user) {
  // Hide login screen
  document.getElementById('loginScreen').style.display = 'none';

  // Show main app
  document.getElementById('appShell').style.display = 'flex';

  // Fill user info in sidebar
  document.getElementById('userName').textContent  = user.name;
  document.getElementById('userEmail').textContent = user.email;
  document.getElementById('userPhoto').src         = user.picture;

  // Personalize welcome message
  const firstName = user.name.split(' ')[0];
  const welcomeTitle = document.getElementById('welcomeTitle');
  if (welcomeTitle) {
    welcomeTitle.textContent = `Hello, ${firstName}! How can I help you?`;
  }

  // Apply saved theme labels
  const isLight = document.body.classList.contains('light');
  document.getElementById('themeIcon').textContent  = isLight ? '🌙' : '☀️';
  document.getElementById('themeLabel').textContent = isLight ? 'Dark mode' : 'Light mode';
}

function logout() {
  localStorage.removeItem('lochan_user');
  location.reload();
}

// Check if already logged in on page load
window.addEventListener('load', function() {
  const savedUser = localStorage.getItem('lochan_user');
  if (savedUser) {
    showApp(JSON.parse(savedUser));
  }
});

// ============================================
// CHAT LOGIC
// ============================================
let conversationHistory = [];

document.getElementById('userInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

document.getElementById('userInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 160) + 'px';
});

function sendSuggestion(text) {
  document.getElementById('userInput').value = text;
  sendMessage();
}

function clearChat() {
  conversationHistory = [];
  const messages = document.getElementById('messages');
  messages.innerHTML = `
    <div class="welcome" id="welcome">
      <div class="welcome-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <h1 class="welcome-title" id="welcomeTitle">How can I help you today?</h1>
      <p class="welcome-sub">Ask me anything — code, writing, analysis, or just a conversation.</p>
      <div class="suggestion-grid">
        <button class="suggestion-card" onclick="sendSuggestion('Explain how neural networks work in simple terms')">
          <span class="suggestion-icon">🧠</span>
          <span class="suggestion-text">Explain neural networks simply</span>
        </button>
        <button class="suggestion-card" onclick="sendSuggestion('Write a Python function to sort a list of dictionaries by a key')">
          <span class="suggestion-icon">🐍</span>
          <span class="suggestion-text">Python sorting function</span>
        </button>
        <button class="suggestion-card" onclick="sendSuggestion('Give me 5 tips to improve my Upwork profile as a beginner freelancer')">
          <span class="suggestion-icon">💼</span>
          <span class="suggestion-text">Upwork profile tips</span>
        </button>
        <button class="suggestion-card" onclick="sendSuggestion('What are the best free tools for a web developer in 2025?')">
          <span class="suggestion-icon">🛠️</span>
          <span class="suggestion-text">Best free dev tools 2025</span>
        </button>
      </div>
    </div>`;
}

async function sendMessage() {
  const inputEl  = document.getElementById('userInput');
  const userText = inputEl.value.trim();
  if (!userText) return;

  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();

  inputEl.value = '';
  inputEl.style.height = 'auto';
  setButtonDisabled(true);

  addMessage('user', userText);
  conversationHistory.push({ role: 'user', content: userText });
  showTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
      messages: conversationHistory,
      googleId: JSON.parse(localStorage.getItem('lochan_user') || '{}').googleId })
    });

    const data = await response.json();
    removeTypingIndicator();

    if (data.error) {
      addMessage('bot', '⚠️ ' + (data.error.message || data.error));
    } else {
      const reply = data.reply;
      conversationHistory.push({ role: 'assistant', content: reply });
      addMessage('bot', reply);
    }

  } catch (error) {
    removeTypingIndicator();
    addMessage('bot', '⚠️ Could not connect to server. Is it running?');
    console.error('Error:', error);
  }

  setButtonDisabled(false);
  inputEl.focus();
}

function addMessage(role, text) {
  const messagesEl = document.getElementById('messages');
  const savedUser  = localStorage.getItem('lochan_user');
  const user       = savedUser ? JSON.parse(savedUser) : null;
  const firstName  = user ? user.name.split(' ')[0][0] : 'L';

  const row = document.createElement('div');
  row.classList.add('message-row', role === 'bot' ? 'ai' : 'user');

  const inner = document.createElement('div');
  inner.classList.add('message-inner');

  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');

  if (role === 'bot') {
    avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  } else if (user && user.picture) {
    // Show real Google profile photo for user messages
    const img = document.createElement('img');
    img.src = user.picture;
    img.style.cssText = 'width:30px;height:30px;border-radius:50%;object-fit:cover;';
    avatar.appendChild(img);
  } else {
    avatar.textContent = firstName;
  }

  const content = document.createElement('div');
  content.classList.add('msg-content');

  const sender = document.createElement('div');
  sender.classList.add('msg-sender');
  sender.textContent = role === 'bot' ? 'Lochan AI' : (user ? user.name.split(' ')[0] : 'You');

  const bubble = document.createElement('div');
  bubble.classList.add('msg-bubble');
  bubble.innerHTML = formatMessage(text);

  content.appendChild(sender);
  content.appendChild(bubble);
  inner.appendChild(avatar);
  inner.appendChild(content);
  row.appendChild(inner);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatMessage(text) {
  // Code blocks
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, function(match, lang, code) {
    const language = lang || 'code';
    return `<pre>
      <div class="code-header">
        <span class="code-lang">${language}</span>
        <button class="copy-btn" onclick="copyCode(this)">Copy</button>
      </div>
      <code>${escapeHtml(code.trim())}</code>
    </pre>`;
  });


  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

 
  text = text.replace(
    /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
  );

  // Line breaks
  text = text.replace(/\n/g, '<br>');

  return text;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function copyCode(btn) {
  const code = btn.closest('pre').querySelector('code').innerText;
  navigator.clipboard.writeText(code).then(() => {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  });
}

function showTypingIndicator() {
  const messagesEl = document.getElementById('messages');
  const row = document.createElement('div');
  row.classList.add('typing-row');
  row.id = 'typing-indicator';
  row.innerHTML = `
    <div class="typing-inner">
      <div class="typing-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="typing-dots">
        <div class="dot"></div>
        <div class="dot"></div>
        <div class="dot"></div>
      </div>
    </div>`;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function setButtonDisabled(disabled) {
  document.getElementById('sendBtn').disabled = disabled;
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}