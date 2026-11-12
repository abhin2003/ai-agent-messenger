# AI Agent Messenger – The Operating System for AI Employees

AI Agent Messenger is an enterprise-grade operating system for autonomous AI employees. It combines a real-time messaging interface with persistent semantic memory (PostgreSQL + pgvector via Supabase) and LangChain agent orchestration.

---

## Architecture Overview

* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, Lucide React
* **Backend:** Python FastAPI (ASGI)
* **Agent Framework:** LangChain (Configurable agent persona, role, and system prompt)
* **Storage & Vector Database:** Supabase PostgreSQL with `pgvector`
* **Embeddings:** OpenAI Embeddings (`text-embedding-3-small`)

---

## Directory Structure

```
ai-agent-messenger/
├── frontend/             # Next.js App Router client
│   ├── app/              # Application routes & layouts
│   ├── public/           # Static assets
│   ├── package.json      # Frontend dependencies & scripts
│   └── .env.example      # Frontend environment placeholders
├── backend/              # FastAPI server
│   ├── app/
│   │   ├── __init__.py
│   │   └── main.py       # API router, health check & endpoints
│   ├── requirements.txt  # Python dependencies
│   ├── .env.example      # Backend environment placeholders
│   └── .venv/            # Python virtual environment
├── .gitignore            # Git ignore configuration
└── README.md             # Project documentation
```

---

## Setup & Startup Instructions

### Prerequisites
* **Node.js** (v18+ recommended, detected v24.14.1) & `npm`
* **Python** (3.10+ recommended, detected 3.10.8)

---

### 1. Backend Setup

1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   * **Windows (PowerShell):**
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\Activate.ps1
     ```
   * **Linux / macOS:**
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   * API root: `http://localhost:8000/`
   * Health endpoint: `http://localhost:8000/health`
   * Interactive Swagger docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup

1. Open another terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   * Access the application at: `http://localhost:3000`

---

## API Verification

You can verify the backend status at any time:
```bash
curl http://localhost:8000/health
```
Expected response:
```json
{
  "status": "healthy",
  "service": "backend",
  "environment": "development"
}
```

