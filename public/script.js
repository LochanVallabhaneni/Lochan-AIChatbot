

let conversationHistory = [];

document.getElementById('userInput').addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});


document.getElementById('userInput').addEventListener('input', function() {
  this.style.height = 'auto';
  this.style.height = Math.min(this.scrollHeight, 100) + 'px';
});

async function sendMessage() {
  const inputEl = document.getElementById('userInput');
  const userText = inputEl.value.trim();
  if (!userText) return;

  inputEl.value = '';
  inputEl.style.height = 'auto';
  setButtonDisabled(true);

  
  addMessage('user', userText);


  conversationHistory.push({ role: 'user', content: userText });


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
  addMessage('bot', '⚠️ Error: ' + data.error);
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
}

function addMessage(role, text) {
  const messagesEl = document.getElementById('messages');

  const msgDiv = document.createElement('div');
  msgDiv.classList.add('message', role);

  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = role === 'bot' ? '🤖' : '👤';

  const bubble = document.createElement('div');
  bubble.classList.add('bubble');
  bubble.innerHTML = formatMessage(text);

  msgDiv.appendChild(avatar);
  msgDiv.appendChild(bubble);
  messagesEl.appendChild(msgDiv);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function showTypingIndicator() {
  const messagesEl = document.getElementById('messages');
  const div = document.createElement('div');
  div.classList.add('message', 'bot');
  div.id = 'typing-indicator';

  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = '🤖';

  const dots = document.createElement('div');
  dots.classList.add('typing-dots');
  dots.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';

  div.appendChild(avatar);
  div.appendChild(dots);
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-indicator');
  if (el) el.remove();
}

function setButtonDisabled(disabled) {
  document.getElementById('sendBtn').disabled = disabled;
}

function formatMessage(text) {
  
  text = text.replace(/```(\w+)?\n?([\s\S]*?)```/g, function(match, lang, code) {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  
  text = text.replace(/\n/g, '<br>');

  return text;
}
