import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function isGitHubUrl(value) {
  return /^https:\/\/github\.com\/[^/]+\/[^/]+\/?$/.test(
    value.trim()
  );
}

export async function resolveRepository(input) {
  const value = input.trim();

  // Local repository path
  if (!isGitHubUrl(value)) {
    return {
      path: path.resolve(value),
      cleanup: async () => {},
    };
  }

  // GitHub repository URL
  const temporaryDirectory = await mkdtemp(
    path.join(os.tmpdir(), "local-docs-rag-")
  );

  const repositoryPath = path.join(
    temporaryDirectory,
    "repository"
  );

  console.log("GitHub URL detected.");
  console.log("Cloning repository...");

  await execFileAsync(
    "git",
    [
      "clone",
      "--depth",
      "1",
      value,
      repositoryPath,
    ]
  );

  return {
    path: repositoryPath,

    cleanup: async () => {
      await rm(temporaryDirectory, {
        recursive: true,
        force: true,
      });
    },
  };
}