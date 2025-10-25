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
      // Core document fields
      source: metadata.source || null,
      type: metadata.type || null,
      
      // Repository identification (fixed format)
      repoOwner: metadata.repoOwner || null,
      repoName: metadata.repoName || null,
      repoId: metadata.repoId || null,
      
      // File context
      file_path: metadata.file_header?.file_path || metadata.source || null,
      file_type: metadata.file_header?.file_type || 'unknown',
      language: metadata.file_header?.language || null,
      
      // UL fields (flattened and capped for performance)
      ul_version: metadata.ul_version || null,
      ul_bounded_context: metadata.ul_bounded_context || null,
      ul_terms: this.capArray(metadata.ul_terms || [], 32), // Cap to prevent size issues
      ul_match_count: metadata.ul_match_count || 0,
      
      // Legacy UL compatibility (select fields only)
      ubiq_business_module: metadata.ubiq_business_module || null,
      ubiq_bounded_context: metadata.ubiq_bounded_context || null,
      ubiq_enhanced: metadata.ubiq_enhanced || false,
      
      // Content categorization  
      content_category: metadata.content_category || null,
      complexity_level: metadata.complexity_level || null,
      
      // Performance metadata
      estimated_tokens: metadata.estimated_tokens || null,
      hash_algorithm: metadata.hash_algorithm || null,
      content_length: metadata.content_length || null,
      
      // Quality scoring
      quality_score: metadata.quality_score || null,
      
      // Processing timestamps
      processed_at: metadata.processed_at || null,
      postprocessed_at: metadata.postprocessed_at || null
    };
    
    // Remove null values to minimize storage
    return Object.fromEntries(
      Object.entries(flat).filter(([_, value]) => value !== null)
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