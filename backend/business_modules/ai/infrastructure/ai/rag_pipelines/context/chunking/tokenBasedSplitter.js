// TokenBasedSplitter.js
"use strict";

const { getEncoding } = require('js-tiktoken');

/**
 * Token-Based Splitter Utility
 * Fixes the critical issue where character-based limits don't match token-based embeddings
 * Uses OpenAI's tiktoken for accurate token counting and splitting
 */
class TokenBasedSplitter {
  constructor(options = {}) {
    // Token-based limits (much more accurate for embeddings)
    this.maxTokens = options.maxTokens || 1400;        // Max tokens per chunk (safe for most models)
    this.minTokens = options.minTokens || 120;         // Min tokens for meaningful content
    this.overlapTokens = options.overlapTokens || 180; // Token overlap for context
    
    // Use cl100k_base encoding directly (GPT-3.5/4/embeddings compatible)
    try {
      this.encoding = getEncoding('cl100k_base');
      console.log(`[${new Date().toISOString()}] ✅ TOKEN SPLITTER: Initialized with cl100k_base encoding`);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] ❌ TOKEN ENCODING ERROR: ${error.message}`);
      this.encoding = null;
    }
    
    console.log(`[${new Date().toISOString()}] 🎯 TOKEN SPLITTER: Initialized with ${this.maxTokens}/${this.minTokens} tokens, ${this.overlapTokens} overlap`);
  }

  /**
   * Count tokens in text using the specified encoding
   */
  countTokens(text) {
    if (!text || typeof text !== 'string') return 0;
    try {
      const tokens = this.encoding.encode(text);
      return tokens.length;
    } catch (error) {
      console.warn(`[${new Date().toISOString()}] ⚠️ TOKEN COUNT ERROR: ${error.message}, falling back to estimation`);
      // Fallback: rough estimation (1 token ≈ 3.5 characters for English)
      return Math.ceil(text.length / 3.5);
    }
  }

  /**
   * Check if content exceeds token limits
   */
  exceedsTokenLimit(content) {
    const tokenCount = this.countTokens(content);
    return {
      exceeds: tokenCount > this.maxTokens,
      tokenCount,
      characterCount: content.length,
      tokensPerChar: (tokenCount / content.length).toFixed(3)
    };
  }

  /**
   * Check if content is below minimum token threshold
   */
  belowMinimumTokens(content) {
    const tokenCount = this.countTokens(content);
    return {
      belowMin: tokenCount < this.minTokens,
      tokenCount,
      characterCount: content.length
    };
  }

  /**
   * Split text by token boundaries while preserving semantic separators
   */
  splitByTokenBoundaries(text, separators = ['\n\n', '\n', ' ', '']) {
    const chunks = [];
    let remainingText = text;
    let chunkIndex = 0;

    while (remainingText.length > 0) {
      const targetEndTokens = this.maxTokens - this.overlapTokens;
      let chunkText = this.extractTokenLimitedChunk(remainingText, targetEndTokens, separators);
      
      // If we couldn't create a valid chunk, take what we can
      if (!chunkText && remainingText.length > 0) {
        chunkText = this.forceExtractChunk(remainingText, this.maxTokens);
      }

      if (!chunkText) break;

      chunks.push({
        text: chunkText,
        tokens: this.countTokens(chunkText),
        characters: chunkText.length,
        chunkIndex: chunkIndex++
      });

      // Remove processed text, but keep overlap
      const overlapText = this.extractOverlapText(chunkText, this.overlapTokens);
      const processedLength = chunkText.length - overlapText.length;
      remainingText = overlapText + remainingText.substring(processedLength);
      
      // Prevent infinite loops
      if (processedLength <= 0) {
        remainingText = remainingText.substring(Math.max(1, chunkText.length / 2));
      }
    }

    return chunks;
  }

  /**
   * Extract a chunk up to token limit, respecting separators
   */
  extractTokenLimitedChunk(text, maxTokens, separators) {
    // Start with a rough character estimate
    const estimatedChars = Math.floor(maxTokens * 3.5);
    let candidateText = text.substring(0, Math.min(estimatedChars, text.length));
    
    // Refine by actual token count
    let tokenCount = this.countTokens(candidateText);
    
    // Adjust if over limit
    while (tokenCount > maxTokens && candidateText.length > 0) {
      const reductionRatio = maxTokens / tokenCount * 0.9; // 10% safety margin
      const newLength = Math.floor(candidateText.length * reductionRatio);
      candidateText = candidateText.substring(0, newLength);
      tokenCount = this.countTokens(candidateText);
    }
    
    // Adjust if under limit (try to use more space)
    while (tokenCount < maxTokens * 0.95 && candidateText.length < text.length) {
      const expansionRatio = maxTokens / tokenCount * 0.95;
      const newLength = Math.min(
        Math.floor(candidateText.length * expansionRatio),
        text.length
      );
      const expandedText = text.substring(0, newLength);
      const expandedTokenCount = this.countTokens(expandedText);
      
      if (expandedTokenCount <= maxTokens) {
        candidateText = expandedText;
        tokenCount = expandedTokenCount;
      } else {
        break;
      }
    }

    // Find best separator boundary
    return this.findBestSeparatorBoundary(candidateText, separators);
  }

  /**
   * Find the best place to split based on separators
   */
  findBestSeparatorBoundary(text, separators) {
    let bestCut = null;
    for (const separator of separators) {
      if (!separator) continue; // ignore empty string separator
      const lastIndex = text.lastIndexOf(separator);
      if (lastIndex === -1) continue;
      // Skip if separator only appears at absolute end (wouldn't trim)
      if (lastIndex + separator.length >= text.length) continue;
      // Accept if past heuristic threshold and better than existing
      if (lastIndex > text.length * 0.7) {
        if (!bestCut || lastIndex > bestCut.index) {
          bestCut = { index: lastIndex, separator };
        }
      }
    }
    if (bestCut) {
      return text.substring(0, bestCut.index + bestCut.separator.length);
    }
    return text; // fallback
  }

  /**
   * Force extract a chunk when normal extraction fails
   */
  forceExtractChunk(text, maxTokens) {
    // Binary search for max length that fits in token limit
    let left = 1;
    let right = text.length;
    let bestLength = 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const candidate = text.substring(0, mid);
      const tokenCount = this.countTokens(candidate);

      if (tokenCount <= maxTokens) {
        bestLength = mid;
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return text.substring(0, bestLength);
  }

  /**
   * Extract overlap text from the end of a chunk
   */
  extractOverlapText(chunkText, overlapTokens) {
    if (overlapTokens <= 0) return '';

    // Prefer exact token-based overlap to avoid character/token drift
    if (this.encoding) {
      try {
        const allTokens = this.encoding.encode(chunkText);
        if (allTokens.length <= overlapTokens) {
          return chunkText; // whole chunk overlaps (small chunk)
        }
        const overlapTokenSlice = allTokens.slice(-overlapTokens);
        const overlapStr = this.encoding.decode(overlapTokenSlice);
        // Ensure decoded overlap actually matches a suffix (it should, but double check)
        if (chunkText.endsWith(overlapStr)) {
          return overlapStr;
        }
        // If for some reason decode produced something different (rare), fall through to heuristic
      } catch (e) {
        console.warn(`[${new Date().toISOString()}] ⚠️ TOKEN OVERLAP DECODE FAILED: ${e.message}, falling back to word heuristic`);
      }
    }

    // Fallback: previous word-based heuristic (may drift slightly)
    const words = chunkText.split(' ');
    let overlapText = '';
    for (let i = words.length - 1; i >= 0; i--) {
      const candidate = words.slice(i).join(' ');
      const candidateTokens = this.countTokens(candidate);
      if (candidateTokens <= overlapTokens) {
        overlapText = candidate;
      } else {
        break;
      }
    }
    return overlapText;
  }

  /**
   * Validate chunk token counts and provide detailed analysis
   */
  analyzeChunk(content) {
    const tokenCount = this.countTokens(content);
    const characterCount = content.length;
    
    return {
      content,
      tokenCount,
      characterCount,
      tokensPerChar: (tokenCount / characterCount).toFixed(3),
      withinLimits: tokenCount >= this.minTokens && tokenCount <= this.maxTokens,
      tooSmall: tokenCount < this.minTokens,
      tooLarge: tokenCount > this.maxTokens,
      efficiency: (tokenCount / this.maxTokens * 100).toFixed(1) + '%',
      recommended: tokenCount >= this.minTokens * 1.5 && tokenCount <= this.maxTokens * 0.9
    };
  }

  /**
   * Convert character-based measurements to token-based equivalents
   */
  convertCharLimitsToTokens(charLimits) {
    const { maxChars, minChars, overlapChars } = charLimits;
    
    // Use average ratio from sample text analysis
    const avgTokensPerChar = 0.285; // Approximately 1 token per 3.5 characters
    
    return {
      maxTokens: Math.floor(maxChars * avgTokensPerChar),
      minTokens: Math.floor(minChars * avgTokensPerChar),
      overlapTokens: Math.floor(overlapChars * avgTokensPerChar),
      conversionRatio: avgTokensPerChar
    };
  }

  /**
   * Get optimal token limits for different content types
   */
  static getOptimalTokenLimits(contentType) {
    const limits = {
      code: {
        maxTokens: 1200,    // Code needs more context
        minTokens: 150,     // Meaningful code units
        overlapTokens: 200  // More overlap for code continuity
      },
      markdown: {
        maxTokens: 1400,    // Documentation can be longer
        minTokens: 120,     // Paragraph minimum
        overlapTokens: 180  // Section overlap
      },
      openapi: {
        maxTokens: 1000,    // API definitions are dense
        minTokens: 100,     // Operation minimum
        overlapTokens: 150  // Schema continuity
      },
      config: {
        maxTokens: 800,     // Configs are usually compact
        minTokens: 80,      // Key-value minimum
        overlapTokens: 120  // Configuration context
      },
      generic: {
        maxTokens: 1400,    // Standard document size
        minTokens: 120,     // Meaningful content
        overlapTokens: 180  // Standard overlap
      }
    };

    return limits[contentType] || limits.generic;
  }

  /**
   * Create a token-optimized RecursiveCharacterTextSplitter equivalent
   */
  createTokenOptimizedSplitter(contentType = 'generic') {
    const limits = TokenBasedSplitter.getOptimalTokenLimits(contentType);
    const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
    
    // Convert token limits to approximate character limits for langchain
    const avgCharsPerToken = 3.5;
    
    return new RecursiveCharacterTextSplitter({
      chunkSize: limits.maxTokens * avgCharsPerToken,
      chunkOverlap: limits.overlapTokens * avgCharsPerToken,
      separators: this.getContentTypeSeparators(contentType),
      keepSeparator: true
    });
  }

  /**
   * Get appropriate separators for content type
   */
  getContentTypeSeparators(contentType) {
    const separators = {
      code: [
        '\nclass ',      // Class boundaries
        '\nfunction ',   // Function boundaries
        '\nconst ',      // Variable declarations
        '\n\n',         // Empty lines
        '\n',           // Line breaks
        ' ',            // Word breaks
        ''              // Character breaks
      ],
      markdown: [
        '\n## ',        // Headers
        '\n### ',       // Subheaders
        '\n\n',         // Paragraphs
        '\n',           // Lines
        '. ',           // Sentences
        ' ',            // Words
        ''              // Characters
      ],
      openapi: [
        '",\n  "',      // JSON properties
        '\n    ',       // Indentation levels
        '\n\n',         // Sections
        '\n',           // Lines
        ' ',            // Words
        ''              // Characters
      ],
      config: [
        '\n\n',         // Major sections
        '\n',           // Lines
        ': ',           // Key-value separators
        ' ',            // Words
        ''              // Characters
      ]
    };

    return separators[contentType] || separators.generic || ['\n\n', '\n', ' ', ''];
  }

  /**
   * Cleanup method to free encoding resources
   */
  cleanup() {
    if (this.encoding && this.encoding.free) {
      this.encoding.free();
    }
  }
}

module.exports = TokenBasedSplitter;
