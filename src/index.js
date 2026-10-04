import "dotenv/config";

import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import {
  ChatOpenAI,
  OpenAIEmbeddings,
} from "@langchain/openai";

import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";

import {
  loadRepositoryDocuments,
} from "./repository.js";

import {
  resolveRepository,
} from "./repository-source.js";


const rl = createInterface({
  input,
  output,
});


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


async function answerQuestion(
  question,
  retriever,
  llm
) {
  const docs =
    await retriever.invoke(question);

  const context = docs
    .map((doc) => {
      const source =
        doc.metadata.source;

      const chunk =
        doc.metadata.chunk;

      return `
SOURCE: ${source}
CHUNK: ${chunk}

${doc.pageContent}
`;
    })
    .join("\n\n---\n\n");


  const response = await llm.invoke([
    [
      "system",
      `You are a documentation assistant for a software repository.

Answer questions only using the supplied repository documentation.

If the answer cannot be determined from the context, say that the documentation does not provide enough information.

Cite the source file using its exact path in square brackets, for example [docs/installation.md].

Do not invent commands, APIs, configuration options, filenames, paths, or behavior.`,
    ],

    [
      "human",
      `QUESTION:
${question}

REPOSITORY DOCUMENTATION:
${context}`,
    ],
  ]);


  return {
    answer: response.content,
    sources: docs,
  };
}


async function main() {
  console.log(
    "\nLocal Repository RAG Assistant"
  );

  console.log(
    "==============================\n"
  );


  // 1. Get repository
  const repositoryInput =
    await rl.question(
      "Enter a local repository path or GitHub URL:\n> "
    );


  const repository =
    await resolveRepository(repositoryInput);


  try {

    // 2. Scan Markdown files
    console.log(
      "\nScanning repository..."
    );


    const {
      documents,
      files,
    } =
      await loadRepositoryDocuments(
        repository.path
      );


    console.log(
      `Found ${files.length} Markdown files.`
    );

    console.log(
      `Created ${documents.length} chunks.`
    );


    // Useful debugging checkpoint
    console.log(
      "\nExample chunk metadata:"
    );

    console.log(
      documents
        .slice(0, 5)
        .map((doc) => doc.metadata)
    );


    if (documents.length === 0) {
      throw new Error(
        "No Markdown documents were found in the repository."
      );
    }


    // 3. Generate embeddings
    console.log(
      "\nGenerating embeddings..."
    );


    const vectorStore =
      await MemoryVectorStore.fromDocuments(
        documents,
        embeddings
      );


    // 4. Create retriever
    const retriever =
      vectorStore.asRetriever(4);


    console.log(
      "\nRepository indexed."
    );

    console.log(
      "Ask questions below. Type 'exit' to quit.\n"
    );


    // 5. Question-answer loop
    while (true) {

      const question =
        await rl.question("You > ");


      if (
        question
          .trim()
          .toLowerCase() === "exit"
      ) {
        break;
      }


      if (!question.trim()) {
        continue;
      }


      try {

        const {
          answer,
          sources,
        } =
          await answerQuestion(
            question,
            retriever,
            llm
          );


        console.log(
          `\nAssistant > ${answer}\n`
        );


        console.log(
          "Retrieved context:"
        );


        sources.forEach((doc) => {

          const source =
            doc.metadata.source;

          const chunk =
            doc.metadata.chunk;

          const totalChunks =
            doc.metadata.totalChunks;


          console.log(
            `- ${source} ` +
            `(chunk ${chunk}/${totalChunks})`
          );
        });


        console.log();

      } catch (error) {

        console.error(
          "\nQuery error:",
          error.message,
          "\n"
        );

      }
    }

  } finally {

    // Deletes temporary clone if input was GitHub URL.
    // Does nothing for a local repository.
    await repository.cleanup();

    rl.close();
  }
}


main().catch((error) => {
  console.error(error);
  process.exit(1);
});