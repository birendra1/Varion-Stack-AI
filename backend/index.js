import express from "express";
import cors from "cors";
import axios from "axios";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { extractTextFromFile } from "./fileProcessor.js";
import { webSearchToolDefinition, performWebSearch } from "./tools/webSearch.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// --- MULTER SETUP ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname)
  }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024, files: 10 } // 50MB limit, 10 files
});

const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_this";

// --- MONGODB SETUP ---
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ollama-chat";

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// --- SCHEMAS ---

import crypto from 'crypto';

// --- ENCRYPTION HELPERS ---
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // Must be 32 chars
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return text;
  try {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift(), 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (e) {
    return text; // Return original if fail
  }
}

// --- SCHEMAS ---

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  isBlocked: { type: Boolean, default: false }
});
const User = mongoose.model("User", UserSchema);

const ModelConfigSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Display Name
  value: { type: String, required: true }, // Model ID for API
  provider: { type: String, enum: ['ollama', 'openai', 'anthropic', 'custom'], default: 'ollama' },
  baseUrl: { type: String, default: 'http://localhost:11434' },
  apiKey: { type: String }, // Stored encrypted
  contextWindow: { type: Number, default: 4096 },
  isActive: { type: Boolean, default: true }
});
const ModelConfig = mongoose.model("ModelConfig", ModelConfigSchema);

const MCPServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['stdio', 'sse'], default: 'stdio' },
  command: String, // For stdio
  args: [String],
  url: String, // For sse
  env: { type: Map, of: String },
  isActive: { type: Boolean, default: true }
});
const MCPServer = mongoose.model("MCPServer", MCPServerSchema);

const ChatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Added userId
  title: String,
  model: String,
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant', 'system'] },
      content: String,
      attachments: [
        {
            filename: String,
            path: String,
            mimetype: String
        }
      ],
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

    if (user.isBlocked) {
      return res.status(403).json({ error: "Account is blocked. Please contact support." });
    }

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
    // Optional: Get userId from token if present (manual parse or use middleware if applied globally)
    const authHeader = req.headers['authorization'];
    let userId = null;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.id;
      } catch (e) { /* ignore invalid token */ }
    }

    const filter = userId ? { userId: userId } : { userId: null }; // Only show own chats
    
    // If you want to allow seeing old anonymous chats when not logged in, keep as is.
    // But if logged in, we probably only want to see OUR chats.
    
    const sessions = await ChatSession.find(filter, "sessionId createdAt title messages").sort({ createdAt: -1 });
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

