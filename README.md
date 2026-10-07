# 🤖 Multi-Tenant AI Customer Support SaaS Dashboard with LLM Gateway

A multi-tenant AI customer support platform with project-scoped knowledge bases, RAG-powered chat, human ticket escalation, real-time updates, analytics, and a provider-agnostic LLM Gateway.

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135.2-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-14.1.0-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-3178C6?logo=typescript&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0-47A248?logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

---

## 🚀 Overview

The platform is designed for organizations that want an AI support assistant grounded in their own documentation while maintaining separation between tenants and projects.

Each organization can:

- Create and manage projects
- Invite team members with roles
- Upload PDF or text knowledge
- Chat with an AI assistant using project-specific context
- Escalate conversations to human agents
- Manage support tickets
- Monitor AI usage and support metrics
- Review organization audit logs

### Main Differentiator

The **LLM Gateway** separates application logic from individual AI providers, allowing tenant tiers to use different providers/models with automatic fallback and usage tracking.

---

## 🔥 Key Features

| Feature | Implementation |
|---|---|
| 🏢 Multi-tenancy | Organization-scoped data and project isolation |
| 🔐 Authentication | JWT access/refresh token authentication |
| 👥 RBAC | Owner, Admin, Agent and Viewer roles |
| 💬 AI Chat | Persistent conversations with streaming responses |
| 🤖 LLM Gateway | Groq, OpenAI and Gemini provider abstraction |
| 🔄 Provider Fallback | Retryable provider failures can switch to fallback |
| 📚 Knowledge Base | PDF and text ingestion |
| 🧠 RAG | Embeddings + vector similarity + keyword retrieval |
| 🎫 Human Handoff | Escalate AI conversations into support tickets |
| ⚡ Real-time | WebSocket ticket updates |
| 📊 Analytics | Usage, ticket and conversation metrics |
| 📝 Audit Logs | Organization-level activity tracking |
| 💳 Plan Limits | Member, project, KB and monthly token limits |
| ✉️ Invitations | Project/team invitation workflow |
| 🌗 Dashboard UI | Next.js dashboard with theme support |

---

## ⚡ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     User / Support Agent                     │
└──────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                      Next.js Dashboard                       │
└──────────────────────────────────────────────────────────────┘
                                │
                                │ REST / SSE  +  WebSocket (ticket updates)
                                ▼
┌──────────────────────────────────────────────────────────────┐
│                         FastAPI API                          │
│                                                              │
│    JWT + RBAC  ·  Chat Services  ·  RAG / Knowledge Base     │
│          Ticket & Escalation  ·  Analytics & Audit           │
│              WebSocket Manager  ·  LLM Gateway               │
└──────────────────────────────────────────────────────────────┘
               │                                 │
               │ reads / writes                  │ via LLM Gateway
               ▼                                 ▼
┌────────────────────────────┐  ┌────────────────────────────────┐
│          MongoDB           │  │              Groq              │
│    Redis (rate limits)     │  │             OpenAI             │
│                            │  │             Gemini             │
└────────────────────────────┘  └────────────────────────────────┘
```

### Core Engineering

- Organization and project identifiers are carried through authenticated application flows.
- AI requests are routed through a common provider interface.
- Chat responses support Server-Sent Events (SSE).
- Knowledge retrieval is restricted using both organization and project identifiers.
- Redis provides rate-limit state when configured.
- MongoDB stores organizations, projects, conversations, tickets, knowledge chunks, usage logs and audit information.
- Startup logic creates important MongoDB indexes.

---

## 🤖 LLM Gateway

The gateway provides a common interface over multiple AI providers.

```text
Tenant Tier
    │
    ▼
Routing Configuration
    │
    ├── Primary Provider
    │
    └── Fallback Provider
            │
            ▼
      Usage Tracking
