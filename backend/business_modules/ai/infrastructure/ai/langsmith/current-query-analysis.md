# RAG Chunks Analysis Report - Enhanced

Generated on: 9/12/2025, 11:42:59 AM
Project: eventstorm-1
Service: eventstorm-backend

---

## Query Analysis

**Query:** "and ow is di accessed in aiLangchainAdapter.js..."  
**Timestamp:** 9/12/2025, 9:30:17 AM  
**Expected Chunks:** 11  
**Successfully Reconstructed:** 11

---

## Complete Chunk Details

### Chunk 1/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 52 characters

**Full Content:**
```
const { ChatOpenAI } = require('@langchain/openai');
```

---

### Chunk 2/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 24 characters

**Full Content:**
```
// aiLangchainAdapter.js
```

---

### Chunk 3/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 24 characters

**Full Content:**
```
// aiLangchainAdapter.js
```

---

### Chunk 4/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 42 characters

**Full Content:**
```
class AILangchainAdapter extends IAIPort {
```

---

### Chunk 5/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 42 characters

**Full Content:**
```
class AILangchainAdapter extends IAIPort {
```

---

### Chunk 6/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 50 characters

**Full Content:**
```
// Trigger queue processing if not already running
```

---

### Chunk 7/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 11 characters

**Full Content:**
```
# AI Module
```

---

### Chunk 8/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 52 characters

**Full Content:**
```
const { ChatOpenAI } = require('@langchain/openai');
```

---

### Chunk 9/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 5 characters

**Full Content:**
```
try {
```

---

### Chunk 10/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 0 characters

**Full Content:**
```
No content reconstructed
```

---

### Chunk 11/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 31 characters

**Full Content:**
```
FILE: business_modules/ai/ai.md
```



---

## Enhanced Statistics

### Content Overview
- **Total Chunks:** 11
- **Average Content Length:** 30 characters
- **Total Content Length:** 333 characters

### Source File Distribution
- **Unknown:** 11 chunks

### Document Type Distribution
- **Unknown:** 11 chunks


---

## Reconstruction Quality

- **Chunks with Content:** 10/11 (91%)
- **Chunks with Source:** 0/11 (0%)
- **Chunks with Type:** 0/11 (0%)

---

## Usage Notes

This enhanced report reconstructs fragmented chunk content from Google Cloud Logging.

**To regenerate:**
```bash
node export-rag-chunks-enhanced.js [output-file.md]
```

**To view real-time logging:**
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="eventstorm-backend" AND textPayload:"📋 CHUNK CONTENT LOGGING"' --project=eventstorm-1 --limit=10
```
