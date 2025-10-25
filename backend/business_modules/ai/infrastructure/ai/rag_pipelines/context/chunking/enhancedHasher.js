/**
 * Enhanced Hashing Utilities for Chunk Processing
 * 
 * Features:
 * - xxhash64 for fast exact deduplication (replaces deprecated SHA-1)
 * - SimHash for efficient near-duplicate detection
 * - Normalized text preprocessing for consistent hashing
 * - Length-aware hashing for collision prevention
 * 
 * Performance: ~10x faster than SHA-1, crypto-secure alternatives available
 */

const crypto = require('crypto');

class EnhancedHasher {
  constructor(options = {}) {
    this.defaultAlgo = options.defaultAlgo || 'xxhash64';
    this.useSimHash = options.useSimHash || true;
    this.shingleSize = options.shingleSize || 3; // For SimHash n-grams
    
    // Try to import xxhash, fallback to BLAKE3, then crypto
    this.hasher = this.initializeHasher();
  }

  /**
   * Initialize the best available hasher
   */
  initializeHasher() {
    try {
      // Try xxhash64 first (fastest - requires native compilation)
      const xxhash = require('xxhash-addon');
      console.log(`[${new Date().toISOString()}] 🚀 HASHER: Using xxhash64 (fast, non-crypto)`);
      return {
        type: 'xxhash64',
        hash: (data) => xxhash.hash64(Buffer.from(data), 0).toString(16)
      };
    } catch (e) {
      try {
        // Try BLAKE3 (crypto-secure, fast - requires native compilation)
        const { hash } = require('blake3');
        console.log(`[${new Date().toISOString()}] 🔐 HASHER: Using BLAKE3 (crypto-secure, fast)`);
        return {
          type: 'blake3',
          hash: (data) => hash(data).toString('hex').substring(0, 16) // Truncate for performance
        };
      } catch (e2) {
        // Fallback to Node.js crypto (slower but always available)
        console.log(`[${new Date().toISOString()}] ⚠️ HASHER: Using SHA-256 fallback`);
        console.log(`[${new Date().toISOString()}] 💡 PERFORMANCE: Install build-essential and try: npm install xxhash-addon blake3`);
        return {
          type: 'sha256',
          hash: (data) => crypto.createHash('sha256').update(data).digest('hex').substring(0, 16)
        };
      }
    }
  }

  /**
   * Normalize text for consistent hashing
   * Removes variations that shouldn't affect deduplication
   */
  normalizeText(content) {
    return content
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      // Remove trailing whitespace per line
      .replace(/ +$/gm, '')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      // Remove empty lines at start/end
      .trim();
  }

  /**
   * Generate exact deduplication hash
   * Format: "algo:length:hash"
   */
  exactHash(content) {
    const normalized = this.normalizeText(content);
    const contentLength = normalized.length;
    const hash = this.hasher.hash(normalized);
    
    return `${this.hasher.type}:${contentLength}:${hash}`;
  }

  /**
   * Parse hash string back to components
   */
  parseHash(hashString) {
    const parts = hashString.split(':');
    if (parts.length !== 3) {
      throw new Error(`Invalid hash format: ${hashString}`);
    }
    
    return {
      algorithm: parts[0],
      length: parseInt(parts[1]),
      hash: parts[2]
    };
  }

  /**
   * Generate SimHash for near-duplicate detection
   * Uses token shingles for semantic similarity
   */
  simHash(content, shingleSize = this.shingleSize) {
    if (!this.useSimHash) return null;
    
    const normalized = this.normalizeText(content);
    const tokens = this.tokenize(normalized);
    const shingles = this.generateShingles(tokens, shingleSize);
    
    // SimHash algorithm: hash each shingle and accumulate bit vectors
    const hashBits = 64; // 64-bit SimHash
    const accumulator = new Array(hashBits).fill(0);
    
    for (const shingle of shingles) {
      const shingleHash = this.hasher.hash(shingle);
      const hashNumber = parseInt(shingleHash.substring(0, 16), 16);
      
      // Add/subtract bits based on hash
      for (let i = 0; i < hashBits; i++) {
        const bit = (hashNumber >>> i) & 1;
        accumulator[i] += bit ? 1 : -1;
      }
    }
    
    // Convert accumulator to final hash
    let simhash = 0n;
    for (let i = 0; i < hashBits; i++) {
      if (accumulator[i] > 0) {
        simhash |= (1n << BigInt(i));
      }
    }
    
    return simhash.toString(16);
  }

