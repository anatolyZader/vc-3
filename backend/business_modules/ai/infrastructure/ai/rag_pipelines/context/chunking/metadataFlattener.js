/**
 * Metadata Flattener for Vector Store Upsert
 * 
 * Ensures nested UL objects are flattened before upsert to prevent
 * vector stores from silently dropping complex nested metadata
 */

class MetadataFlattener {
  /**
   * Flatten metadata for vector store compatibility
   * Focus on UL fields and core metadata
   * ENFORCES 35KB SIZE LIMIT (Pinecone limit is 40KB, we use safety margin)
   */
  static flattenForStore(metadata) {
    const flat = {
      // Core document fields - ensure strings
      source: String(metadata.source || ''),
      type: String(metadata.type || ''),
      
      // Repository identification - ensure strings for filter compatibility
      repoOwner: String(metadata.repoOwner || ''),
      repoName: String(metadata.repoName || ''),
      repoId: String(metadata.repoId || ''),
      
      // File context - ensure strings
      file_path: String(metadata.file_header?.file_path || metadata.source || ''),
      file_type: String(metadata.file_header?.file_type || 'unknown'),
      language: String(metadata.file_header?.language || ''),
      
      // UL fields - primitives only for Pinecone filter compatibility
      ul_version: String(metadata.ul_version || ''),
      ul_bounded_context: String(metadata.ul_bounded_context || ''),
      ul_terms: Array.isArray(metadata.ul_terms) 
        ? this.capArray(metadata.ul_terms, 20).join(', ') // REDUCED from 32 to 20
        : String(metadata.ul_terms || ''),
      ul_match_count: Number(metadata.ul_match_count || 0),
      
      // Legacy UL compatibility - ensure primitives
      ubiq_business_module: String(metadata.ubiq_business_module || ''),
      ubiq_bounded_context: String(metadata.ubiq_bounded_context || ''),
      ubiq_enhanced: Boolean(metadata.ubiq_enhanced),
      
      // Content categorization - ensure strings
      content_category: String(metadata.content_category || ''),
      complexity_level: String(metadata.complexity_level || ''),
      
      // Performance metadata - ensure numbers
      estimated_tokens: metadata.estimated_tokens ? Number(metadata.estimated_tokens) : 0,
      content_length: metadata.content_length ? Number(metadata.content_length) : 0,
      
      // Hashing - ensure string (TRUNCATE if needed)
      hash_algorithm: this.truncateString(String(metadata.hash_algorithm || ''), 50),
      
      // Quality scoring - ensure number
      quality_score: metadata.quality_score ? Number(metadata.quality_score) : 0,
      
      // Processing timestamps - ensure strings (ISO format)
      processed_at: metadata.processed_at ? String(metadata.processed_at) : '',
      postprocessed_at: metadata.postprocessed_at ? String(metadata.postprocessed_at) : ''
    };
    
    // Remove empty strings and zero values to minimize storage
    const cleaned = Object.fromEntries(
      Object.entries(flat).filter(([_, value]) => {
        if (typeof value === 'string') return value !== '';
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'boolean') return true; // Keep booleans
        return value !== null && value !== undefined;
      })
    );
    