```

### Supported Providers

- Groq
- OpenAI
- Google Gemini

Each provider implements the common `BaseProvider` interface with:

- Blocking completion
- Streaming completion
- Provider-specific error handling
- Token usage information

### Current Tier Routing

| Tier | Primary | Fallback |
|---|---|---|
| Free | Groq `openai/gpt-oss-20b` | Groq `openai/gpt-oss-120b` |
| Pro | OpenAI `gpt-5.6-terra` | Groq `openai/gpt-oss-120b` |
| Enterprise | Gemini `gemini-3.8-flash` | Groq `openai/gpt-oss-120b` |

The routing configuration is centralized in:

```text
backend/app/llm_gateway/model_router.py
```

The gateway also tracks:

- Prompt tokens
- Completion tokens
- Total tokens
- Provider/model used
- Latency
- Streaming status
- Conversation association

---

## 📚 RAG / Knowledge Base

The knowledge-base pipeline supports both text content and PDF documents.

```text
PDF / Text
    │
    ▼
Content Extraction
    │
    ▼
Chunking
    │
    ▼
BAAI/bge-small-en-v1.5
    │
    ▼
MongoDB Knowledge Chunks
    │
    ▼
Vector + Keyword Retrieval
    │
    ▼
Top-K Context
    │
    ▼
LLM Gateway
```

### Current Implementation

- PDF extraction with `pdfplumber`
- PDF upload limit: 10 MB
- Paragraph-aware chunking
- Default chunk size: 800 characters
- Chunk overlap: 100 characters
- Embedding model: `BAAI/bge-small-en-v1.5`
- Cosine-similarity retrieval
- Keyword/regex retrieval
- Hybrid candidate ranking
- Default chat retrieval: top 5 results
- Project-scoped knowledge retrieval
- Retrieved context is injected into the AI system prompt

---

## 🛡️ Multi-Tenant & Security

### Tenant Isolation

Application data is scoped using organization identifiers, with project identifiers additionally used for project-level knowledge and conversation flows.

### Authentication

- JWT access tokens
- JWT refresh tokens
- HTTP Bearer authentication
- Access-token validation
- Token type validation
- Password hashing with Argon2
- Automatic frontend access-token refresh

### RBAC

The application includes:

- `owner`
- `admin`
- `agent`
- `viewer`

Role checks are applied to protected operations such as knowledge-base management, invitations and audit-log administration.

### Additional Controls

- Organization-level rate limiting
- Monthly LLM token budgets
- Subscription resource limits
- Authenticated WebSocket connections
- Audit logging
- Project-scoped knowledge retrieval

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Python 3.11 | Backend runtime |
| FastAPI | REST API and WebSocket backend |
| Uvicorn | ASGI server |
| MongoDB | Application data and usage storage |
| Motor | Async MongoDB driver |
| Redis | Rate limiting/cache state |
| JWT | Authentication |
| Argon2 | Password hashing |
| Sentence Transformers | Embeddings |
| pdfplumber | PDF extraction |
| tiktoken | Token counting |
| Groq SDK | Groq integration |
| OpenAI SDK | OpenAI integration |
| Google GenAI SDK | Gemini integration |

### Frontend

| Technology | Purpose |
|---|---|
| Next.js 14 | Web application |
| React 18 | UI |
| TypeScript | Application development |
| Tailwind CSS | Styling |
| TanStack Query | Server-state management |
| Zustand | Client state |
| Axios | API requests |
| React Hook Form + Zod | Forms and validation |
| Recharts | Analytics charts |
| Radix UI | UI primitives |
| next-themes | Theme management |

### Infrastructure

- Docker
- Docker Compose
- MongoDB 6
- Redis 7

---

## 📂 Project Structure

```text
multi_tenant_ai_customer_support_saas/
│
├── backend/
│   ├── app/
│   │   ├── core/
│   │   ├── db/
│   │   ├── dependencies/
│   │   ├── llm_gateway/
│   │   │   ├── providers/
│   │   │   ├── models/
│   │   │   ├── gateway.py
│   │   │   └── model_router.py
│   │   ├── models/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── users/
│   │   └── websockets/
│   ├── uploads/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
│
├── docker-compose.yml
├── .env.example
└── .gitignore
```

---

## ⚙️ Setup

### Prerequisites

- Git
- Python 3.11
- Node.js 20+
- Docker + Docker Compose
- API keys for the configured LLM providers

---

### 1. Clone

```bash
git clone <your-repository-url>
cd multi_tenant_ai_customer_support_saas
```

---

### 2. Configure Environment

Copy the example environment file.

**macOS / Linux**

```bash
cp .env.example .env
```

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

Configure the required values in `.env`.

```env
SECRET_KEY=replace_this_with_a_random_jwt_secret_string
INVITE_TOKEN_EXPIRE_DAYS=3

