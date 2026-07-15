require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

 
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured.' });
  }

  try {
    
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: 'You are Lochan, a friendly and helpful AI assistant. Keep responses clear and concise.' },
          ...messages
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || 'Groq API error'
      });
    }

    const reply = data.choices[0].message.content;
    res.json({ reply });

  } catch (error) {
    console.error('Error calling Groq API:', error);
    res.status(500).json({ error: 'Failed to reach Groq API' });
  }
});

app.listen(PORT, () => {
  console.log(`\n Lochan AI server running!`);
  console.log(`👉 Open: http://localhost:${PORT}\n`);
});