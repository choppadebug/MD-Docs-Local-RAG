// Find every Markdown file in a repository and convert those files into LangChain documents.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { Document } from "@langchain/core/documents";
import { MarkdownTextSplitter } from "@langchain/textsplitters";


const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  "coverage",
]);


async function findMarkdownFiles(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  const markdownFiles = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const nestedFiles = await findMarkdownFiles(fullPath);
      markdownFiles.push(...nestedFiles);
    }

    if (
      entry.isFile() &&
      entry.name.toLowerCase().endsWith(".md")
    ) {
      markdownFiles.push(fullPath);
    }
  }

  return markdownFiles;
}


function normalizeSourcePath(repositoryRoot, filePath) {
  return path
    .relative(repositoryRoot, filePath)
    .split(path.sep)
    .join("/");
}


export async function loadRepositoryDocuments(repositoryPath) {
  const repositoryRoot = path.resolve(repositoryPath);

  const markdownFiles =
    await findMarkdownFiles(repositoryRoot);

  const splitter = new MarkdownTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 150,
  });

  const documents = [];

  for (const filePath of markdownFiles) {
    const markdown = await readFile(filePath, "utf8");

    if (!markdown.trim()) {
      continue;
    }

    const source =
      normalizeSourcePath(repositoryRoot, filePath);

    const chunks = await splitter.splitText(markdown);

    chunks.forEach((chunk, index) => {
      documents.push(
        new Document({
          pageContent: chunk,

          metadata: {
            source,
            chunk: index + 1,
            totalChunks: chunks.length,
          },
        })
      );
    });
  }

  return {
    documents,
    files: markdownFiles,
  };
}