import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { ChatSession } from '../models/ChatSession.js';
import { User } from '../models/User.js';
import { ModelConfig } from '../models/ModelConfig.js';
import { authenticateToken } from '../middleware/auth.js';
import { decrypt } from '../utils/encryption.js';
import { extractTextFromFile } from "../fileProcessor.js";
import { webSearchToolDefinition, performWebSearch } from "../tools/webSearch.js";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..'); // Adjust for backend root

// --- MULTER SETUP ---
const uploadDir = path.join(projectRoot, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
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
    limits: { fileSize: 50 * 1024 * 1024, files: 10 }
});

const OLLAMA_BASE = "http://localhost:11434";

// 1. Get Chat History
router.get("/history/:sessionId", async (req, res) => {
  try {
    const session = await ChatSession.findOne({ sessionId: req.params.sessionId });
    res.json(session ? session.messages : []);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch history" });
  }
});

// 2. Chat Endpoint (Handles Ollama + DB Storage)
router.post("/chat", upload.array('files', 10), async (req, res) => {
  // Auth check (manual since multer runs first)
  const authHeader = req.headers['authorization'];
  let userId = null;
  // TODO: Import JWT_SECRET properly. For now assuming it is in process.env or fallback
  const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_this";
  
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    try {
        const jwt = await import('jsonwebtoken'); // Dynamic import or top level
        const decoded = jwt.default.verify(token, JWT_SECRET);
        userId = decoded.id;
    } catch (e) {
      return res.status(403).json({ error: "Invalid token" });
    }
  }
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const model = req.body.model;
  const sessionId = req.body.sessionId;
  let messages = [];
  try {
    messages = JSON.parse(req.body.messages);
  } catch (e) {
    return res.status(400).json({ error: "Invalid messages JSON" });
  }

  if (!model || !messages) {
    return res.status(400).json({ error: "model and messages required" });
  }

  // --- INJECT PERSONALIZATION ---
  try {
      const user = await User.findById(userId);
      if (user && user.preferences && user.preferences.customSystemPrompt) {
          const personaInstruction = `
User Personalization / Persona:
${user.preferences.customSystemPrompt}

IMPORTANT INSTRUCTIONS:
- You must strictly adhere to the persona defined above.
- If asked about your hobbies, personal life, or preferences, answer as the persona would. Invent plausible details if necessary to stay in character.
- Do NOT break character or state you are an AI unless explicitly asked about your underlying architecture or limitations.
- If the persona conflicts with being helpful, prioritize the persona's tone while still attempting to be helpful.
`;

          if (messages.length > 0 && messages[0].role === 'system') {
              messages[0].content += `\n\n${personaInstruction}`;
          } else {
              messages.unshift({ role: 'system', content: personaInstruction });
          }
      }
  } catch (err) {
      console.error("Error fetching user preferences:", err);
  }

  const activeSessionId = sessionId || new mongoose.Types.ObjectId().toString(); 
  const files = req.files || [];
  let fileContext = "";
  let images = [];
  const attachments = [];

  let modelConfig = await ModelConfig.findOne({ value: model });
  if (!modelConfig) {
      modelConfig = { provider: 'ollama', baseUrl: OLLAMA_BASE, value: model, contextWindow: 16384 };
  }
  
  let apiKey = null;
  if (modelConfig.apiKey) {
      apiKey = decrypt(modelConfig.apiKey);
  }

  for (const file of files) {
      attachments.push({
          filename: file.originalname,
          path: file.path,
          mimetype: file.mimetype
      });

      if (file.mimetype.startsWith('image/')) {
          const imageBuffer = fs.readFileSync(file.path);
          images.push(imageBuffer.toString('base64'));
          fileContext += `[Attached Image: ${file.originalname}]\n`;
      } else {
          const extractedText = await extractTextFromFile(file);
          fileContext += extractedText + "\n\n";
      }
  }

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
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send sessionId immediately
    res.write(`data: ${JSON.stringify({ sessionId: activeSessionId })}\n\n`);

    let fullContent = '';
    let aiMessageForDb = null;

    if (modelConfig.provider === 'ollama') {
        const initialResponse = await axios.post(`${modelConfig.baseUrl}/api/chat`, {
            model: modelConfig.value,
            messages,
            stream: false, 
            options: { num_ctx: modelConfig.contextWindow || 16384 },
            images: images.length > 0 ? images : undefined,
            tools: [] // Disabled web search
        });

        const msg = initialResponse.data.message;

        if (msg.tool_calls && msg.tool_calls.length > 0) {
            // ... (Tool handling omitted for brevity/safety as per recent edits, but normally goes here)
            // Since we disabled tools, this branch is unreachable currently.
            // If tools were enabled:
            // 1. exec tool -> msg
            // 2. stream final
        } else {
            res.write(`data: ${JSON.stringify({ message: { content: msg.content }, done: false })}\n\n`);
            res.write(`data: ${JSON.stringify({ message: { content: '' }, done: true })}\n\n`);
            fullContent = msg.content;
            handleStreamEnd(messages);
        }

    } else if (modelConfig.provider === 'openai' || modelConfig.provider === 'custom') {
        const openAIReqBody = {
            model: modelConfig.value,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: true,
            max_tokens: modelConfig.contextWindow || 4096,
            tools: [], // Disabled
            tool_choice: "auto"
        };

        const response = await axios.post(`${modelConfig.baseUrl}/v1/chat/completions`, openAIReqBody, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            responseType: 'stream'
        });

        response.data.on('data', async (chunk) => {
            const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line === 'data: [DONE]') {
                    handleStreamEnd(messages);
                    return; 
                }
                if (line.startsWith('data: ')) {
                    try {
                        const parsed = JSON.parse(line.substring(6));
                        const delta = parsed.choices[0]?.delta;
                        if (delta?.content) {
                            fullContent += delta.content;
                            const clientChunk = JSON.stringify({ message: { content: delta.content }, done: false });
                            res.write(`data: ${clientChunk}\n\n`);
                        }
                    } catch (e) { /* ignore */ }
                }
            }
        });
    }

    async function handleStreamEnd(finalMessages) {
      res.end(); 

      if (aiMessageForDb || fullContent) {
         if (!aiMessageForDb) aiMessageForDb = { role: 'assistant', content: fullContent };
         
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
    console.error("Provider Error:", err.message);
    res.status(500).json({ error: "Failed to connect to Model Provider" });
  }
});

// 3. Get All Sessions
router.get("/sessions", authenticateToken, async (req, res) => {
  try {
    const sessions = await ChatSession.find(
      { userId: req.user.id },
      "sessionId createdAt title messages"
    ).sort({ createdAt: -1 });

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
router.put("/sessions/:sessionId", authenticateToken, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: "title is required" });
    }
    const session = await ChatSession.findOneAndUpdate(
      { sessionId: req.params.sessionId, userId: req.user.id },
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
router.delete("/sessions/:sessionId", authenticateToken, async (req, res) => {
  try {
    const session = await ChatSession.findOneAndDelete({
      sessionId: req.params.sessionId,
      userId: req.user.id
    });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete session" });
  }
});

export default router;
