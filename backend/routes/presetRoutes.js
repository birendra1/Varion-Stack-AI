import express from 'express';
import { Preset } from '../models/Preset.js';
import { Category } from '../models/Category.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

// --- Categories ---

router.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find().sort({ name: 1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch categories" });
  }
});

router.post("/categories", authenticateToken, isAdmin, async (req, res) => {
  try {
    const category = await Category.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/categories/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Presets ---

router.get("/presets", async (req, res) => {
  try {
    const { categoryId } = req.query;
    const filter = categoryId ? { category: categoryId } : {};
    const presets = await Preset.find(filter).populate('category').sort({ name: 1 });
    res.json(presets);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch presets" });
  }
});

router.post("/presets", authenticateToken, isAdmin, async (req, res) => {
  try {
    const preset = await Preset.create(req.body);
    res.status(201).json(preset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put("/presets/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    const preset = await Preset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(preset);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete("/presets/:id", authenticateToken, isAdmin, async (req, res) => {
  try {
    await Preset.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
