CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
-- The doc_chunks (vector) table is created by LangChain's PGVectorStore on first ingest.
