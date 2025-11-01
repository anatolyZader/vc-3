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
        ? this.capArray(metadata.ul_terms, 32).join(', ') // Convert array to string
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
      
      // Hashing - ensure string
      hash_algorithm: String(metadata.hash_algorithm || ''),
      
      // Quality scoring - ensure number
      quality_score: metadata.quality_score ? Number(metadata.quality_score) : 0,
      
      // Processing timestamps - ensure strings (ISO format)
      processed_at: metadata.processed_at ? String(metadata.processed_at) : '',
      postprocessed_at: metadata.postprocessed_at ? String(metadata.postprocessed_at) : ''
    };
    
    // Remove empty strings and zero values to minimize storage
    return Object.fromEntries(
      Object.entries(flat).filter(([_, value]) => {
        if (typeof value === 'string') return value !== '';
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'boolean') return true; // Keep booleans
        return value !== null && value !== undefined;
      })
    );
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
   */
  static processForUpsert(metadata) {
    const flattened = this.flattenForStore(metadata);
    const validation = this.validateMetadata(flattened);
    
    if (!validation.valid) {
      console.warn(`[${new Date().toISOString()}] ⚠️ METADATA_ISSUES:`, validation.issues);
    }
    
    return {
      metadata: flattened,
      validation
    };
  }
}

module.exports = MetadataFlattener;