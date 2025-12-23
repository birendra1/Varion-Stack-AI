import mongoose from 'mongoose';

const ChatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Added userId
  title: String,
  model: String,
  messages: [
    {
      role: { type: String, enum: ['user', 'assistant', 'system', 'tool'] },
      content: String,
      attachments: [
        {
            filename: String,
            path: String,
            mimetype: String
        }
      ],
      images: [String], // Base64 images
      tool_calls: Array,
      tool_call_id: String,
      timestamp: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now }
});

export const ChatSession = mongoose.model("ChatSession", ChatSchema);
