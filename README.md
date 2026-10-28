# Halo Mobile: Next.js + TypeScript + PostgreSQL + LangChain RAG

## Run it
1. `cp .env.example .env` and add your `OPENAI_API_KEY` and a long random `JWT_SECRET`
2. `docker compose up -d` (Postgres 16 with pgvector; creates the `users` table)
3. `npm install`
4. `npm run ingest` (chunks `docs/*.md`, embeds them with OpenAI, stores them in `doc_chunks`)
5. `npm run dev`, open http://localhost:3000, create an account, ask a question

## How the RAG works (lib/rag.ts, scripts/ingest.ts)
- **Ingest:** RecursiveCharacterTextSplitter (800 chars, 100 overlap) -> OpenAIEmbeddings -> PGVectorStore
- **Query:** embed question -> top-4 similarity search -> prompt with delimited `<context>` -> ChatOpenAI -> answer + sources
- **Auth:** bcrypt password hashes, JWT in an httpOnly cookie (jose), middleware guards /assistant, /api/chat checks the session

## Ideas to extend
Streaming responses, chat history in Postgres, conversational memory / history-aware retriever, admin upload page,
a products table feeding the catalog, LangSmith tracing, evals on a question set, rate limiting.