// 5. Delete Session
app.delete("/api/sessions/:sessionId", async (req, res) => {
  try {
    const session = await ChatSession.findOneAndDelete({ sessionId: req.params.sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete session" });
  }
});

// --- MODEL CONFIG ROUTES ---

// Public: Get Active Models
app.get("/api/models", async (req, res) => {
  try {
    const models = await ModelConfig.find({ isActive: true }, "name value provider contextWindow");
    // If no models in DB, return default Ollama list (fallback)
    if (models.length === 0) {
        return res.json([
            { name: "Llama 3.2 (Default)", value: "llama3.2:3b", provider: "ollama" },
            { name: "Ministral 3B", value: "ministral-3:3b", provider: "ollama" },
            { name: "Qwen 2.5", value: "qwen2.5:0.5b", provider: "ollama" },
        ]);
    }
    res.json(models);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// Admin: Manage Models
app.get("/api/admin/models", authenticateToken, isAdmin, async (req, res) => {
    try {
        const models = await ModelConfig.find();
        // Mask API keys
        const masked = models.map(m => ({
            ...m.toObject(),
            apiKey: m.apiKey ? '********' : ''
        }));
        res.json(masked);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/models", authenticateToken, isAdmin, async (req, res) => {
    try {
        const { apiKey, ...data } = req.body;
        if (apiKey) data.apiKey = encrypt(apiKey);
        const model = await ModelConfig.create(data);
        res.json(model);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put("/api/admin/models/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        const { apiKey, ...data } = req.body;
        if (apiKey && !apiKey.includes('***')) {
            data.apiKey = encrypt(apiKey);
        } else {
            delete data.apiKey; // Don't overwrite if masked
        }
        const model = await ModelConfig.findByIdAndUpdate(req.params.id, data, { new: true });
        res.json(model);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete("/api/admin/models/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        await ModelConfig.findByIdAndDelete(req.params.id);
        res.sendStatus(204);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MCP SERVER ROUTES ---

app.get("/api/admin/mcp", authenticateToken, isAdmin, async (req, res) => {
    try {
        const servers = await MCPServer.find();
        res.json(servers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("/api/admin/mcp", authenticateToken, isAdmin, async (req, res) => {
    try {
        const server = await MCPServer.create(req.body);
        res.json(server);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.put("/api/admin/mcp/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        const server = await MCPServer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(server);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

app.delete("/api/admin/mcp/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        await MCPServer.findByIdAndDelete(req.params.id);
        res.sendStatus(204);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 2. Chat Endpoint (Handles Ollama + DB Storage)
app.post("/api/chat", upload.array('files', 10), async (req, res) => {
  // Parsing body fields because multer handles multipart
  const model = req.body.model;
  const sessionId = req.body.sessionId;
  let messages = [];
  try {
    messages = JSON.parse(req.body.messages);
  } catch (e) {
    return res.status(400).json({ error: "Invalid messages JSON" });
  }

  const authHeader = req.headers['authorization'];
  let userId = null;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (e) {}
  }
  
  if (!model || !messages) {
    return res.status(400).json({ error: "model and messages required" });
  }

  const activeSessionId = sessionId || "default-session"; 
  const files = req.files || [];
  let fileContext = "";
  let images = [];
  const attachments = [];

  // Fetch Model Config
  let modelConfig = await ModelConfig.findOne({ value: model });
  // Fallback if not found (assuming it's a default Ollama model not in DB yet)
  if (!modelConfig) {
      modelConfig = { provider: 'ollama', baseUrl: OLLAMA_BASE, value: model, contextWindow: 16384 };
  }
  
  // Decrypt API Key if present
  let apiKey = null;
  if (modelConfig.apiKey) {
      apiKey = decrypt(modelConfig.apiKey);
  }

  // Process uploaded files
  for (const file of files) {
      attachments.push({
          filename: file.originalname,
          path: file.path,
          mimetype: file.mimetype
      });

      if (file.mimetype.startsWith('image/')) {
          // Read image as base64
          const imageBuffer = fs.readFileSync(file.path);
          images.push(imageBuffer.toString('base64'));
          fileContext += `[Attached Image: ${file.originalname}]\n`;
      } else {
          // Extract text from docs/pdf/excel/etc
          const extractedText = await extractTextFromFile(file);
          fileContext += extractedText + "\n\n";
      }
  }

  // Append file context to the last user message
  const lastMessageIndex = messages.length - 1;
  if (lastMessageIndex >= 0 && messages[lastMessageIndex].role === 'user') {
      if (fileContext) {
        messages[lastMessageIndex].content += `\n\n--- Attached Files Analysis ---\n${fileContext}`;
      }
      if (images.length > 0) {
          messages[lastMessageIndex].images = images;
      }
  }

  try {
    let ollamaResponse; // We'll wrap other providers to mimic axios response for stream handling if possible, or handle separately.
    
    // Set headers for streaming response to client immediately
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';
    let aiMessageForDb = null;

    if (modelConfig.provider === 'ollama') {
        // 1. First Call to Ollama (with Tools)
        // Note: Ollama streaming with tools can be tricky. We might need non-streaming first if we expect tools, 
        // or parse carefully. For simplicity, we'll try non-streaming for the first check to see if it wants to call a tool.
        // If no tool, we stream the response.
        // Actually, let's try a unified flow:
        // We'll use stream=false for the first check to robustly detect tool calls.
        // If tool call -> execute -> stream=true second call.
        // If no tool call -> we just send the text (but we lose the "streaming" feel for the first chunk).
        // A better UX is to stream, and if tool call is detected (usually at the start), handle it.
        // But for robustness in this iteration, let's do: Check for tool (no stream) -> Stream final.

        const initialResponse = await axios.post(`${modelConfig.baseUrl}/api/chat`, {
            model: modelConfig.value,
            messages,
            stream: false, // Turn off streaming to check for tools easily
            options: { num_ctx: modelConfig.contextWindow || 16384 },
            images: images.length > 0 ? images : undefined,
            tools: [webSearchToolDefinition]
        });

        const msg = initialResponse.data.message;

        if (msg.tool_calls && msg.tool_calls.length > 0) {
            // Handle Tool Calls
            for (const toolCall of msg.tool_calls) {
                if (toolCall.function.name === 'web_search') {
                    // Send status to client
                    res.write(`data: ${JSON.stringify({ message: { content: '🔍 Searching the web...' }, done: false })}\n\n`);
                    
                    const query = toolCall.function.arguments.query;
                    const searchResult = await performWebSearch(query);
                    
                    // Add tool result to messages
                    messages.push(msg); // Add assistant's tool call message
                    messages.push({
                        role: 'tool',
                        content: searchResult,
                    });
                }
            }
            
            // 2. Second Call (Stream Final Response)
            const finalResponse = await axios.post(`${modelConfig.baseUrl}/api/chat`, {
                model: modelConfig.value,
                messages,
                stream: true,
                options: { num_ctx: modelConfig.contextWindow || 16384 }
            }, { responseType: 'stream' });

            finalResponse.data.on('data', chunk => {
                res.write(`data: ${chunk.toString()}\n\n`); // Pass through Ollama stream
            });
            finalResponse.data.on('end', () => handleStreamEnd(messages));

        } else {
            // No tool call, but we already got the full text response because stream=false.
            // We need to mimic a stream to the client or just send it all.
            // Sending it all as one chunk is easiest.
            res.write(`data: ${JSON.stringify({ message: { content: msg.content }, done: false })}\n\n`);
            res.write(`data: ${JSON.stringify({ message: { content: '' }, done: true })}\n\n`);
            
            // We need to reconstruct fullContent for DB save since we didn't use the stream logic
            fullContent = msg.content;
            handleStreamEnd(messages);
        }

    } else if (modelConfig.provider === 'openai' || modelConfig.provider === 'custom') {
        // OpenAI Logic with Tools
        const openAIReqBody = {
            model: modelConfig.value,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: true,
            max_tokens: modelConfig.contextWindow || 4096,
            tools: [webSearchToolDefinition],
            tool_choice: "auto"
        };

        const response = await axios.post(`${modelConfig.baseUrl}/v1/chat/completions`, openAIReqBody, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            responseType: 'stream'
        });

        let toolCallsBuffer = [];
        let isToolCall = false;

        response.data.on('data', async (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line === 'data: [DONE]') {
                    if (isToolCall) {
                        // Execution happens after stream ends for simplicity in this logic
                        // But actually, we need to execute AND then stream the next part.
                        // This "on end" logic is tricky with streaming tools.
                        // Let's accumulate tool calls.
                        await processOpenAIToolCalls(toolCallsBuffer);
                    } else {
                        handleStreamEnd(messages);
                    }
                    return; 
                }
                if (line.startsWith('data: ')) {
                    try {
                        const parsed = JSON.parse(line.substring(6));
                        const delta = parsed.choices[0]?.delta;
                        
                        if (delta?.tool_calls) {
                            isToolCall = true;
                            // Accumulate tool chunks
                            // Simplify: Just assume one tool call for now or simple accumulation
                             const tc = delta.tool_calls[0];
                             if (tc.function) {
                                 if (!toolCallsBuffer[tc.index]) toolCallsBuffer[tc.index] = { name: '', arguments: '' };
                                 if (tc.function.name) toolCallsBuffer[tc.index].name += tc.function.name;
                                 if (tc.function.arguments) toolCallsBuffer[tc.index].arguments += tc.function.arguments;
                             }
                        } else if (delta?.content) {
                            fullContent += delta.content;
                            const clientChunk = JSON.stringify({ message: { content: delta.content }, done: false });
                            res.write(`data: ${clientChunk}\n\n`);
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        });

        async function processOpenAIToolCalls(toolCalls) {
             for (const tc of toolCalls) {
                 if (tc.name === 'web_search') {
                     res.write(`data: ${JSON.stringify({ message: { content: '\n\n*Searching web...*\n\n' }, done: false })}\n\n`);
                     const args = JSON.parse(tc.arguments);
                     const result = await performWebSearch(args.query);

                     messages.push({ role: 'assistant', content: null, tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'web_search', arguments: tc.arguments } }] });
                     messages.push({ role: 'tool', tool_call_id: 'call_1', content: result });
                     
                     // Second Call
                     const secondResponse = await axios.post(`${modelConfig.baseUrl}/v1/chat/completions`, {
                         ...openAIReqBody,
                         messages: messages.map(m => ({ role: m.role, content: m.content, tool_calls: m.tool_calls, tool_call_id: m.tool_call_id })),
                         tools: undefined, // Don't loop
                         tool_choice: undefined
                     }, {
                         headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                         responseType: 'stream'
                     });

                     secondResponse.data.on('data', (chunk) => {
                        const lines = chunk.toString().split('\n').filter(l => l.trim() !== '');
                        for (const line of lines) {
                            if (line === 'data: [DONE]') { handleStreamEnd(messages); return; }
                            if (line.startsWith('data: ')) {
                                try {
                                    const parsed = JSON.parse(line.substring(6));
                                    const content = parsed.choices[0]?.delta?.content;
                                    if (content) {
                                        fullContent += content;
                                        res.write(`data: ${JSON.stringify({ message: { content }, done: false })}\n\n`);
                                    }
                                } catch (e) {}
                            }
                        }
                     });
                 }
             }
        }
    }

    async function handleStreamEnd(finalMessages) {
      res.end(); 

      if (aiMessageForDb || fullContent) {
         if (!aiMessageForDb) aiMessageForDb = { role: 'assistant', content: fullContent };
         
        // Construct user message object for DB
        const userMessage = finalMessages.find(m => m.role === 'user' && !m.tool_calls); // Find original user msg
        // ... (This logic needs to be robust to find the RIGHT user message if multiple exist, usually the last one before assistant)
        // For simplicity, we use the global 'messages' array start or just the content we received.
        
        // RE-FETCH original inputs to be safe or just use accumulated
        // The original `messages` array passed to the endpoint was modified in place in the Ollama block, 
        // so `messages` variable holds the full history including tool calls.
        
        let originalUserMessageContent = '';
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].role === 'user') {
                originalUserMessageContent = messages[i].content;
                break;
            }
        }

        const userMessageForDb = {
            role: 'user',
            content: originalUserMessageContent,
            attachments: attachments,
            timestamp: new Date()
        };

        try {
          await ChatSession.findOneAndUpdate(
            { sessionId: activeSessionId },
            { 
              $setOnInsert: { 
                model: model,
                title: userMessageForDb.content ? userMessageForDb.content.substring(0, 30) : 'Chat',
                userId: userId 
              },
              $push: { 
                messages: { $each: [userMessageForDb, aiMessageForDb] } 
              } 
            },
            { upsert: true, new: true }
          );
        } catch (dbError) {
          console.error('Error saving chat to DB:', dbError);
        }
      }
    }

  } catch (err) {
    console.error("Provider Error:", err.message, err.response?.data);
    res.status(500).json({ error: "Failed to connect to Model Provider" });
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

// --- ADMIN DASHBOARD ROUTES ---

app.get("/api/admin/stats", authenticateToken, isAdmin, async (req, res) => {
  try {
    const userCount = await User.countDocuments({ role: 'user' });
    const chatCount = await ChatSession.countDocuments();
    const presetCount = await Preset.countDocuments();
    res.json({ users: userCount, chats: chatCount, presets: presetCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

app.get("/api/admin/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }, "-password").sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.put("/api/admin/users/:id/block", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

// Mock Email
app.post("/api/admin/users/:id/email", authenticateToken, isAdmin, async (req, res) => {
    // In a real app, integrate NodeMailer or SendGrid here
    console.log(`📧 Sending email to user ${req.params.id}: ${req.body.message}`);
    res.json({ message: "Email sent successfully (mock)" });
});

// Mock Support Token
app.post("/api/admin/users/:id/token", authenticateToken, isAdmin, async (req, res) => {
    const token = Math.random().toString(36).substring(7);
    console.log(`🎫 Generated support token for user ${req.params.id}: ${token}`);
    res.json({ token, message: "Support token generated" });
});


app.listen(3001, () => console.log("🚀 Backend running on http://localhost:3001"));