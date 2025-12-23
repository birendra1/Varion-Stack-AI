import mongoose from 'mongoose';

const MCPServerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['stdio', 'sse'], default: 'stdio' },
  command: String, // For stdio
  args: [String],
  url: String, // For sse
  env: { type: Map, of: String },
  isActive: { type: Boolean, default: true }
});

export const MCPServer = mongoose.model("MCPServer", MCPServerSchema);
