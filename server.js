require('dotenv').config();
const express  = require('express');
const path     = require('path');
const mongoose = require('mongoose');

const app  = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB error:', err));


const userSchema = new mongoose.Schema({
  googleId:  { type: String, required: true, unique: true },
  name:      String,
  email:     String,
  picture:   String,
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date, default: Date.now },
  loginCount:{ type: Number, default: 1 }
});


const messageSchema = new mongoose.Schema({
  googleId:  String,
  role:      String, // 'user' or 'assistant'
  content:   String,
  createdAt: { type: Date, default: Date.now }
});

const User    = mongoose.model('User',    userSchema);
const Message = mongoose.model('Message', messageSchema);


app.post('/api/user/login', async (req, res) => {
  const { googleId, name, email, picture } = req.body;

  try {
    let user = await User.findOne({ googleId });

    if (user) {
     
      user.lastLogin  = new Date();
      user.loginCount += 1;
      user.picture    = picture;
      await user.save();
    } else {
     
      user = await User.create({ googleId, name, email, picture });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to save user' });
  }
});


app.get('/api/history/:googleId', async (req, res) => {
  try {
    const messages = await Message.find({
      googleId: req.params.googleId
    }).sort({ createdAt: 1 }).limit(50);

    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load history' });
  }
});


app.post('/api/history/save', async (req, res) => {
  const { googleId, role, content } = req.body;

  try {
    await Message.create({ googleId, role, content });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save message' });
  }
});


app.delete('/api/history/:googleId', async (req, res) => {
  try {
    await Message.deleteMany({ googleId: req.params.googleId });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to clear history' });
  }
});


app.get('/api/admin/users', async (req, res) => {
  const adminKey = req.headers['admin-key'];
  if (adminKey !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const users    = await User.find().sort({ lastLogin: -1 });
    const msgCount = await Message.countDocuments();
    res.json({ users, totalMessages: msgCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});


app.post('/api/chat', async (req, res) => {
  const { messages, googleId } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array is required' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        max_tokens: 1000,
        messages: [
          { role: 'system', content: 'You are Lochan AI, a friendly and helpful AI assistant. Keep responses clear and concise.' },
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

    if (googleId) {
      const lastUserMsg = messages[messages.length - 1];
      await Message.create({ googleId, role: 'user',      content: lastUserMsg.content });
      await Message.create({ googleId, role: 'assistant', content: reply });
    }

    res.json({ reply });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to reach Groq API' });
  }
});

app.listen(PORT, () => {
  console.log(`\n✅ Lochan AI running at http://localhost:${PORT}\n`);
});