  /**
   * Calculate Hamming distance between two SimHashes
   * Lower distance = more similar content
   */
  hammingDistance(simhash1, simhash2) {
    if (!simhash1 || !simhash2) return null;
    
    const hash1 = BigInt('0x' + simhash1);
    const hash2 = BigInt('0x' + simhash2);
    const xor = hash1 ^ hash2;
    
    // Count set bits (Hamming distance)
    let distance = 0;
    let temp = xor;
    while (temp > 0) {
      distance += Number(temp & 1n);
      temp >>= 1n;
    }
    
    return distance;
  }

  /**
   * Check if two SimHashes indicate near-duplicates
   * threshold: max Hamming distance for near-duplicates (default: 6 for 64-bit)
   */
  areNearDuplicates(simhash1, simhash2, threshold = 6) {
    const distance = this.hammingDistance(simhash1, simhash2);
    return distance !== null && distance <= threshold;
  }

  /**
   * Tokenize text for shingle generation
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2); // Remove short tokens
  }

  /**
   * Generate n-gram shingles from tokens
   */
  generateShingles(tokens, size) {
    const shingles = [];
    
    for (let i = 0; i <= tokens.length - size; i++) {
      const shingle = tokens.slice(i, i + size).join(' ');
      shingles.push(shingle);
    }
    
    return shingles;
  }

  /**
   * Generate MinHash signature for alternative near-duplicate detection
   * Useful for very large documents or when SimHash isn't suitable
   */
  minHash(content, numHashes = 128) {
    const shingles = this.generateShingles(this.tokenize(content), this.shingleSize);
    const signatures = [];
    
    for (let i = 0; i < numHashes; i++) {
      let minHash = Infinity;
      
      for (const shingle of shingles) {
        const hash = parseInt(this.hasher.hash(shingle + i), 16);
        minHash = Math.min(minHash, hash);
      }
      
      signatures.push(minHash);
    }
    
    return signatures;
  }

  /**
   * Calculate Jaccard similarity from MinHash signatures
   */
  jaccardSimilarity(minHash1, minHash2) {
    if (minHash1.length !== minHash2.length) {
      throw new Error('MinHash signatures must have the same length');
    }
    
    let matches = 0;
    for (let i = 0; i < minHash1.length; i++) {
      if (minHash1[i] === minHash2[i]) {
        matches++;
      }
    }
    
    return matches / minHash1.length;
  }

  /**
   * Comprehensive hash package for a chunk
   */
  hashChunk(content, options = {}) {
    const startTime = Date.now();
    
    const result = {
      // Exact deduplication hash
      content_hash: this.exactHash(content),
      
      // Hash metadata
      hash_algorithm: this.hasher.type,
      content_length: this.normalizeText(content).length,
      
      // Performance tracking
      hash_time_ms: null
    };
    
    // Optional near-duplicate hashes
    if (options.includeSimHash && this.useSimHash) {
      result.simhash = this.simHash(content);
    }
    
    if (options.includeMinHash) {
      result.minhash = this.minHash(content, options.minHashSize || 64);
    }
    
    result.hash_time_ms = Date.now() - startTime;
    
    return result;
  }
}

// Backwards compatibility
class RobustHash {
  constructor() {
    console.warn('RobustHash is deprecated. Use EnhancedHasher for better performance.');
    this.hasher = new EnhancedHasher();
  }
  
  sha1Hash(content) {
    // Legacy method - redirect to modern hasher
    return this.hasher.exactHash(content);
  }
}

module.exports = {
  EnhancedHasher,
  RobustHash // Legacy compatibility
};