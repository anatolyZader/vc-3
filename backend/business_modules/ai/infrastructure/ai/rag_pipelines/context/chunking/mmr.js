/**
 * MMR (Maximal Marginal Relevance) for better retrieval reranking
 * Balances relevance with diversity to prevent redundant results
 */

/**
 * Compute cosine similarity between two vectors
 */
function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator > 1e-10 ? dot / denominator : 0;
}

/**
 * MMR reranking for retrieval results
 * @param {Array} candidates - Array of {embedding, pageContent, metadata, relevance}
 * @param {number} k - Final number of results to return
 * @param {number} lambda - Balance between relevance (1.0) and diversity (0.0), typical: 0.6-0.8
 * @returns {Array} Reranked results optimizing for relevance + diversity
 */
function mmr(candidates, k = 20, lambda = 0.7) {
  if (!candidates || candidates.length === 0) return [];
  if (k <= 0) return [];
  if (candidates.length <= k) return candidates; // No need to rerank if we want everything
  
  // Pre-sort by relevance to seed selection with most relevant item
  const sorted = [...candidates].sort((a, b) => (b.relevance || b.score || 0) - (a.relevance || a.score || 0));
  
  const selected = [sorted[0]];
  const remaining = sorted.slice(1);
  
  while (selected.length < Math.min(k, candidates.length) && remaining.length > 0) {
    let bestCandidate = null;
    let bestScore = -Infinity;
    let bestIndex = -1;
    
    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevanceScore = candidate.relevance || candidate.score || 0;
      
      // Calculate maximum similarity to already selected items (diversity penalty)
      let maxSimilarity = -1;
      for (const selectedItem of selected) {
        if (candidate.embedding && selectedItem.embedding) {
          const similarity = cosine(candidate.embedding, selectedItem.embedding);
          maxSimilarity = Math.max(maxSimilarity, similarity);
        }
      }
      
      // MMR formula: λ * relevance - (1-λ) * max_similarity_to_selected
      const diversityPenalty = maxSimilarity > -1 ? maxSimilarity : 0;
      const mmrScore = lambda * relevanceScore - (1 - lambda) * diversityPenalty;
      
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestCandidate = candidate;
        bestIndex = i;
      }
    }
    
    if (bestCandidate) {
      selected.push(bestCandidate);
      remaining.splice(bestIndex, 1);
    } else {
      break; // No more valid candidates
    }
  }
  
  return selected;
}

/**
 * Apply soft diversity penalties based on source type distribution
 * Better than hard caps - encourages diversity without losing high-relevance items
 */
function applyDiversityPenalties(candidates, sourceField = 'source') {
  const sourceCount = new Map();
  
  return candidates.map(candidate => {
    const source = candidate.metadata?.[sourceField] || 'unknown';
    const count = sourceCount.get(source) || 0;
    sourceCount.set(source, count + 1);
    
    // Soft penalty: first 3 items no penalty, then gradual reduction
    // 1.0, 1.0, 1.0, 0.95, 0.90, 0.85, 0.80... (min 0.7)
    const penalty = Math.max(0.7, 1.0 - Math.max(0, count - 2) * 0.05);
    
    return {
      ...candidate,
      relevance: (candidate.relevance || candidate.score || 0) * penalty,
      diversity_penalty: penalty
    };
  });
}

/**
 * Compute simple text similarity for fallback when embeddings unavailable
 * Uses Jaccard similarity but only for small sets to avoid O(n²) issues
 */
function textSimilarity(text1, text2) {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

module.exports = {
  mmr,
  cosine,
  applyDiversityPenalties,
  textSimilarity
};