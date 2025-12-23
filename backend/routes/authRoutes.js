import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { OTP } from '../models/OTP.js';
import { sendOTPEmail } from '../services/emailService.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "your_super_secret_key_change_this";

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({
      $or: [{ username }, { email: username.toLowerCase() }]
    });
    if (!user) return res.status(400).json({ error: "User not found" });

    if (user.isBlocked) {
      return res.status(403).json({ error: "Account is blocked. Please contact support." });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      role: user.role,
      username: user.username,
      email: user.email,
      preferences: user.preferences
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// Registration Step 1: Send OTP
router.post("/register/init", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email format" });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }]
    });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.deleteMany({ email: email.toLowerCase(), type: 'registration' });
    await OTP.create({
      email: email.toLowerCase(),
      otp: await bcrypt.hash(otp, 10),
      type: 'registration',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000)
    });

    await sendOTPEmail(email, otp, 'registration');

    res.json({ message: "Verification code sent to email" });
  } catch (err) {
    console.error("Registration init error:", err);
    res.status(500).json({ error: "Failed to send verification code" });
  }
});

// Registration Step 2: Verify OTP and Create User
router.post("/register/verify", async (req, res) => {
  const { username, email, password, otp } = req.body;

  if (!username || !email || !password || !otp) {
    return res.status(400).json({ error: "All fields required" });
  }

  try {
    const otpRecord = await OTP.findOne({ email: email.toLowerCase(), type: 'registration' });
    if (!otpRecord) {
      return res.status(400).json({ error: "No verification pending. Please restart registration." });
    }

    if (otpRecord.attempts >= 5) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: "Too many attempts. Please restart registration." });
    }

    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: "Verification code expired. Please restart registration." });
    }

    const validOtp = await bcrypt.compare(otp, otpRecord.otp);
    if (!validOtp) {
      await OTP.updateOne({ _id: otpRecord._id }, { $inc: { attempts: 1 } });
      return res.status(400).json({ error: "Invalid verification code" });
    }

    const existingUser = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }]
    });
    if (existingUser) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      isEmailVerified: true
    });

    await OTP.deleteOne({ _id: otpRecord._id });

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      role: user.role,
      username: user.username,
      email: user.email,
      preferences: user.preferences
    });
  } catch (err) {
    console.error("Registration verify error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Resend OTP
router.post("/resend-otp", async (req, res) => {
  const { email, type } = req.body;

  if (!email || !type) {
    return res.status(400).json({ error: "Email and type required" });
  }

  try {
    const otpRecord = await OTP.findOne({ email: email.toLowerCase(), type });
    if (!otpRecord) {
      return res.status(400).json({ error: "No pending verification" });
    }

    const timeSinceCreated = Date.now() - otpRecord.createdAt.getTime();
    if (timeSinceCreated < 60000) {
      const waitSeconds = Math.ceil((60000 - timeSinceCreated) / 1000);
      return res.status(429).json({ error: `Please wait ${waitSeconds} seconds before requesting another code` });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OTP.updateOne(
      { _id: otpRecord._id },
      {
        otp: await bcrypt.hash(otp, 10),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        attempts: 0,
        createdAt: new Date()
      }
    );

    await sendOTPEmail(email, otp, type);
    res.json({ message: "New verification code sent" });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Failed to resend code" });
  }
});

// Change Password
router.put("/password", authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password required" });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.updateOne({ _id: user._id }, { password: hashedPassword });

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password change error:", err);
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;
