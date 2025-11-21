# EventStorm Context Pipeline Flow

## 🔄 Simple Repository Processing Flow

```
� GitHub Repo Push
          ↓
    ┌──────────────┐
    │ Entry Point  │
    │              │
    │ Router       │
    │ Controller   │ 
    │ Service      │
    │ Adapter      │
    └──────────────┘
          ↓
    ┌──────────────┐
    │ Main Engine  │
    │              │
    │ Context      │
    │ Pipeline     │ ← Core orchestrator
    └──────────────┘
          ↓
      DECISION:
    ┌──────────────┐
    │Same commit?  │ ──Yes──→ ✅ Skip
    └──────────────┘
          │No
          ↓
    ┌──────────────┐
    │Changed files?│ ──Yes──→ 📝 Process Changes
    └──────────────┘
          │No
          ↓
    ┌──────────────┐
    │ New/Major    │
    │ Changes      │
    └──────────────┘
          ↓
      SIZE CHECK:
    ┌──────────────┐
    │Large repo?   │ ──Yes──→ 🏭 Worker Scaling
    └──────────────┘
          │No
          ↓
    ┌──────────────┐
    │ Standard     │
    │ Processing   │
    └──────────────┘
          ↓
    ┌──────────────┐
    │ Load Files   │
    │              │
    │ GitHub API   │
    │ CloudNative  │
    └──────────────┘
          ↓
    ┌──────────────┐
    │ Smart Route  │
    │              │
    │ .js → AST    │
    │ .md → Docs   │
    │ .* → Generic │
    └──────────────┘
          ↓
    ┌──────────────┐
    │ Split & AI   │
    │              │
    │ Chunk Files  │
    │ + Semantic   │
    │ Enhancement  │
    └──────────────┘
          ↓
    ┌──────────────┐
    │ Vector DB    │
    │              │
    │ Store in     │
    │ Pinecone     │
    └──────────────┘
          ↓
    🎉 Ready for RAG
```

## 🎯 Key Components

### **Main Flow**
- **Entry Point:** `contextPipeline.processPushedRepo()`
- **Decision Engine:** Smart commit/change detection
- **Processing:** File type routing & chunking
- **Storage:** Vector embeddings in Pinecone

### **Core Files**
- `contextPipeline.js` - Main orchestrator
- `repoLoader.js` - GitHub API operations  
- `repoProcessor.js` - Document processing
- `cloudNativeRepoLoader.js` - File loading

### **Smart Routing**
```
📄 File Type        🔀 Processor        🧠 Enhancement
──────────────────────────────────────────────────────
.js/.ts files   →   AST Code Splitter   →  Semantic AI
.md/.txt files  →   Docs Processor      →  Semantic AI  
.json (API)     →   Direct Processing  →  Semantic AI
Other files     →   Text Splitter      →  Semantic AI
```

### **Decision Logic**
```
📊 Condition           ⚡ Action              💾 Result
────────────────────────────────────────────────────────
Same commit hash   →   Skip processing    →   Use cached
Files changed      →   Process changes    →   Update vectors
New repository     →   Full processing    →   Complete index
Large repository   →   Use workers        →   Parallel processing
```