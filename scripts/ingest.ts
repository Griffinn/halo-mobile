import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { getVectorStore } from "../lib/rag";

async function main() {
  const dir = path.join(process.cwd(), "docs");
  const docs = fs.readdirSync(dir)
    .filter((f) => f.endsWith(".md") || f.endsWith(".txt"))
    .map((f) => new Document({
      pageContent: fs.readFileSync(path.join(dir, f), "utf8"),
      metadata: { source: f },
    }));

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });
  const chunks = await splitter.splitDocuments(docs);

  const store = await getVectorStore();
  await store.pool.query("TRUNCATE TABLE doc_chunks"); // re-ingest from scratch
  await store.addDocuments(chunks);
  await store.end();
  console.log(`Ingested ${chunks.length} chunks from ${docs.length} files.`);
}
main();
