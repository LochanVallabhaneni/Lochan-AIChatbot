

require('dotenv').config(); // loads your .env file
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());                         
app.use(express.static(path.join(__dirname, 'public'))); 



app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  // Basic validation
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
  return res.status(500).json({ error: 'API key not configured. Add ANTHROPIC_API_KEY in Railway Variables.' });
}

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, 
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: 'You are Lochan, a friendly and helpful AI assistant. Keep responses clear and concise.',
        messages: messages
      })
    });

    const data = await response.json();

    // Forward Claude's response back to the browser
    res.json(data);

  } catch (error) {
    console.error('Error calling Claude API:', error);
    res.status(500).json({ error: 'Failed to reach Claude API' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n Lochan AI server running!`);
  console.log(` Open: http://localhost:${PORT}\n`);
});
