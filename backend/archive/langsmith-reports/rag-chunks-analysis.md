# RAG Chunks Analysis Report

Generated on: 9/10/2025, 5:46:42 PM
Project: eventstorm-1
Service: eventstorm-backend

---

## Query Analysis

**Query:** "how do files which are pure js / isolated from fastify framework (e.g.. adapter files) use event dis..."  
**Timestamp:** 9/10/2025, 5:15:48 PM  
**Expected Chunks:** 11  
**Retrieved Chunks:** 11

---

## Retrieved Chunks

### Chunk 1/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
}
```

---

### Chunk 2/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
# Backend Application - Root Files & Plugins Documentation
```

---

### Chunk 3/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
if (await fastify.diContainer.hasRegistration('eventDispatcher')) {
```

---

### Chunk 4/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
if (await fastify.diContainer.hasRegistration('eventDispatcher')) {
```

---

### Chunk 5/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
}
```

---

### Chunk 6/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```

```

---

### Chunk 7/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
await fastify.register(autoload, {
```

---

### Chunk 8/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
FILE: ROOT_DOCUMENTATION.md
```

---

### Chunk 9/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
FILE: ROOT_DOCUMENTATION.md
```

---

### Chunk 10/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
FILE: ROOT_DOCUMENTATION.md
```

---

### Chunk 11/11

**Source:** ``  
**Type:**   
**Score:** 

**Content:**
```
FILE: ROOT_DOCUMENTATION.md
```



---

## Statistics

### Source File Distribution
- **Unknown:** 11 chunks

### Document Type Distribution
- **Unknown:** 11 chunks


---

## Usage Notes

This report was generated from Google Cloud Logging data for the RAG pipeline.

**To view real-time chunk logging:**
```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="eventstorm-backend" AND textPayload:"📋 CHUNK CONTENT LOGGING"' --project=eventstorm-1 --limit=10
```
