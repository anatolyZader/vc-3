/**
 * TextPreprocessor - Advanced preprocessing for text/documentation files
 * Handles markdown normalization, structure enhancement, and content cleaning
 */
class TextPreprocessor {
  constructor() {
    this.supportedTypes = new Set(['md', 'markdown', 'txt', 'rst', 'adoc']);
  }

  /**
   * Main preprocessing entry point for text files
   */
  async preprocessTextFile(content, filePath, metadata = {}) {
    const fileExtension = this.getFileExtension(filePath);
    
    // 1. Normalize content and encoding
    let processedContent = this.normalizeContent(content);
    
    // 2. Process based on file type
    if (fileExtension === 'md' || fileExtension === 'markdown') {
      processedContent = this.processMarkdown(processedContent);
    } else {
      processedContent = this.processPlainText(processedContent);
    }
    
    // 3. Extract and enhance metadata
    const enhancedMetadata = await this.extractTextMetadata(processedContent, filePath, metadata);
    
    return {
      content: processedContent,
      metadata: enhancedMetadata,
      preprocessingApplied: {
        normalization: true,
        structureEnhancement: true,
        metadataExtraction: true
      }
    };
  }

  /**
   * 1. Content Normalization
   */
  normalizeContent(content) {
    return content
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove null bytes and control characters
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
      // Normalize Unicode
      .normalize('NFC')
      // Remove excessive whitespace but preserve structure
      .replace(/[ \t]+$/gm, '') // Remove trailing whitespace
      .replace(/\n{4,}/g, '\n\n\n'); // Limit to max 3 consecutive newlines
  }

  /**
   * 2. Markdown Processing
   */
  processMarkdown(content) {
    let processed = content;

    // Enhance headers with semantic markers
    processed = this.enhanceMarkdownHeaders(processed);
    
    // Clean up lists and preserve structure
    processed = this.enhanceMarkdownLists(processed);
    
    // Process code blocks for better chunking
    processed = this.enhanceCodeBlocks(processed);
    
    // Clean up links and references
    processed = this.cleanupMarkdownLinks(processed);
    
    return processed;
  }

  enhanceMarkdownHeaders(content) {
    const lines = content.split('\n');
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Add semantic boundaries for better chunking
      if (trimmed.match(/^#{1,6}\s+/)) {
        const level = trimmed.match(/^(#{1,6})/)[1].length;
        
        // Add section boundaries
        if (level <= 2) {
          processedLines.push(`\n<!-- === SECTION BOUNDARY (H${level}) === -->`);
        }
        
        processedLines.push(line);
        
        // Add content type hints
        if (trimmed.toLowerCase().includes('api') || trimmed.toLowerCase().includes('endpoint')) {
          processedLines.push('<!-- CONTENT_TYPE: API_DOCUMENTATION -->');
        } else if (trimmed.toLowerCase().includes('example') || trimmed.toLowerCase().includes('usage')) {
          processedLines.push('<!-- CONTENT_TYPE: EXAMPLE -->');
        } else if (trimmed.toLowerCase().includes('install') || trimmed.toLowerCase().includes('setup')) {
          processedLines.push('<!-- CONTENT_TYPE: INSTALLATION -->');
        }
      } else {
        processedLines.push(line);
      }
    }

    return processedLines.join('\n');
  }

  enhanceMarkdownLists(content) {
    const lines = content.split('\n');
    const processedLines = [];
    let inList = false;
    let listLevel = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect list items
      const listMatch = trimmed.match(/^(\s*)([-*+]|\d+\.)\s+(.+)/);
      
      if (listMatch) {
        const [, indent, marker, content] = listMatch;
        const currentLevel = Math.floor(indent.length / 2);
        
        if (!inList) {
          processedLines.push('<!-- === LIST SECTION === -->');
          inList = true;
        }
        
        // Normalize list markers and preserve hierarchy
        const normalizedMarker = marker.match(/\d+\./) ? '1.' : '-';
        processedLines.push(`${'  '.repeat(currentLevel)}${normalizedMarker} ${content}`);
        listLevel = currentLevel;
        
      } else if (inList && trimmed === '') {
        // Empty line in list - keep for structure
        processedLines.push(line);
      } else {
        if (inList) {
          inList = false;
          listLevel = 0;
        }
        processedLines.push(line);
      }
    }

    return processedLines.join('\n');
  }

  enhanceCodeBlocks(content) {
    // Add language hints and boundaries for code blocks
    return content.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (match, lang, code) => {
        const language = lang || 'unknown';
        return `\n<!-- === CODE BLOCK (${language.toUpperCase()}) === -->\n\`\`\`${language}\n${code.trim()}\n\`\`\`\n<!-- === END CODE BLOCK === -->\n`;
      }
    );
  }

