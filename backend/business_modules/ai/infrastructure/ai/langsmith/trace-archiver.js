// trace-archiver.js - Automatic LangSmith trace analysis archiving and rotation
const fs = require('fs').promises;
const path = require('path');

class TraceArchiver {
  constructor() {
    this.langsmithDir = __dirname;
    this.archiveDir = path.join(this.langsmithDir, 'langsmith-archive');
    this.currentTraceFile = path.join(this.langsmithDir, 'latest-trace-analysis.md');
  }

  /**
   * Archive current trace analysis and prepare for new one
   * @param {string} queryText - The query that triggered the new analysis
   * @param {string} timestamp - ISO timestamp for the archive
   */
  async archiveAndPrepare(queryText, timestamp = new Date().toISOString()) {
    try {
      // Check if current trace file exists
      const currentExists = await this.fileExists(this.currentTraceFile);
      
      if (currentExists) {
        // Generate archive filename with timestamp and query summary
        const archiveFilename = this.generateArchiveFilename(queryText, timestamp);
        const archivePath = path.join(this.archiveDir, archiveFilename);
        
        // Read current content
        const currentContent = await fs.readFile(this.currentTraceFile, 'utf8');
        
        // Add archive metadata to the content
        const archivedContent = this.addArchiveMetadata(currentContent, timestamp, queryText);
        
        // Write to archive
        await fs.writeFile(archivePath, archivedContent, 'utf8');
        
        console.log(`[TRACE-ARCHIVER] Archived previous analysis to: ${archiveFilename}`);
      }
      
      // Create new empty trace file with template
      const newTemplate = this.createTraceTemplate(queryText, timestamp);
      await fs.writeFile(this.currentTraceFile, newTemplate, 'utf8');
      
      console.log(`[TRACE-ARCHIVER] Created new trace analysis file for query: "${queryText}"`);
      
      return {
        success: true,
        archivedFile: currentExists ? this.generateArchiveFilename(queryText, timestamp) : null,
        newFile: 'latest-trace-analysis.md'
      };
      
    } catch (error) {
      console.error('[TRACE-ARCHIVER] Error during archive operation:', error);
      throw error;
    }
  }

  /**
   * Generate archive filename with timestamp and query summary
   */
  generateArchiveFilename(queryText, timestamp) {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().slice(0, 19).replace(/:/g, '-');
    
    // Create safe filename from query (first 30 chars, alphanumeric only)
    const querySummary = queryText
      .substring(0, 30)
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    return `trace-${dateStr}-${querySummary || 'query'}.md`;
  }

  /**
   * Add archive metadata to existing content
   */
  addArchiveMetadata(content, timestamp, queryText) {
    const archiveHeader = `---
**ARCHIVED TRACE ANALYSIS**
- Archived on: ${timestamp}
- Triggered by query: "${queryText}"
- Original file: latest-trace-analysis.md
---

`;
    return archiveHeader + content;
  }

  /**
   * Create template for new trace analysis
   */
  createTraceTemplate(queryText, timestamp) {
    return `# RAG Trace Analysis - In Progress

## Query Details
- **Query**: "${queryText}"
- **Analysis Started**: ${timestamp}
- **Status**: 🔄 Processing...

## RAG Pipeline Execution Flow
⏳ Waiting for trace data...

## Retrieved Documents Analysis
📊 Analysis will be populated when trace completes...

## Performance Metrics
📈 Metrics will be calculated after execution...

## Conclusion
✨ Analysis will be completed automatically...

---
**Analysis Status**: In Progress  
**LangSmith Project**: eventstorm-trace  
**Auto-Generated**: ${timestamp}
`;
  }

  /**
   * Update the current trace file with new analysis data
   */
  async updateTraceAnalysis(analysisData) {
    try {
      await fs.writeFile(this.currentTraceFile, analysisData, 'utf8');
      console.log('[TRACE-ARCHIVER] Updated trace analysis with new data');
      return { success: true };
    } catch (error) {
      console.error('[TRACE-ARCHIVER] Error updating trace analysis:', error);
      throw error;
    }
  }

  /**
   * List all archived trace files
   */
  async listArchives() {
    try {
      const files = await fs.readdir(this.archiveDir);
      const traceFiles = files
        .filter(file => file.startsWith('trace-') && file.endsWith('.md'))
        .sort()
        .reverse(); // Most recent first
      
      return traceFiles;
    } catch (error) {
      console.error('[TRACE-ARCHIVER] Error listing archives:', error);
      return [];
    }
  }

  /**
   * Clean up old archives (keep only last N files)
   */
  async cleanupArchives(keepCount = 20) {
    try {
      const archives = await this.listArchives();
      
      if (archives.length > keepCount) {
        const toDelete = archives.slice(keepCount);
        
        for (const file of toDelete) {
          await fs.unlink(path.join(this.archiveDir, file));
          console.log(`[TRACE-ARCHIVER] Deleted old archive: ${file}`);
        }
        
        return { deleted: toDelete.length };
      }
      
      return { deleted: 0 };
    } catch (error) {
      console.error('[TRACE-ARCHIVER] Error during cleanup:', error);
      throw error;
    }
  }

  /**
   * Utility: Check if file exists
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = TraceArchiver;

// Example usage:
if (require.main === module) {
  const archiver = new TraceArchiver();
  
  // Test the archiver
  archiver.archiveAndPrepare("test query about business modules", new Date().toISOString())
    .then(result => {
      console.log('Archive operation result:', result);
      return archiver.listArchives();
    })
    .then(archives => {
      console.log('Current archives:', archives);
    })
    .catch(console.error);
}