MONGODB_URL=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379

CHAT_MAX_HISTORY_TURNS=10

GROQ_API_KEY=your_groq_api_key_here
GROQ_MAX_TOKENS=1024
GROQ_TEMPERATURE=0.7

OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_WS_URL=ws://127.0.0.1:8000
```

> ⚠️ Never commit `.env` or real API keys.

---

## 🐳 Docker Compose

The project includes Dockerfiles for both backend and frontend and a Compose configuration for MongoDB, Redis, FastAPI and Next.js.

From the project root:

```bash
docker compose up --build
```

Services:

```text
Frontend  → http://localhost:3000
Backend   → http://localhost:8000
MongoDB   → localhost:27017
Redis     → localhost:6379
```

Stop the services:

```bash
docker compose down
```

---

## 💻 Local Development

### Backend

**macOS / Linux**

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

**Windows PowerShell**

```powershell
cd backend
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend: `http://127.0.0.1:8000`

### Frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: `http://localhost:3000`

---

## 📡 API / API Docs

FastAPI automatically exposes OpenAPI documentation.

**Swagger UI**

```text
http://127.0.0.1:8000/docs
```

**ReDoc**

```text
http://127.0.0.1:8000/redoc
```

### Main API Areas

| Area | Base Route |
|---|---|
| Authentication | `/auth` |
| Organizations | `/org` |
| Projects | `/projects` |
| Conversations | `/chat` |
| Knowledge Base | `/kb` |
| Analytics | `/analytics` |
| LLM Gateway | `/api/v1/gateway` |
| Tickets | `/api/v1/tickets` |
| Audit Logs | `/api/v1/audit-logs` |
| WebSocket Tickets | `/ws/tickets` |

### Important AI Endpoints

```text
POST /api/v1/gateway/chat
POST /api/v1/gateway/chat/stream
```

The streaming endpoint returns Server-Sent Events.

### Knowledge Base

```text
POST   /kb/
GET    /kb/
POST   /kb/search
DELETE /kb/document/{title}
DELETE /kb/
```

---

## ⚡ Real-Time Support

Ticket updates use a WebSocket connection:

```text
/ws/tickets
```

The frontend establishes the connection and authenticates using a JWT before receiving organization-scoped ticket events.

---

## 🆕 Key Engineering Updates

- Added provider-independent LLM Gateway architecture.
- Added Groq, OpenAI and Gemini provider implementations.
- Added primary/fallback provider routing by subscription tier.
- Added streaming LLM responses through SSE.
- Added project-scoped RAG retrieval.
- Added PDF knowledge-base ingestion with table extraction.
- Added organization/project isolation to knowledge-base operations.
- Added JWT access/refresh authentication.
- Added role-based access control.
- Added Redis-backed organization rate limiting.
- Added subscription-based resource and monthly token limits.
- Added real-time ticket WebSocket updates.
- Added usage analytics and audit logging.
- Added Docker Compose support for the complete application stack.

---

## 📌 Known Limitations / Future Improvements

- Project membership authorization can be strengthened across all project-scoped operations.
- Current RAG retrieval performs application-side similarity scoring rather than using a dedicated vector database/index.
- WebSocket connection management is currently application-process based.
- Additional automated test coverage can be expanded.
- Production deployment would require further security, observability and infrastructure hardening.

---

## 🧠 Key Learnings

- Designing tenant-aware application boundaries across API, database and retrieval layers.
- Building a provider-agnostic LLM abstraction with fallback handling.
- Implementing RAG pipelines from document ingestion to context injection.
- Managing streaming AI responses with SSE.
- Combining JWT authentication with RBAC and subscription controls.
- Building real-time support workflows using WebSockets.

---

## 📜 License

No license file is currently included in the repository.

This project is intended as a portfolio and educational project.

---

## 👨‍💻 Author

**Kishor A S**

BE Information Science Engineering
Interested in Backend Development, Full-Stack Engineering and AI Integration.
