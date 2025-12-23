import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config(); // Ensure you have your .env file loading if you use one

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ollama-chat";

const ChatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
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

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Check if we have any data
    const count = await ChatSession.countDocuments();
    
    if (count === 0) {
      console.log("⚠️ No sessions found. Creating a default session...");
      await ChatSession.create({
        sessionId: "default-session",
        model: "llama3.2:3b",
        messages: [
          {
            role: "system",
            content: "Welcome to your new chat database.",
            timestamp: new Date()
          }
        ]
      });
      console.log("🎉 Default session created!");
    } else {
      console.log(`ℹ️ Database already contains ${count} sessions.`);
    }

    mongoose.connection.close();
  } catch (err) {
    console.error("❌ Database setup failed:", err);
    process.exit(1);
  }
}

seedDatabase();