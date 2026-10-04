                      ┌─────────────────────┐
                      │     Markdown URL    │
                      └──────────┬──────────┘
                                 │
                                 ▼
                      ┌─────────────────────┐
                      │       fetch()       │
                      └──────────┬──────────┘
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