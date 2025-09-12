# RAG Chunks Analysis Report - Enhanced

Generated on: 9/10/2025, 5:51:40 PM
Project: eventstorm-1
Service: eventstorm-backend

---

## Query Analysis

**Query:** "how do files which are pure js / isolated from fastify framework (e.g.. adapter files) use event dis..."  
**Timestamp:** 9/10/2025, 5:15:48 PM  
**Expected Chunks:** 11  
**Successfully Reconstructed:** 11

---

## Complete Chunk Details

### Chunk 1/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 1 characters

**Full Content:**
```
}
```

---

### Chunk 2/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 58 characters

**Full Content:**
```
# Backend Application - Root Files & Plugins Documentation
```

---

### Chunk 3/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 67 characters

**Full Content:**
```
if (await fastify.diContainer.hasRegistration('eventDispatcher')) {
```

---

### Chunk 4/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 67 characters

**Full Content:**
```
if (await fastify.diContainer.hasRegistration('eventDispatcher')) {
```

---

### Chunk 5/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 1 characters

**Full Content:**
```
}
```

---

### Chunk 6/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 0 characters

**Full Content:**
```
No content reconstructed
```

---

### Chunk 7/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 34 characters

**Full Content:**
```
await fastify.register(autoload, {
```

---

### Chunk 8/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 0 characters

**Full Content:**
```
No content reconstructed
```

---

### Chunk 9/11

**Source:** `Unknown`  
**Type:** Unknown  
**Score:** N/A  
**Content Length:** 0 characters

**Full Content:**
```
No content reconstructed
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
**Content Length:** 0 characters

**Full Content:**
```
No content reconstructed
```



---

## Enhanced Statistics

### Content Overview
- **Total Chunks:** 11
- **Average Content Length:** 21 characters
- **Total Content Length:** 228 characters

### Source File Distribution
- **Unknown:** 11 chunks

### Document Type Distribution
- **Unknown:** 11 chunks


---

## Reconstruction Quality

- **Chunks with Content:** 6/11 (55%)
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
