import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";
import { PGVectorStore } from "@langchain/community/vectorstores/pgvector";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

export const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

export function getVectorStore() {
  return PGVectorStore.initialize(embeddings, {
    postgresConnectionOptions: { connectionString: process.env.DATABASE_URL },
    tableName: "doc_chunks",
  });
}

// Prompt engineering (Andrew Ng's guidelines): clear delimiters, explicit rules, a fallback instruction.
const prompt = ChatPromptTemplate.fromMessages([
  ["system",
    `You are Halo's support assistant for a smartphone company.
Answer ONLY using the context between <context> tags.
If the answer is not in the context, say you don't know and suggest contacting support.
Be concise. Cite the source file names you used in square brackets, e.g. [halo-x1-specs.md].`],
  ["human", "<context>\n{context}\n</context>\n\nQuestion: {question}"],
]);

const llm = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 });
const chain = prompt.pipe(llm).pipe(new StringOutputParser());

export async function answer(question: string) {
  const store = await getVectorStore();
  try {
    const docs = await store.similaritySearch(question, 4);
    const context = docs
      .map((d) => `[${d.metadata.source}]\n${d.pageContent}`)
      .join("\n\n---\n\n");
    const text = await chain.invoke({ context: context || "(no documents found)", question });
    return { text, sources: [...new Set(docs.map((d) => d.metadata.source as string))] };
  } finally {
    await store.end();
  }
}
