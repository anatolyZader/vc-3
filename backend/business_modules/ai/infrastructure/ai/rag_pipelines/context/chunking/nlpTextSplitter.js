// nlpTextSplitter.js
"use strict";

// Split strategy (modern best practice)

// Structure-first: split docs by markdown AST nodes (H1/H2/H3, fenced code blocks, tables).

// Linguistic pass: inside each section, split to sentences/paragraphs (retext or sbd).

// Semantic merge: embed sentences, then merge adjacent sentences until:

// cosine drop between sentences exceeds threshold (topic shift), or

// token budget (tiktoken) would be exceeded—then back off to previous safe boundary.

// Heuristics: prefer to end chunks on paragraph or heading boundaries; keep lists/code blocks intact.

// 1. Embedding-driven merges emulate human topic grouping

// When humans read a document, we intuitively partition it into “topics” or “subtopics” based on semantic continuity. We stop or start a section when the subject shifts or when a block feels cohesive. Embeddings help us approximate that computationally:

// An embedding is a vector (dense, fixed-length) that captures semantic meaning of text (sentence or paragraph) in a continuous space. Similar meanings → nearby vectors.

// By embedding consecutive sentences (or small units) and computing cosine similarity between adjacent embeddings, you can detect when semantic continuity drops. A sharp drop suggests a topic boundary.

// You then merge sentences into chunks as long as similarity remains high (i.e. within a topic), and split where similarity falls below a threshold. This tends to approximate how a human would “cut” into meaningful sections.

const { unified } = require("unified");
const remarkParse = require("remark-parse").default || require("remark-parse");
const { visit } = require("unist-util-visit");
const sbd = require("sbd");
const { getEncoding } = require("js-tiktoken");
const { pipeline } = require("@xenova/transformers"); // ONNX, no native deps

// ---- Config ----
const MODEL_ID = "Xenova/all-MiniLM-L6-v2"; // 384-d sentence embeddings
const MAX_TOKENS = 900;          // tune to your embedder/LLM window
const MIN_TOKENS = 120;
const OVERLAP_TOKENS = 120;
const COSINE_BREAK = 0.62;        // topic-shift threshold; tune per corpus

// Lazy singletons
let embedder, enc;

async function getEmbedder() {
  if (!embedder) embedder = await pipeline("feature-extraction", MODEL_ID);
  return embedder;
}
function getEncoder() {
  if (!enc) enc = getEncoding("cl100k_base");
  return enc;
}

function countTokens(text) {
  const e = getEncoder();
  const n = e.encode(text).length;
  return Math.max(1, n);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

function extractMarkdownSections(markdown) {
  const processor = unified().use(remarkParse);
  const tree = processor.parse(markdown);
  const sections = [];
  let cur = { title: "", nodes: [] };

  visit(tree, (node) => {
    if (node.type === "heading" && node.depth <= 3) {
      if (cur.nodes.length) sections.push(cur);
      cur = { title: node.children.map(c => c.value || "").join(" "), nodes: [] };
    } else {
      cur.nodes.push(node);
    }
  });
  if (cur.nodes.length) sections.push(cur);

  // Render section text (naive string join; consider remark-stringify if needed)
  return sections.map(s => ({
    title: s.title,
    text: s.nodes.map(n => (n.value || (n.children?.map(c => c.value || "").join(" ") || ""))).join("\n").trim()
  })).filter(s => s.text);
}

async function semanticChunkSection(title, text) {
  // Sentence split (swap with retext pipeline if you prefer)
  const sentences = sbd.sentences(text, { newline_boundaries: true, html_boundaries: true });
  if (sentences.length === 0) return [];

  // Embed
  const emb = await (await getEmbedder())(sentences, { pooling: "mean", normalize: true });
  const vectors = Array.isArray(emb.data[0]) ? emb.data : [emb.data]; // normalize shape

  // Merge by similarity + token budget
  const chunks = [];
  let buf = [], bufTokens = 0, prevVec = null;

  const flush = () => {
    if (!buf.length) return;
    const pageContent = buf.join(" ").trim();
    if (!pageContent) { buf = []; bufTokens = 0; return; }
    chunks.push({
      pageContent,
      metadata: {
        title,
        charCount: pageContent.length,
        tokenCount: bufTokens,
      }
    });
    buf = [];
    bufTokens = 0;
  };

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const tks = countTokens(s);

    const sim = (prevVec && vectors[i]) ? cosine(prevVec, vectors[i]) : 1.0;
    const topicBreak = sim < COSINE_BREAK;

    const wouldOverflow = (bufTokens + tks) > MAX_TOKENS;
    const shouldFlush =
      (topicBreak && bufTokens >= MIN_TOKENS) || wouldOverflow;

    if (shouldFlush) {
      // soft overlap by backtracking tokens from the buffer’s tail
      flush();
    }

    buf.push(s);
    bufTokens += tks;
    prevVec = vectors[i];

    // hard cap chunk
    if (bufTokens >= MAX_TOKENS) flush();
  }
  flush();

  // add overlap windows if needed
  if (OVERLAP_TOKENS > 0 && chunks.length > 1) {
    for (let i = 1; i < chunks.length; i++) {
      const prev = chunks[i - 1].pageContent;
      const tail = prev.split(/\s+/).slice(-OVERLAP_TOKENS).join(" ");
      chunks[i].pageContent = `${tail}\n${chunks[i].pageContent}`.trim();
    }
  }

  return chunks;
}

async function split(markdownOrPlain, options = {}) {
  const sections = extractMarkdownSections(markdownOrPlain); // works for plain text too
  const out = [];
  for (const s of sections.length ? sections : [{ title: "", text: markdownOrPlain }]) {
    const parts = await semanticChunkSection(s.title, s.text);
    parts.forEach(p => {
      p.metadata = {
        ...p.metadata,
        splitter: "nlpTextSplitter@semantic+structure",
        heading: s.title || null,
        ...options.extraMeta
      };
    });
    out.push(...parts);
  }
  return out;
}

module.exports = { split };