  cleanupMarkdownLinks(content) {
    // Normalize links and extract reference info
    return content
      // Convert reference-style links to inline for better context
      .replace(/\[([^\]]+)\]\[([^\]]+)\]/g, '[$1](ref:$2)')
      // Clean up excessive link formatting
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
        // Keep meaningful link text, clean URLs
        if (url.startsWith('http')) {
          return `[${text}](${url})`;
        }
        return `[${text}](${url})`;
      });
  }

  /**
   * 3. Plain Text Processing
   */
  processPlainText(content) {
    // Add paragraph boundaries for better chunking
    const paragraphs = content.split(/\n\s*\n/);
    const processedParagraphs = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim();
      
      if (paragraph) {
        // Add paragraph boundaries
        if (paragraph.length > 200) {
          processedParagraphs.push('<!-- === PARAGRAPH BOUNDARY === -->');
        }
        
        processedParagraphs.push(paragraph);
      }
    }

    return processedParagraphs.join('\n\n');
  }

  /**
   * 4. Extract Enhanced Metadata
   */
  async extractTextMetadata(content, filePath, baseMetadata) {
    const fileExtension = this.getFileExtension(filePath);
    const fileName = filePath.split('/').pop();
    
    // Basic metrics
    const lines = content.split('\n');
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim());
    const words = content.split(/\s+/).filter(w => w.trim()).length;
    
    // Extract structure for markdown
    const structure = fileExtension === 'md' ? this.extractMarkdownStructure(content) : {};
    
    // Extract key topics and entities
    const topics = this.extractTopics(content);
    const codeBlocks = this.extractCodeBlockLanguages(content);
    
    return {
      ...baseMetadata,
      // File info
      file_name: fileName,
      file_extension: fileExtension,
      file_type: 'documentation',
      document_type: fileExtension === 'md' ? 'markdown' : 'text',
      
      // Content metrics
      total_lines: lines.length,
      paragraph_count: paragraphs.length,
      word_count: words,
      reading_time_minutes: Math.ceil(words / 200), // Average reading speed
      
      // Structure (for markdown)
      ...structure,
      
      // Content analysis
      main_topics: topics.slice(0, 10),
      code_languages: codeBlocks,
      
      // For better retrieval
      content_type: this.detectContentType(content),
      audience_level: this.detectAudienceLevel(content),
      
      // Processing info
      preprocessed: true,
      preprocessing_version: '1.0',
      preprocessed_at: new Date().toISOString()
    };
  }

  extractMarkdownStructure(content) {
    const headers = [];
    const links = [];
    const codeBlocks = [];
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Extract headers
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)/);
      if (headerMatch) {
        headers.push({
          level: headerMatch[1].length,
          text: headerMatch[2]
        });
      }
      
      // Extract links
      const linkMatches = trimmed.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g);
      for (const match of linkMatches) {
        links.push({
          text: match[1],
          url: match[2]
        });
      }
    }
    
    // Extract code blocks
    const codeBlockMatches = content.matchAll(/```(\w+)?\n([\s\S]*?)```/g);
    for (const match of codeBlockMatches) {
      codeBlocks.push({
        language: match[1] || 'unknown',
        lines: match[2].split('\n').length
      });
    }
    
    return {
      header_count: headers.length,
      headers: headers.slice(0, 20), // Top 20 headers
      link_count: links.length,
      external_links: links.filter(l => l.url.startsWith('http')).length,
      code_block_count: codeBlocks.length,
      code_blocks: codeBlocks
    };
  }

  extractTopics(content) {
    // Simple topic extraction based on frequent meaningful words
    const words = content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 3 && 
        !this.isStopWord(word) &&
        !word.match(/^\d+$/)
      );
    
    const wordCount = {};
    for (const word of words) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
    
    return Object.entries(wordCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 15)
      .map(([word]) => word);
  }

  extractCodeBlockLanguages(content) {
    const languages = new Set();
    const matches = content.matchAll(/```(\w+)/g);
    
    for (const match of matches) {
      if (match[1]) {
        languages.add(match[1].toLowerCase());
      }
    }
    
    return Array.from(languages);
  }

  detectContentType(content) {
    const lowercaseContent = content.toLowerCase();
    
    if (lowercaseContent.includes('api') && (lowercaseContent.includes('endpoint') || lowercaseContent.includes('request'))) {
      return 'api_documentation';
    } else if (lowercaseContent.includes('install') || lowercaseContent.includes('setup') || lowercaseContent.includes('getting started')) {
      return 'installation_guide';
    } else if (lowercaseContent.includes('example') || lowercaseContent.includes('tutorial') || lowercaseContent.includes('how to')) {
      return 'tutorial';
    } else if (lowercaseContent.includes('reference') || lowercaseContent.includes('specification')) {
      return 'reference';
    } else {
      return 'general_documentation';
    }
  }

  detectAudienceLevel(content) {
    const technicalTerms = content.match(/\b(api|endpoint|function|class|method|parameter|async|await|promise|callback|json|http|rest|graphql|database|query|schema)\b/gi) || [];
    const basicTerms = content.match(/\b(click|button|menu|page|website|user|simple|easy|basic|start|begin)\b/gi) || [];
    
    const technicalRatio = technicalTerms.length / (content.split(/\s+/).length || 1);
    
    if (technicalRatio > 0.05) {
      return 'advanced';
    } else if (basicTerms.length > technicalTerms.length) {
      return 'beginner';
    } else {
      return 'intermediate';
    }
  }

  isStopWord(word) {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after',
      'above', 'below', 'between', 'among', 'is', 'are', 'was', 'were', 'be',
      'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'can', 'may', 'might', 'must', 'this', 'that', 'these',
      'those', 'they', 'them', 'their', 'there', 'where', 'when', 'why', 'how',
      'what', 'which', 'who', 'whom', 'whose', 'if', 'then', 'else', 'so'
    ]);
    
    return stopWords.has(word);
  }

  getFileExtension(filePath) {
    return filePath.split('.').pop()?.toLowerCase() || '';
  }
}

module.exports = TextPreprocessor;
