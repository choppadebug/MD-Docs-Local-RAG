import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

const llm = new ChatOpenAI({
  model: process.env.CHAT_MODEL,
  apiKey: process.env.LM_STUDIO_API_KEY,
  temperature: 0,
  configuration: {
    baseURL: process.env.LM_STUDIO_BASE_URL,
  },
});

const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL,
  apiKey: process.env.LM_STUDIO_API_KEY,
  configuration: {
    baseURL: process.env.LM_STUDIO_BASE_URL,
  },
});

// User supplies a MD URL like https://raw.githubusercontent.com/some/project/main/README.md
async function fetchMarkdown(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Markdown: ${response.status} ${response.statusText}`
    );
  }

  return await response.text();
}

import { MarkdownTextSplitter } from "@langchain/textsplitters";

async function splitMarkdown(markdown, source) {
  const splitter = new MarkdownTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });

  return await splitter.createDocuments(
    [markdown],
    [{ source }]
  );
}

// Chunks into embeddings and stores them in a vector store for retrieval, triggers calls like: POST http://localhost:1234/v1/embeddings to LM Studio.
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

async function buildVectorStore(documents, embeddings) {
  return await MemoryVectorStore.fromDocuments(
    documents,
    embeddings
  );
}

const rl = createInterface({ input, output });


async function answerQuestion(question, retriever, llm) {
  const docs = await retriever.invoke(question);
  //console.log("retriever:", retriever);

  const context = docs
    .map(
      (doc, index) =>
        `[Source ${index + 1}]\n${doc.pageContent}`
    )
    .join("\n\n---\n\n");

  const response = await llm.invoke([
    [
      "system",
      `You are a documentation assistant.

        Answer questions only using the supplied documentation context.

        If the answer cannot be determined from the context, say that the documentation does not provide enough information.

        Cite the relevant retrieved sections using [Source 1], [Source 2], etc.

        Do not invent commands, APIs, configuration options, or behavior.`,
    ],
    [
        "human",
        `QUESTION:
        ${question}

        DOCUMENTATION CONTEXT:
        ${context}`,
    ],
  ]);

  return {
    answer: response.content,
    sources: docs,
  };
}

import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";


async function main() {
  console.log("\nLocal Markdown RAG Assistant");
  console.log("============================\n");

  const url = await rl.question(
    "Enter the RAW URL of a Markdown document:\n> "
  );

  console.log("\nDownloading document...");
  const markdown = await fetchMarkdown(url);

  console.log("Splitting document...");
  const documents = await splitMarkdown(markdown, url);

  console.log(`Created ${documents.length} chunks.`);

  console.log("Generating embeddings...");
  const vectorStore =
    await MemoryVectorStore.fromDocuments(
      documents,
      embeddings
    );

  const retriever = vectorStore.asRetriever(4);

  console.log("\nDocument indexed.");
  console.log("Ask questions below. Type 'exit' to quit.\n");

  while (true) {
    const question = await rl.question("You > ");

    if (
      question.trim().toLowerCase() === "exit"
    ) {
      break;
    }

    if (!question.trim()) {
      continue;
    }

    try {
      const { answer, sources } =
        await answerQuestion(question, retriever, llm);

      console.log(`\nAssistant > ${answer}\n`);

      console.log("Retrieved chunks:");

      sources.forEach((doc, index) => {
        const preview =
          doc.pageContent
            .replace(/\s+/g, " ")
            .slice(0, 160);

        console.log(
          `  [Source ${index + 1}] ${preview}...`
        );
      });

      console.log();
    } catch (error) {
      console.error("\nError:", error.message, "\n");
    }
  }

  rl.close();
}


main().catch((error) => {
  console.error(error);
  process.exit(1);
});