    // ENFORCE SIZE LIMIT - aggressively trim if needed
    return this.enforceMetadataSize(cleaned, 35840); // 35KB limit (5KB safety margin)
  }
  
  /**
   * Enforce metadata size limit by progressively removing non-essential fields
   * Target: 35KB (Pinecone limit is 40KB, we use 5KB safety margin)
   */
  static enforceMetadataSize(metadata, maxBytes) {
    let current = JSON.stringify(metadata);
    let currentSize = Buffer.byteLength(current, 'utf8');
    
    if (currentSize <= maxBytes) {
      return metadata; // Already under limit
    }
    
    console.warn(`[${new Date().toISOString()}] ⚠️ METADATA_TOO_LARGE: ${currentSize} bytes > ${maxBytes} bytes limit. Trimming...`);
    
    // Progressive removal strategy (remove least critical fields first)
    // IMPROVED: More gradual trimming to preserve semantic value
    const trimStrategies = [
      // Level 1: Remove timestamps (saves ~100 bytes)
      () => {
        delete metadata.processed_at;
        delete metadata.postprocessed_at;
      },
      // Level 2: Truncate UL terms to 5000 chars (preserve semantic richness)
      () => {
        if (metadata.ul_terms && typeof metadata.ul_terms === 'string') {
          metadata.ul_terms = this.truncateString(metadata.ul_terms, 5000);
        }
      },
      // Level 3: Remove quality/complexity metadata (saves ~50 bytes)
      () => {
        delete metadata.quality_score;
        delete metadata.complexity_level;
        delete metadata.hash_algorithm;
      },
      // Level 4: Truncate UL terms to 2000 chars (still useful for search)
      () => {
        if (metadata.ul_terms && typeof metadata.ul_terms === 'string') {
          metadata.ul_terms = this.truncateString(metadata.ul_terms, 2000);
        }
      },
      // Level 5: Remove token estimates (saves ~30 bytes)
      () => {
        delete metadata.estimated_tokens;
        delete metadata.content_length;
      },
      // Level 6: Truncate UL terms to 1000 chars (key terms preserved)
      () => {
        if (metadata.ul_terms && typeof metadata.ul_terms === 'string') {
          metadata.ul_terms = this.truncateString(metadata.ul_terms, 1000);
        }
      },
      // Level 7: Truncate source paths moderately
      () => {
        if (metadata.source) {
          metadata.source = this.truncateString(metadata.source, 200);
        }
        if (metadata.file_path) {
          metadata.file_path = this.truncateString(metadata.file_path, 200);
        }
      },
      // Level 8: Truncate UL terms to 500 chars (core terms only)
      () => {
        if (metadata.ul_terms && typeof metadata.ul_terms === 'string') {
          metadata.ul_terms = this.truncateString(metadata.ul_terms, 500);
        }
      },
      // Level 9: Remove UL legacy fields
      () => {
        delete metadata.ubiq_business_module;
        delete metadata.ubiq_bounded_context;
        delete metadata.ubiq_enhanced;
      },
      // Level 10: Truncate UL terms to 200 chars (critical terms)
      () => {
        if (metadata.ul_terms && typeof metadata.ul_terms === 'string') {
          metadata.ul_terms = this.truncateString(metadata.ul_terms, 200);
        }
      },
      // Level 11: Truncate paths more aggressively
      () => {
        if (metadata.source) metadata.source = this.truncateString(metadata.source, 100);
        if (metadata.file_path) metadata.file_path = this.truncateString(metadata.file_path, 100);
      },
      // Level 12: Truncate UL terms to 100 chars (minimal)
      () => {
        if (metadata.ul_terms && typeof metadata.ul_terms === 'string') {
          metadata.ul_terms = this.truncateString(metadata.ul_terms, 100);
        }
      },
      // Level 13: Remove category fields
      () => {
        delete metadata.content_category;
        delete metadata.file_type;
      },
      // Level 14: Truncate repo info
      () => {
        if (metadata.repoId) metadata.repoId = this.truncateString(metadata.repoId, 100);
        if (metadata.repoOwner) metadata.repoOwner = this.truncateString(metadata.repoOwner, 50);
        if (metadata.repoName) metadata.repoName = this.truncateString(metadata.repoName, 50);
        if (metadata.ul_bounded_context) metadata.ul_bounded_context = this.truncateString(metadata.ul_bounded_context, 50);
      },
      // Level 15: Remove UL terms entirely (last resort before emergency)
      () => {
        delete metadata.ul_terms;
        delete metadata.ul_match_count;
      }
    ];
    
    // Apply trim strategies until size is acceptable
    for (const strategy of trimStrategies) {
      if (currentSize <= maxBytes) break;
      
      strategy();
      current = JSON.stringify(metadata);
      currentSize = Buffer.byteLength(current, 'utf8');
    }
    
    // Final check - if STILL too large, use emergency fallback
    if (currentSize > maxBytes) {
      console.error(`[${new Date().toISOString()}] ❌ METADATA_STILL_TOO_LARGE: ${currentSize} bytes after all trimming strategies`);
      console.error(`[${new Date().toISOString()}] 🚨 EMERGENCY: Keeping only essential fields to prevent Pinecone rejection`);
      
      // Keep only absolute essentials - GUARANTEED to be under 40KB
      const emergency = {
        source: this.truncateString(metadata.source || '', 100),
        type: String(metadata.type || '').substring(0, 50),
        repoId: String(metadata.repoId || '').substring(0, 100),
        file_path: this.truncateString(metadata.file_path || '', 100),
        language: String(metadata.language || '').substring(0, 20),
        // Keep critical UL fields but truncate
        ul_bounded_context: String(metadata.ul_bounded_context || '').substring(0, 50),
        ul_terms: this.truncateString(String(metadata.ul_terms || ''), 100)
      };
      
      // Verify emergency metadata is under limit
      const emergencySize = Buffer.byteLength(JSON.stringify(emergency), 'utf8');
      console.log(`[${new Date().toISOString()}] ✅ EMERGENCY_METADATA: ${emergencySize} bytes (essential fields only)`);
      
      return emergency;
    }
    
    console.log(`[${new Date().toISOString()}] ✅ METADATA_TRIMMED: ${currentSize} bytes (was ${Buffer.byteLength(JSON.stringify(metadata), 'utf8')} bytes)`);
    return metadata;
  }
  
  /**
   * Cap array size to prevent storage issues
   */
  static capArray(arr, maxLength) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, maxLength);
  }
  
  /**
   * Safe string truncation
   */
  static truncateString(str, maxLength) {
    if (typeof str !== 'string') return str;
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  }
  
  /**
   * Validate flattened metadata doesn't exceed typical vector store limits
   */
  static validateMetadata(flattened) {
    const issues = [];
    
    // Check for deeply nested objects (should be none after flattening)
    Object.entries(flattened).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        issues.push(`Nested object found: ${key}`);
      }
    });
    
    // Check array sizes
    Object.entries(flattened).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 50) {
        issues.push(`Large array (${value.length}): ${key}`);
      }
    });
    
    // Check total size (rough estimate)
    const jsonSize = JSON.stringify(flattened).length;
    if (jsonSize > 40960) { // 40KB limit (common vector store constraint)
      issues.push(`Metadata too large: ${jsonSize} bytes`);
    }
    
    return {
      valid: issues.length === 0,
      issues,
      size: jsonSize
    };
  }
  
  /**
   * Process and validate metadata for upsert
   * CRITICAL: Always enforces 25KB limit before returning
   * 
   * WHY 25KB? LangChain's PineconeStore adds pageContent as metadata.text:
   * - User metadata: 25KB (this limit)
   * - LangChain adds text field: ~2-10KB (pageContent)
   * - Total sent to Pinecone: 27-35KB (safely under 40KB limit)
   */
  static processForUpsert(metadata) {
    const flattened = this.flattenForStore(metadata);
    
    // CRITICAL FIX: Limit to 25KB to account for LangChain adding pageContent as metadata.text
    // Formula: 25KB (user metadata) + 10KB (text field) + 5KB (safety margin) = 40KB limit
    const trimmed = this.enforceMetadataSize(flattened, 25600); // 25KB limit (15KB safety margin for text field)
    
    const validation = this.validateMetadata(trimmed);
    
    if (!validation.valid) {
      console.warn(`[${new Date().toISOString()}] ⚠️ METADATA_ISSUES:`, validation.issues);
    }
    
    return {
      metadata: trimmed,
      validation
    };
  }
}

module.exports = MetadataFlattener;