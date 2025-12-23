import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from 'url';
import { connectDB } from "./config/db.js";
import { seedAdmin } from "./utils/seed.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import modelRoutes from "./routes/modelRoutes.js";
import presetRoutes from "./routes/presetRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors());
app.use(express.json());

connectDB().then(() => {
    seedAdmin();
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api", chatRoutes);
app.use("/api/admin", adminRoutes);

// For Model and Preset routes, we need to align with original paths:
// Original: /api/models, /api/admin/models, /api/admin/mcp
// Original: /api/presets, /api/categories

// To avoid complex re-writing of the route files I just made, 
// I will mount them slightly differently or use multiple mounts if needed, 
// BUT it's cleaner to just update the route files to be correct.
// I will rewrite modelRoutes.js and presetRoutes.js in the next steps to use correct paths relative to /api mount.
// So I will mount them at /api.
app.use("/api", modelRoutes);
app.use("/api", presetRoutes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));