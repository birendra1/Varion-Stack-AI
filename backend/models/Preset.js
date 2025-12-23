import mongoose from 'mongoose';

const PresetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  prompt: { type: String, required: true }, 
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategory: { type: String }
});

export const Preset = mongoose.model("Preset", PresetSchema);
