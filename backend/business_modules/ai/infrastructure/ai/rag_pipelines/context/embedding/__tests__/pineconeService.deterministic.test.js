// Test: Deterministic Vector ID Generation
// ==========================================
// This test demonstrates that vector IDs are stable and deterministic,
// preventing duplicates on re-indexing.

const PineconeService = require('../pineconeService');

describe('Deterministic Vector IDs', () => {
  
  describe('generateRepositoryDocumentIds', () => {
    
    it('should generate same ID for same content', () => {
      const documents = [
        {
          pageContent: 'function hello() { return "world"; }',
          metadata: { source: 'src/hello.js' }
        }
      ];
      
      const namespace = 'my-repo';
      
      // Generate IDs twice
      const ids1 = PineconeService.generateRepositoryDocumentIds(documents, namespace);
      const ids2 = PineconeService.generateRepositoryDocumentIds(documents, namespace);
      
      // IDs should be identical (deterministic)
      expect(ids1[0]).toBe(ids2[0]);
      expect(ids1[0]).toMatch(/^my-repo:src_hello\.js:[a-f0-9]{16}$/);
    });
    
    it('should generate different IDs for different content', () => {
      const doc1 = {
        pageContent: 'function hello() { return "world"; }',
        metadata: { source: 'src/hello.js' }
      };
      
      const doc2 = {
        pageContent: 'function goodbye() { return "world"; }',
        metadata: { source: 'src/hello.js' }
      };
      
      const namespace = 'my-repo';
      
      const ids1 = PineconeService.generateRepositoryDocumentIds([doc1], namespace);
      const ids2 = PineconeService.generateRepositoryDocumentIds([doc2], namespace);
      
      // Different content should produce different hash
      expect(ids1[0]).not.toBe(ids2[0]);
      
      // But both should have same source prefix
      expect(ids1[0].split(':')[1]).toBe('src_hello.js');
      expect(ids2[0].split(':')[1]).toBe('src_hello.js');
    });
    
    it('should generate different IDs for different sources', () => {
      const doc1 = {
        pageContent: 'function hello() { return "world"; }',
        metadata: { source: 'src/hello.js' }
      };
      
      const doc2 = {
        pageContent: 'function hello() { return "world"; }',
        metadata: { source: 'src/goodbye.js' }
      };
      
      const namespace = 'my-repo';
      
      const ids1 = PineconeService.generateRepositoryDocumentIds([doc1], namespace);
      const ids2 = PineconeService.generateRepositoryDocumentIds([doc2], namespace);
      
      // Different source should produce different ID (even with same content)
      expect(ids1[0]).not.toBe(ids2[0]);
      
      // But both should have same content hash
      const hash1 = ids1[0].split(':')[2];
      const hash2 = ids2[0].split(':')[2];
      expect(hash1).toBe(hash2); // Same content = same hash
    });
    
    it('should store chunk index in metadata, not ID', () => {
      const documents = [
        {
          pageContent: 'chunk 1',
          metadata: { source: 'src/file.js' }
        },
        {
          pageContent: 'chunk 2',
          metadata: { source: 'src/file.js' }
        }
      ];
      
      const namespace = 'my-repo';
      
      const ids = PineconeService.generateRepositoryDocumentIds(documents, namespace);
      
      // IDs should not contain chunk index
      expect(ids[0]).not.toContain('chunk_0');
      expect(ids[1]).not.toContain('chunk_1');
      
      // But metadata should have chunkIndex
      expect(documents[0].metadata.chunkIndex).toBe(0);
      expect(documents[1].metadata.chunkIndex).toBe(1);
    });
    
    it('should use colon separator (not underscore)', () => {
      const documents = [
        {
          pageContent: 'test content',
          metadata: { source: 'src/test.js' }
        }
      ];
      
      const namespace = 'my-repo';
      
      const ids = PineconeService.generateRepositoryDocumentIds(documents, namespace);
      
      // Should use colon separator
      expect(ids[0]).toContain(':');
      
      // Should have exactly 2 colons (namespace:source:hash)
      const colonCount = (ids[0].match(/:/g) || []).length;
      expect(colonCount).toBe(2);
    });
    
    it('should sanitize source path', () => {
      const documents = [
        {
          pageContent: 'test content',
          metadata: { source: 'src/components/Button.js' }
        }
      ];
      
      const namespace = 'my-repo';
      
      const ids = PineconeService.generateRepositoryDocumentIds(documents, namespace);
      
      // Slashes should be replaced with underscores
      expect(ids[0]).toContain('src_components_button.js');
      expect(ids[0]).not.toContain('/');
    });
    
  });
  
  describe('generateUserRepositoryDocumentIds', () => {
    
    it('should generate same ID for same content', () => {
      const documents = [
        {
          pageContent: 'function hello() { return "world"; }',
          metadata: { source: 'src/hello.js' }
        }
      ];
      
      const userId = 'user123';
      const repoId = 'repo456';
      
      // Generate IDs twice
      const ids1 = PineconeService.generateUserRepositoryDocumentIds(documents, userId, repoId);
      const ids2 = PineconeService.generateUserRepositoryDocumentIds(documents, userId, repoId);
      
      // IDs should be identical (deterministic)
      expect(ids1[0]).toBe(ids2[0]);
      expect(ids1[0]).toMatch(/^user123:repo456:src_hello\.js:[a-f0-9]{16}$/);
    });
    
    it('should include userId and repoId in ID', () => {
      const documents = [
        {
          pageContent: 'test content',
          metadata: { source: 'src/test.js' }
        }
      ];
      
      const userId = 'user123';
      const repoId = 'repo456';
      
      const ids = PineconeService.generateUserRepositoryDocumentIds(documents, userId, repoId);
      
      // Should start with userId:repoId
      expect(ids[0]).toMatch(/^user123:repo456:/);
    });
    
  });
  
  describe('Idempotency', () => {
    
    it('should demonstrate idempotent upsert behavior', () => {
      // Simulate re-indexing the same file multiple times
      const doc = {
        pageContent: 'function hello() { return "world"; }',
        metadata: { source: 'src/hello.js' }
      };
      
      const namespace = 'my-repo';
      
      // First index
      const ids1 = PineconeService.generateRepositoryDocumentIds([doc], namespace);
      
      // Re-index (simulating full refresh)
      const ids2 = PineconeService.generateRepositoryDocumentIds([doc], namespace);
      
      // Re-index again
      const ids3 = PineconeService.generateRepositoryDocumentIds([doc], namespace);
      
      // All IDs should be identical
      expect(ids1[0]).toBe(ids2[0]);
      expect(ids2[0]).toBe(ids3[0]);
      
      // This means upsert will overwrite the same ID each time
      // No duplicates created!
    });
    
    it('should handle content changes correctly', () => {
      const originalDoc = {
        pageContent: 'function hello() { return "world"; }',
        metadata: { source: 'src/hello.js' }
      };
      
      const modifiedDoc = {
        pageContent: 'function hello() { return "universe"; }', // Modified
        metadata: { source: 'src/hello.js' }
      };
      
      const namespace = 'my-repo';
      
      // Original ID
      const originalIds = PineconeService.generateRepositoryDocumentIds([originalDoc], namespace);
      
      // Modified ID
      const modifiedIds = PineconeService.generateRepositoryDocumentIds([modifiedDoc], namespace);
      
      // Different content should produce different ID
      expect(originalIds[0]).not.toBe(modifiedIds[0]);
      
      // This means upserting modified content creates a NEW vector
      // Old vector remains until explicitly deleted
      // (This is correct behavior - need explicit cleanup for modified files)
    });
    
  });
  
  describe('Edge Cases', () => {
    
    it('should handle empty content', () => {
      const documents = [
        {
          pageContent: '',
          metadata: { source: 'src/empty.js' }
        }
      ];
      
      const namespace = 'my-repo';
      
      const ids = PineconeService.generateRepositoryDocumentIds(documents, namespace);
      
      // Should still generate valid ID
      expect(ids[0]).toMatch(/^my-repo:src_empty\.js:[a-f0-9]{16}$/);
    });
    
    it('should handle missing source', () => {
      const documents = [
        {
          pageContent: 'test content',
          metadata: {}
        }
      ];
      
      const namespace = 'my-repo';
      
      const ids = PineconeService.generateRepositoryDocumentIds(documents, namespace);
      
      // Should use 'unknown' as source
      expect(ids[0]).toContain(':unknown:');
    });
    
    it('should handle special characters in source', () => {
      const documents = [
        {
          pageContent: 'test content',
          metadata: { source: 'src/@types/index.d.ts' }
        }
      ];
      
      const namespace = 'my-repo';
      
      const ids = PineconeService.generateRepositoryDocumentIds(documents, namespace);
      
      // Special characters should be sanitized
      expect(ids[0]).not.toContain('@');
      expect(ids[0]).not.toContain('/');
    });
    
  });
  
});

// ==========================================
// Example Output
// ==========================================
/*
PASS  pineconeService.deterministic.test.js
  Deterministic Vector IDs
    generateRepositoryDocumentIds
      ✓ should generate same ID for same content (5ms)
      ✓ should generate different IDs for different content (2ms)
      ✓ should generate different IDs for different sources (1ms)
      ✓ should store chunk index in metadata, not ID (1ms)
      ✓ should use colon separator (not underscore) (1ms)
      ✓ should sanitize source path (1ms)
    generateUserRepositoryDocumentIds
      ✓ should generate same ID for same content (1ms)
      ✓ should include userId and repoId in ID (1ms)
    Idempotency
      ✓ should demonstrate idempotent upsert behavior (2ms)
      ✓ should handle content changes correctly (1ms)
    Edge Cases
      ✓ should handle empty content (1ms)
      ✓ should handle missing source (1ms)
      ✓ should handle special characters in source (1ms)

Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
*/
