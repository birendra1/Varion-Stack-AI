import express from 'express';
import { ModelConfig } from '../models/ModelConfig.js';
import { MCPServer } from '../models/MCPServer.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';
import { encrypt } from '../utils/encryption.js';

const router = express.Router();

// --- Public ---

router.get("/models", async (req, res) => {
  try {
    const models = await ModelConfig.find({ isActive: true }, "name value provider contextWindow");
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

// --- Admin: Models ---

router.get("/admin/models", authenticateToken, isAdmin, async (req, res) => {
    try {
        const models = await ModelConfig.find();
        const masked = models.map(m => ({
            ...m.toObject(),
            apiKey: m.apiKey ? '********' : ''
        }));
        res.json(masked);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/admin/models", authenticateToken, isAdmin, async (req, res) => {
    try {
        const { apiKey, ...data } = req.body;
        if (apiKey) data.apiKey = encrypt(apiKey);
        const model = await ModelConfig.create(data);
        res.json(model);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put("/admin/models/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        const { apiKey, ...data } = req.body;
        if (apiKey && !apiKey.includes('***')) {
            data.apiKey = encrypt(apiKey);
        } else {
            delete data.apiKey; 
        }
        const model = await ModelConfig.findByIdAndUpdate(req.params.id, data, { new: true });
        res.json(model);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete("/admin/models/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        await ModelConfig.findByIdAndDelete(req.params.id);
        res.sendStatus(204);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- Admin: MCP Servers ---

router.get("/admin/mcp", authenticateToken, isAdmin, async (req, res) => {
    try {
        const servers = await MCPServer.find();
        res.json(servers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post("/admin/mcp", authenticateToken, isAdmin, async (req, res) => {
    try {
        const server = await MCPServer.create(req.body);
        res.json(server);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put("/admin/mcp/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        const server = await MCPServer.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(server);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete("/admin/mcp/:id", authenticateToken, isAdmin, async (req, res) => {
    try {
        await MCPServer.findByIdAndDelete(req.params.id);
        res.sendStatus(204);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

export default router;
