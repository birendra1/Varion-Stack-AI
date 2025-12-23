import express from 'express';
import { User } from '../models/User.js';
import { ChatSession } from '../models/ChatSession.js';
import { Preset } from '../models/Preset.js';
import { authenticateToken, isAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get("/stats", authenticateToken, isAdmin, async (req, res) => {
  try {
    const userCount = await User.countDocuments({ role: 'user' });
    const chatCount = await ChatSession.countDocuments();
    const presetCount = await Preset.countDocuments();
    res.json({ users: userCount, chats: chatCount, presets: presetCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

router.get("/users", authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }, "-password").sort({ username: 1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.put("/users/:id/block", authenticateToken, isAdmin, async (req, res) => {
  try {
    const { isBlocked } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { new: true });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user status" });
  }
});

router.post("/users/:id/email", authenticateToken, isAdmin, async (req, res) => {
    // Mock
    console.log(`📧 Sending email to user ${req.params.id}: ${req.body.message}`);
    res.json({ message: "Email sent successfully (mock)" });
});

router.post("/users/:id/token", authenticateToken, isAdmin, async (req, res) => {
    // Mock
    const token = Math.random().toString(36).substring(7);
    console.log(`🎫 Generated support token for user ${req.params.id}: ${token}`);
    res.json({ token, message: "Support token generated" });
});

export default router;
