import express from 'express';
import { User } from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get("/preferences", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, "preferences");
    res.json(user?.preferences || {});
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

router.put("/preferences", authenticateToken, async (req, res) => {
  const { theme, accentColor, defaultModel, customSystemPrompt } = req.body;

  try {
    const updateFields = {};
    if (theme !== undefined) updateFields['preferences.theme'] = theme;
    if (accentColor !== undefined) updateFields['preferences.accentColor'] = accentColor;
    if (defaultModel !== undefined) updateFields['preferences.defaultModel'] = defaultModel;
    if (customSystemPrompt !== undefined) updateFields['preferences.customSystemPrompt'] = customSystemPrompt;

    await User.updateOne({ _id: req.user.id }, { $set: updateFields });

    const user = await User.findById(req.user.id, "preferences");
    res.json(user.preferences);
  } catch (err) {
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id, "-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
