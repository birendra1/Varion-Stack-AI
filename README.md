# Varion-Stack-AI
> **The Variable-Persona MERN Architecture.**
> A multi-model, multi-role AI platform designed for infinite adaptability.

<div align="center">

![License](https://img.shields.io/badge/License-Apache2.0-blue.svg)
![Stack](https://img.shields.io/badge/MERN-MongoDB%20|%20Express%20|%20React%20|%20Node-000000)
![Status](https://img.shields.io/badge/Status-Active%20Development-success)

</div>

## 📖 Short Description
**Varion Stack AI** is a scalable, open-source chat platform built on the MERN stack that decouples AI "intelligence" (Models like GPT-4, Llama 3) from AI "personality" (Roles). It allows users to instantly switch between specialized personas—like a **strict Code Reviewer**, an **empathetic Companion**, or a **creative Event Planner**—while maintaining isolated memories for each role. Designed for developers who want a "SaaS-ready" architecture with multi-vendor support (OpenAI, Anthropic, Ollama) and real-time streaming.

---

## 📖 The "Varion" Philosophy
The name **Varion** comes from **"Variable" + "Ion"**. 
In standard AI apps, the assistant is static. In **Varion Stack**, the personality is a **variable**.

We built this stack to solve the "One Size Fits All" problem. Instead of one generic bot, Varion allows you to hot-swap "Identity Modules" instantly—turning your chat from a **strict Python tutor** into a **creative event planner** in milliseconds.

## 🚀 Key Features

### ♾️ Dynamic Identity Injection
* **Context Isolation:** The database treats every Persona as a separate "User Context." Your *AI Girlfriend* won't remember the code snippets you sent to your *AI Debugger*.
* **JSON-Based Roles:** Create new personalities by simply dropping a JSON config into the `/personas` folder.

### 🔌 Multi-Vendor "Brain"
* **Hybrid Intelligence:** Route complex queries to **GPT-4** and simple chat to **Llama-3 (via Ollama)** to save costs.
* **Failover Support:** If the OpenAI API goes down, Varion automatically switches to Anthropic or Local AI.

### ⚡ The "Stack" (MERN + Vector)
* **Frontend:** React + Vite (Optimized for low-latency streaming).
* **Backend:** Node.js streams using Server-Sent Events (SSE).
* **Memory:** MongoDB Vector Search for long-term persona memory.

## 🛠️ Installation & Usage

Follow these steps to get your own instance running in under 5 minutes.

### 1. Prerequisites
* **Node.js** (v18 or higher)
* **MongoDB** (Local or Atlas URI)
* **API Keys** (OpenAI, Anthropic, or a running Ollama instance)

### 2. Setup

```bash
# 1. Clone the Varion Stack
git clone [https://github.com/birendra1/varion-stack-ai.git](https://github.com/birendra1/varion-stack-ai.git)

# 2. Install Dependencies (Root)
cd varion-stack
npm install

# 3. Environment Configuration
# Rename the example file
cp .env.example .env

# Open .env and add your keys:
# OPENAI_API_KEY=sk-...
# MONGO_URI=mongodb://...
