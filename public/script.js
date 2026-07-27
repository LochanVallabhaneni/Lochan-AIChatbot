// ============================================
// script.js — Lochan AI Frontend Logic
// ============================================

let conversationHistory = [];

// Send on Enter (Shift+Enter = new line)
document.getElementById('userInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Auto-resize textarea
document.getElementById('userInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 160) + 'px';
});

async function sendMessage() {
  const inputEl = document.getElementById('userInput');
  const userText = inputEl.value.trim();
  if (!userText) return;

  // Hide welcome screen
  const welcome = document.getElementById('welcome');
  if (welcome) welcome.remove();

  inputEl.value = '';
  inputEl.style.height = 'auto';
  setButtonDisabled(true);

  // Add user message
  addMessage('user', userText);
  conversationHistory.push({ role: 'user', content: userText });

  // Show typing indicator
  showTypingIndicator();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conversationHistory })
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

  const row = document.createElement('div');
  row.classList.add('message-row', role === 'bot' ? 'ai' : 'user');

  const inner = document.createElement('div');
  inner.classList.add('message-inner');

  // Avatar
  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar');
  if (role === 'bot') {
    avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  } else {
    avatar.textContent = 'L';
  }

  // Content
  const content = document.createElement('div');
  content.classList.add('msg-content');

  const sender = document.createElement('div');
  sender.classList.add('msg-sender');
  sender.textContent = role === 'bot' ? 'Lochan AI' : 'You';

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
  // Code blocks with language detection
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

  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

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