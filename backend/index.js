import express from "express";
import cors from "cors";
import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_this";

// --- MONGODB SETUP ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ollama-chat";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- SCHEMAS ---

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' }
});
const User = mongoose.model("User", UserSchema);

const ChatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true }, 
  title: String,
  model: String,
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant', 'system'] },
      content: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});
const ChatSession = mongoose.model("ChatSession", ChatSchema);

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
});
const Category = mongoose.model("Category", CategorySchema);

const PresetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  prompt: { type: String, required: true }, 
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: String }
});
const Preset = mongoose.model("Preset", PresetSchema);

// --- SEED ADMIN ---
async function seedAdmin() {
  const adminExists = await User.findOne({ username: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', password: hashedPassword, role: 'admin' });
    console.log("👤 Default Admin created (admin/admin123)");
  }
}
seedAdmin();

// --- MIDDLEWARE ---

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: "Admin access required" });
  }
}

const OLLAMA_BASE = "http://localhost:11434";

// --- AUTH ROUTES ---

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, role: user.role, username: user.username });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// --- CHAT ROUTES ---

// 1. Get Chat History by Session ID
app.get("/api/history/:sessionId", async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    res.json(session ? session.messages : []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// 3. Get All Chat Sessions
app.get("/api/sessions", async (req, res) => {
  try {
    const sessions = await ChatSession.find({}, "sessionId createdAt title messages").sort({ createdAt: -1 });
    const sessionList = sessions.map(s => {
      const firstUserMessage = s.messages.find(m => m.role === 'user');
      return {
        sessionId: s.sessionId,
        createdAt: s.createdAt,
        title: s.title || (firstUserMessage ? firstUserMessage.content.substring(0, 30) : 'New Chat')
      }
    });
    res.json(sessionList);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

// 4. Update Session Title
app.put("/api/sessions/:sessionId", async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    const session = await ChatSession.findOneAndUpdate(
      { sessionId: req.params.sessionId },
      { title: title },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.json({ sessionId: session.sessionId, title: session.title });
  } catch (err) {
    res.status(500).json({ error: "Failed to update session title" });
  }
});

// 2. Chat Endpoint (Handles Ollama + DB Storage)
app.post("/api/chat", async (req, res) => {
  const { model, messages, sessionId } = req.body; 
  
  if (!model || !messages) {
    return res.status(400).json({ error: "model and messages required" });
  }

  const activeSessionId = sessionId || "default-session"; 

  try {
    const ollamaResponse = await axios.post(`${OLLAMA_BASE}/api/chat`, {
      model,
      messages,
      stream: true, 
    }, {
      responseType: 'stream' 
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    let fullContent = '';
    let aiMessageForDb = null;

    ollamaResponse.data.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      try {
        const jsonStrs = chunkStr.split('\n').filter(s => s);
        for (const jsonStr of jsonStrs) {
          const parsed = JSON.parse(jsonStr);
          if (parsed.message && parsed.message.content) {
            fullContent += parsed.message.content;
          }
          if (parsed.done) {
            aiMessageForDb = {
              role: 'assistant',
              content: fullContent,
            };
          }
          res.write(`data: ${jsonStr}\n\n`);
        }
      } catch (e) {
        console.error('Error parsing streaming chunk:', e);
      }
    });

    ollamaResponse.data.on('end', async () => {
      res.end(); 

      if (aiMessageForDb) {
        const userMessage = messages[messages.length - 1];
        try {
          await ChatSession.findOneAndUpdate(
            { sessionId: activeSessionId },
            { 
              $setOnInsert: { 
                model: model,
                title: userMessage.content.substring(0, 30)
              },
              $push: { 
                messages: { $each: [userMessage, aiMessageForDb] } 
              } 
            },
            { upsert: true, new: true }
          );
        } catch (dbError) {
          console.error('Error saving chat to DB:', dbError);
        }
      }
    });

  } catch (err) {
    console.error("Ollama Error:", err.message);
    res.status(500).json({ error: "Failed to connect to Ollama" });
  }
});

// --- PRESET & CATEGORY ROUTES ---

// GET all categories (Public)
app.get("/api/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

// GET presets (Public)
app.get("/api/presets", async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter = categoryId ? { category: categoryId } : {};
    const presets = await Preset.find(filter).populate('category').sort({ name: 1 });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch presets" });
  }
});

// ADMIN: Manage Presets
app.post("/api/presets", authenticateToken, isAdmin, async (req, res) => {
  try {
    const preset = await Preset.create(req.body);
    res.status(201).json(preset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put("/api/presets/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const preset = await Preset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(preset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/presets/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await Preset.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ADMIN: Manage Categories
app.post("/api/categories", authenticateToken, isAdmin, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/categories/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


app.listen(3001, () => console.log("🚀 Backend running on http://localhost:3001"));