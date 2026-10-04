node ./src/index.js

                      ┌─────────────────────┐
                      │     Repo URL        │
                      └──────────┬──────────┘
                                 │
                                 │
                    ┌────────────┴───────────┐
                    │                        │
            local folder                GitHub URL
                    │                        │
                    │                    git clone
                    │                       │
                    └───────────┬───────────┘
                                ▼
                    ┌───────────────────────┐
                    │ local repository path │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │loadRepositoryDocuments()│
                    └────────────┬────────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │ MarkdownTextSplitter│
                      └──────────┬──────────┘
                                 │
                               chunks
                                 │
                                 ▼
               ┌─────────────────────────────────┐
               │ LM Studio embedding model      │
               │ POST /v1/embeddings            │
               └───────────────┬─────────────────┘
                               │
                             vectors
                               │
                               ▼
                      ┌─────────────────────┐
                      │ MemoryVectorStore   │
                      └──────────┬──────────┘
                                 │
                          similarity search
                                 │
             user question ──────┤
                                 ▼
                      relevant chunks
                                 │
                                 ▼
               ┌─────────────────────────────────┐
               │ LM Studio chat model            │
               │ /v1/chat/completions            │
               └───────────────┬─────────────────┘
                               │
                               ▼
                      grounded answer