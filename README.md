# Halo Mobile: Next.js + TypeScript + PostgreSQL + LangChain RAG

A full-stack smartphone company website with user accounts and an AI support assistant that answers questions from the company's own documents (RAG: Retrieval-Augmented Generation).

Built with **Next.js 14 (App Router) + TypeScript + Node.js + PostgreSQL (pgvector)**, using the **OpenAI API** and **LangChain.js** for the assistant.

---

## Table of contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [How the RAG assistant works](#how-the-rag-assistant-works)
5. [Project structure](#project-structure)
6. [Getting started](#getting-started)
7. [Environment variables](#environment-variables)
8. [Scripts](#scripts)
9. [API reference](#api-reference)
10. [Authentication and security](#authentication-and-security)
11. [Database](#database)
12. [Customizing the assistant](#customizing-the-assistant)
13. [Using a free local model (Ollama)](#using-a-free-local-model-ollama)
14. [Troubleshooting](#troubleshooting)
15. [Roadmap](#roadmap)
16. [Deployment notes](#deployment-notes)
17. [Concepts demonstrated](#concepts-demonstrated)

---

## Features

- Marketing site with a landing page and product catalog
- Email and password registration and sign-in
- Sessions via signed JWT in an httpOnly cookie
- Protected `/assistant` page (redirects to `/login` when signed out)
- RAG chat assistant that answers only from your documents, says "I don't know" when the answer isn't there, and cites the source files it used
- Document ingestion pipeline: load, chunk, embed, store in Postgres
- Vector search inside PostgreSQL using the `pgvector` extension, so no separate vector database is needed
- Docker Compose setup for the database

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend and server | Next.js 14 (App Router), React 18, TypeScript |
| API | Next.js route handlers (Node runtime) |
| Database | PostgreSQL 16 with the `pgvector` extension |
| DB driver | `pg` |
| Auth | `bcryptjs` (password hashing), `jose` (JWT) |
| Validation | `zod` |
| LLM orchestration | LangChain.js (`@langchain/core`, `@langchain/openai`, `@langchain/community`, `@langchain/textsplitters`) |
| Models | OpenAI `gpt-4o-mini` (chat), `text-embedding-3-small` (embeddings) |
| Tooling | `tsx` (runs the ingest script), Docker Compose |

---

## Architecture

```
                         ┌──────────────────────────────┐
  Browser                │        Next.js server        │
 ┌────────────┐  HTTPS   │                              │
 │ Landing    │─────────▶│  middleware.ts (JWT check)   │
 │ Login      │          │        │                     │
 │ /assistant │─────────▶│  /api/auth/*   ──▶ lib/auth  │──┐
 └────────────┘  fetch   │  /api/chat     ──▶ lib/rag   │  │
                         └───────────────┬──────────────┘  │
                                         │                 │
                      ┌──────────────────┼─────────────┐   │
                      ▼                  ▼             ▼   ▼
               OpenAI Embeddings    OpenAI Chat    PostgreSQL + pgvector
               (question → vector)  (gpt-4o-mini)  ├─ users
                                                   └─ doc_chunks (text + embedding)
```

Two flows share the database:

- **Offline (ingest):** `docs/*.md` → split into chunks → embedded → saved in `doc_chunks`
- **Online (chat):** question → embedded → nearest chunks retrieved → LLM answers using only those chunks

---

## How the RAG assistant works

### 1. Ingestion (`scripts/ingest.ts`)

1. Reads every `.md` and `.txt` file in `docs/`.
2. Wraps each file as a LangChain `Document` with `metadata.source = filename`.
3. Splits documents with `RecursiveCharacterTextSplitter` (`chunkSize: 800`, `chunkOverlap: 100`). Overlap keeps sentences that straddle a boundary retrievable.
4. Truncates `doc_chunks` so re-running ingest never creates duplicates.
5. Embeds all chunks with `OpenAIEmbeddings` and stores them via `PGVectorStore`. LangChain creates the `doc_chunks` table on first use.

### 2. Question answering (`lib/rag.ts`)

1. Opens the vector store and embeds the user's question.
2. Runs `similaritySearch(question, 4)` to get the 4 closest chunks.
3. Builds a context string where each chunk is labelled with its source file.
4. Sends context and question through an LCEL chain: `prompt | ChatOpenAI | StringOutputParser`.
5. Returns `{ text, sources }` so the UI can show which files were used.

### 3. The prompt

The prompt uses techniques from the *ChatGPT Prompt Engineering for Developers* course:

- **Delimiters:** context is wrapped in `<context>` tags so the model can tell instructions from data (this also reduces prompt injection risk from document text).
- **Constrained scope:** "Answer ONLY using the context."
- **Fallback behavior:** if the answer is missing, say so and suggest contacting support instead of guessing.
- **Output format:** concise, with source file names cited in square brackets.
- **`temperature: 0`** for consistent, factual answers.

---

## Project structure

```
halo-mobile/
├── app/
│   ├── layout.tsx              # Root layout, header, sign in/out button
│   ├── LogoutButton.tsx        # Client component, calls /api/auth/logout
│   ├── page.tsx                # Landing page and product cards
│   ├── globals.css             # All styling (plain CSS, no framework)
│   ├── login/page.tsx          # Combined sign-in / register form
│   ├── assistant/page.tsx      # Chat UI (client component)
│   └── api/
│       ├── auth/
│       │   ├── register/route.ts
│       │   ├── login/route.ts
│       │   └── logout/route.ts
│       └── chat/route.ts       # Authenticated RAG endpoint
├── lib/
│   ├── db.ts                   # Shared pg connection pool
│   ├── auth.ts                 # createSession() / getSession() with JWT cookies
│   └── rag.ts                  # Embeddings, vector store, prompt, chain, answer()
├── scripts/
│   └── ingest.ts               # Document ingestion pipeline
├── docs/                       # Knowledge base the assistant answers from
│   ├── halo-x1-specs.md
│   ├── warranty-and-returns.md
│   └── troubleshooting.md
├── db/
│   └── init.sql                # Creates pgvector extension and users table
├── middleware.ts               # Guards /assistant
├── docker-compose.yml          # Postgres 16 + pgvector
├── .env.example
├── next.config.mjs
├── tsconfig.json
└── package.json
```

---

## Getting started

### Prerequisites

- Node.js 18.17 or newer (tested on Node 22)
- Docker Desktop
- An OpenAI API key **with billing credits** (see [Troubleshooting](#troubleshooting))

### Setup

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Create your env file
cp .env.example .env          # Windows PowerShell: copy .env.example .env
# then edit .env and add your OPENAI_API_KEY and a long random JWT_SECRET

# 3. Start PostgreSQL (with pgvector)
docker compose up -d

# 4. Embed the documents in docs/
npm run ingest

# 5. Start the app
npm run dev
```

Open http://localhost:3000, click **Sign in**, create an account, then open **Ask Halo**.

Try these questions:

- "How long is the warranty?"
- "What's the battery size on the X1?"
- "My phone won't charge, what should I do?"
- "What's the capital of France?" (should refuse, since it isn't in the docs)

### Generating a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Port note (important on Windows)

If you already have PostgreSQL installed natively, it occupies port 5432 and your app will hit it instead of Docker, producing `password authentication failed for user "halo"`. Map Docker to a different host port:

`docker-compose.yml`
```yaml
ports: ["5433:5432"]
```

`.env`
```
DATABASE_URL=postgresql://halo:halo@localhost:5433/halo
```

Then recreate the container: `docker compose down -v && docker compose up -d`.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Postgres connection string, e.g. `postgresql://halo:halo@localhost:5433/halo` |
| `OPENAI_API_KEY` | Yes | Your OpenAI API key. The account needs credits. |
| `JWT_SECRET` | Yes | Long random string used to sign session tokens. Never commit it. |

The `ingest` script loads `.env` through `dotenv`. Next.js loads it automatically for the app.

---

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run ingest` | Re-read `docs/`, re-embed, and replace everything in `doc_chunks` |

Run `npm run ingest` every time you add or edit a file in `docs/`.

---

## API reference

All bodies are JSON.

### `POST /api/auth/register`

Request: `{ "email": "a@b.com", "password": "at-least-8-chars" }`

| Status | Meaning |
| --- | --- |
| 200 | Account created, session cookie set |
| 400 | Invalid email or password shorter than 8 characters |
| 409 | Email already registered |

### `POST /api/auth/login`

Request: `{ "email": "a@b.com", "password": "..." }`

| Status | Meaning |
| --- | --- |
| 200 | Session cookie set |
| 401 | Wrong email or password |

### `POST /api/auth/logout`

Clears the session cookie. Always returns 200.

### `POST /api/chat` (requires session)

Request: `{ "question": "How long is the warranty?" }` (1 to 500 characters)

Response:
```json
{
  "text": "Halo phones include a 24-month limited warranty... [warranty-and-returns.md]",
  "sources": ["warranty-and-returns.md"]
}
```

| Status | Meaning |
| --- | --- |
| 200 | Answer returned |
| 400 | Empty or too-long question |
| 401 | Not signed in |
| 500 | OpenAI or database failure (details are logged server-side only) |

---

## Authentication and security

- **Passwords** are hashed with bcrypt (cost factor 12). Plain passwords are never stored or logged.
- **Sessions** are HS256-signed JWTs valid for 7 days, stored in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production), so client-side JavaScript cannot read them.
- **Two layers of protection:** `middleware.ts` redirects signed-out visitors away from `/assistant`, and `/api/chat` independently verifies the session. Middleware alone is never treated as sufficient.
- **Input validation:** `zod` on registration, length checks on chat questions.
- **SQL injection:** all queries are parameterized (`$1`, `$2`).
- **Login errors** are deliberately generic ("Email or password is incorrect") so attackers can't tell which emails exist.
- **Prompt injection:** retrieved text is delimited and the model is instructed to treat it as data, which reduces but doesn't eliminate the risk. Only ingest documents you trust.

### Known gaps (good next steps)

- No rate limiting on login or chat, so a user could burn through your OpenAI credits. Add one before any public deployment.
- No email verification or password reset.
- The pinned `next@14.2.15` shows a security deprecation notice during install. Upgrade to the latest patched 14.2.x release, or newer, before deploying: `npm install next@latest --legacy-peer-deps` (check the release notes if you move to a new major version).
- Run `npm audit` and review the findings. Avoid `npm audit fix --force` without reading what it changes.

---

## Database

`db/init.sql` runs once, the first time the Docker volume is created:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

`doc_chunks` is created by LangChain's `PGVectorStore` the first time you run ingest. It holds the chunk text, a JSON `metadata` column (including `source`), and a 1536-dimension `vector` column (the size of `text-embedding-3-small`).

Useful commands:

```bash
# open a SQL shell
docker exec -it halo-mobile-db-1 psql -U halo -d halo

# inside psql
\dt                                   -- list tables
SELECT count(*) FROM doc_chunks;      -- how many chunks were ingested
SELECT metadata->>'source', left(content, 80) FROM doc_chunks LIMIT 5;
SELECT id, email, created_at FROM users;
```

Reset everything (deletes all data): `docker compose down -v && docker compose up -d`

---

## Customizing the assistant

| I want to... | Change this |
| --- | --- |
| Add knowledge | Put `.md` or `.txt` files in `docs/`, then `npm run ingest` |
| Change tone or rules | Edit the system message in `lib/rag.ts` |
| Retrieve more context | Raise the `4` in `similaritySearch(question, 4)` |
| Change chunking | Edit `chunkSize` and `chunkOverlap` in `scripts/ingest.ts`, then re-ingest |
| Use a stronger model | Change `model` in `ChatOpenAI` (for example `gpt-4o`) |
| Change embedding model | Edit `OpenAIEmbeddings`. The vector size must match the table, so re-create `doc_chunks` and re-ingest. |
| Support PDFs | Add a loader such as `PDFLoader` from `@langchain/community` in the ingest script |

---

## Using a free local model (Ollama)

If you don't want to pay for OpenAI while developing:

```bash
ollama pull nomic-embed-text
ollama pull llama3.2
npm install @langchain/ollama --legacy-peer-deps
```

In `lib/rag.ts`:

```ts
import { ChatOllama, OllamaEmbeddings } from "@langchain/ollama";

export const embeddings = new OllamaEmbeddings({ model: "nomic-embed-text" });
const llm = new ChatOllama({ model: "llama3.2", temperature: 0 });
```

Drop the `@langchain/openai` import, drop and re-create `doc_chunks` (the embedding dimension differs from OpenAI's), and run `npm run ingest`. Switching back later also requires re-ingesting, because embeddings from different models can't be mixed.

---

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| `password authentication failed for user "halo"` | Another Postgres is on port 5432, or the Docker volume was created with different credentials. Use port 5433 (see [Port note](#port-note-important-on-windows)) and run `docker compose down -v`. |
| `429 ... credit_balance_exhausted` / `insufficient_quota` | The OpenAI account has no credits. Add billing at platform.openai.com, confirm the key belongs to that organization, or use [Ollama](#using-a-free-local-model-ollama). |
| `npm install` peer dependency errors | Use `npm install --legacy-peer-deps`. |
| `relation "doc_chunks" does not exist` when chatting | You haven't run `npm run ingest` yet. |
| Assistant says it doesn't know something that is in the docs | Re-run ingest after editing docs. Try raising `k`, shrinking `chunkSize`, or phrasing the question closer to the document's wording. |
| Redirected to `/login` after signing in | `JWT_SECRET` is missing from `.env`, or you restarted the server with a different secret. Sign in again after fixing. |
| `.env` changes ignored | Restart `npm run dev`. Also check the file is named exactly `.env` (Windows can hide a `.txt` extension). |
| `vector type not found` / extension errors | You aren't using the `pgvector/pgvector` image, or the init script didn't run. Recreate the volume with `docker compose down -v`. |
| Ingest exits with no output | Usually a swallowed API error. Check your key and credits, and run `npm run ingest` again. |

---

## Roadmap

- [ ] Streaming responses (LangChain `.stream()` plus a streaming route handler)
- [ ] Conversation memory and a history-aware retriever so follow-up questions work ("what about the Pro?")
- [ ] Store chat history per user in Postgres
- [ ] Admin page to upload documents and trigger ingestion
- [ ] Products table in Postgres feeding the catalog and the assistant
- [ ] Rate limiting and per-user usage caps
- [ ] Re-ranking and hybrid (keyword + vector) search
- [ ] Evaluation set of question and expected-answer pairs to measure retrieval quality
- [ ] LangSmith tracing for debugging chains
- [ ] Tests (Vitest for `lib/`, Playwright for the auth flow)
- [ ] Docker image and CI pipeline

---

## Deployment notes

- Host the app on a Node-capable platform (Vercel, Railway, Render, Fly.io). The `pg` and LangChain packages need the Node runtime, not Edge.
- Use a managed Postgres that supports `pgvector` (Neon, Supabase, Railway, and RDS all do). Run `db/init.sql` against it, then `npm run ingest` with `DATABASE_URL` pointing at it.
- Set `DATABASE_URL`, `OPENAI_API_KEY`, and `JWT_SECRET` as platform environment variables. Never commit `.env`.
- Add rate limiting and a spending cap on your OpenAI account before making the site public.
- Add an HNSW or IVFFlat index on the vector column once you have thousands of chunks.

---

## Concepts demonstrated

Useful when explaining the project in a portfolio or interview:

- **RAG end to end:** chunking, embeddings, vector similarity search, grounded generation, source citation
- **Prompt engineering:** delimiters, scoped instructions, refusal and fallback behavior, deterministic output
- **LangChain.js:** document model, text splitters, embeddings, vector stores, prompt templates, LCEL chains, output parsers
- **Vector search in a relational database** with pgvector instead of a separate service
- **Full-stack TypeScript:** App Router, server and client components, route handlers, middleware
- **Authentication done by hand:** password hashing, JWT, httpOnly cookies, defense in depth
- **Operational realities:** environment config, Docker, port conflicts, API quotas, error handling

---

## License

Add a license of your choice (MIT is common for portfolio projects).
