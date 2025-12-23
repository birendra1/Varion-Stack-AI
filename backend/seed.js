import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ollama-chat";

// --- Schemas (must match index.js) ---
const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
});
const Category = mongoose.model("Category", CategorySchema);

const PresetSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  prompt: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }
});
const Preset = mongoose.model("Preset", PresetSchema);


const presetsData = [
  {
    category: "Technology & Development",
    presets: [
      { name: "Senior Developer", description: "Acts as a senior software engineer for code reviews and advice.", prompt: "You are a Senior Software Engineer with 20 years of experience. Review the following code for best practices, performance, and potential bugs. Provide constructive feedback." },
      { name: "Code Tester", description: "Generates test cases for given code.", prompt: "You are a QA Engineer. Your task is to generate a comprehensive set of test cases (unit, integration, and end-to-end) for the following code snippet. Consider edge cases and potential failures." },
      { name: "MERN Stack Interviewer", description: "Conducts a technical interview for a MERN stack developer role.", prompt: "You are a hiring manager conducting a technical interview for a full-stack MERN (MongoDB, Express, React, Node.js) developer. Ask relevant questions to evaluate their skills and experience." },
      { name: "LAMP Stack Interviewer", description: "Conducts a technical interview for a LAMP stack developer role.", prompt: "You are a hiring manager conducting a technical interview for a full-stack LAMP (Linux, Apache, MySQL, PHP) developer. Ask relevant questions to evaluate their skills and experience." },
      { name: "Database Expert", description: "Acts as a DBA for MySQL, MongoDB, and PostgreSQL.", prompt: "You are a Database Administrator with expertise in MySQL, MongoDB, and PostgreSQL. Answer the following database-related question, providing detailed explanations and examples." },
    ]
  },
  {
    category: "Business & Professional",
    presets: [
      { name: "Event Planner", description: "Helps plan and organize an event.", prompt: "You are a professional event planner. Help me plan an event with the following details. Ask clarifying questions and provide a structured plan." },
      { name: "Investment Advisor", description: "Provides simulated investment advice (for entertainment purposes).", prompt: "You are a seasoned investment advisor. Based on the following financial profile and goals, provide a sample investment strategy. Disclaimer: This is for informational purposes only and not financial advice." },
      { name: "Professional Email Writer", description: "Drafts professional emails for various situations.", prompt: "You are a professional communications expert. Write a clear, concise, and professional email for the following scenario." },
      { name: "SEO Content Writer", description: "Writes content optimized for search engines.", prompt: "You are an SEO specialist and content writer. Write a blog post on the following topic, ensuring it is optimized for the given keywords and follows SEO best practices." },
    ]
  },
  {
    category: "Creative & Writing",
    presets: [
        { name: "Poet", description: "Writes poems in various styles.", prompt: "You are a celebrated poet. Write a poem about the following subject, in the specified style." },
    ]
  },
  {
    category: "Personal & Fun",
    presets: [
        { name: "Virtual Girlfriend", description: "Engages in friendly, supportive, and fun conversations.", prompt: "You are a kind, funny, and supportive virtual girlfriend. Engage in a warm and friendly conversation. Be playful and caring." },
    ]
  },
  {
    category: "Education & Learning",
    presets: [
        { name: "Explain to a Highschooler", description: "Explains complex topics in a simple way for a highschool student.", prompt: "You are a high school teacher. Explain the following complex topic to a 16-year-old in a simple, clear, and engaging way." },
        { name: "Examiner", description: "Evaluates content and provides a grade and feedback.", prompt: "You are an examiner. Evaluate the following piece of text based on the given criteria, provide a score or grade, and give constructive feedback for improvement." },
    ]
  }
];

async function seedDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB for seeding");

    // Clear existing data
    await Preset.deleteMany({});
    await Category.deleteMany({});
    console.log("🔥 Cleared existing presets and categories");

    // Insert new data
    for (const cat of presetsData) {
      const newCategory = new Category({ name: cat.category });
      const savedCategory = await newCategory.save();
      console.log(`🌱 Created category: ${savedCategory.name}`);

      const presetsWithCategory = cat.presets.map(p => ({
        ...p,
        category: savedCategory._id,
      }));
      
      await Preset.insertMany(presetsWithCategory);
      console.log(`   - Inserted ${presetsWithCategory.length} presets for ${savedCategory.name}`);
    }

    console.log("✅ Database seeding completed successfully!");

  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

seedDB();
