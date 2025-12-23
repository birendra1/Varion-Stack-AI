import mongoose from 'mongoose';

const ModelConfigSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Display Name
  value: { type: String, required: true }, // Model ID for API
  provider: { type: String, enum: ['ollama', 'openai', 'anthropic', 'custom'], default: 'ollama' },
  baseUrl: { type: String, default: 'http://localhost:11434' },
  apiKey: { type: String }, // Stored encrypted
  contextWindow: { type: Number, default: 4096 },
  isActive: { type: Boolean, default: true }
});

export const ModelConfig = mongoose.model("ModelConfig", ModelConfigSchema);
