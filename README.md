# 🚀 Campus Navigator (Easwari Navigator)

Welcome to **Campus Navigator** — a next-generation, AI-powered smart campus mapping and routing solution built for SRM Easwari Engineering College! 

![Campus Navigator Banner](https://img.shields.io/badge/Status-Live-success?style=for-the-badge)
![Tech Stack](https://img.shields.io/badge/Tech-React_|_FastAPI_|_Gemini-blue?style=for-the-badge)

## ✨ Core Features

*   **🗺️ Interactive 3D Map:** Built with MapLibre GL JS for smooth, high-performance campus visualization.
*   **🏢 Exploded Building Views:** Click on major buildings (like the Main Block) to trigger a beautiful isometric 3D explosion showing individual floor plans. Select any floor to explore it directly!
*   **🛣️ Smart Pathfinding:** Real-time A* routing algorithm calculates the shortest path between any two points on campus.
*   **🤖 Generative AI Assistant (Gemini 3.1 Pro):** Chat with our intelligent assistant to find locations, check event schedules, or get directions. The AI features **Long-Term Generative Memory**, learning facts dynamically from admins to improve future answers!
*   **🎟️ Live Events & Stalls:** Dynamic pop-up stalls and live campus events are pinned directly to the map.
*   **📍 OB Sync (Friend Radar):** Securely sync your live location with peers using a shared security code.
*   **🛡️ Comprehensive Admin Gateway:** A dedicated portal for admins to manage the routing graph network, visually place temporary stalls on the map, manage live events, and monitor system health.

## 🛠️ Technology Stack

### Frontend
*   **React + TypeScript** (Vite)
*   **Tailwind CSS** (for sleek, modern UI with glassmorphism)
*   **MapLibre GL JS** (Vector map rendering)
*   **Framer Motion** (Micro-animations and layout transitions)

### Backend
*   **FastAPI** (High-performance Python backend)
*   **Google Gemini API** (For intelligent conversational AI and dynamic JSON parsing)
*   **Firebase / Firestore** (Authentication and NoSQL data storage)

## 🚀 Getting Started

### 1. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

### 2. Frontend Setup (React/Vite)
```bash
cd frontend
npm install
npm run dev
```

### 3. Environment Variables
Make sure to configure your `.env` (backend) and `.env.local` (frontend) files with the appropriate keys for Gemini, Firebase, and MapLibre API providers.

## 🔐 Admin Access
To access the Admin Gateway, log in via Google SSO using an authorized administrator email. From the dashboard, you can visually edit the routing graph, add upcoming hackathons, and manage live occupancy rules!

---
*Built with ❤️ for the Hackathon 2026!*
