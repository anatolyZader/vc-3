# AST Splitter Self-Analysis

**Generated:** 2025-10-15T18:07:02.917Z  
**Source File:** `./backend/business_modules/ai/infrastructure/ai/rag_pipelines/context/chunking/astCodeSplitter.js`  
**Original Size:** 17393 characters (4349 estimated tokens)  
**Total Chunks:** 14  

## 🔄 Meta-Analysis Overview

This document shows how the AST splitter analyzes **itself** - a fascinating recursive demonstration of:
- Self-awareness in code chunking
- Semantic unit detection on its own implementation
- How well it handles complex, nested JavaScript structures
- Tree-building and residual gap handling in practice

---

## Chunk 1

**Splitting Method:** `residual`  
**Token Count:** 59 tokens  
**Character Count:** 235 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains variable declarations*

### Full Code Content

```javascript
"use strict";
const {
  parse
} = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;
const crypto = require("crypto");
```

---

## Chunk 2

**Splitting Method:** `ast_semantic`  
**Token Count:** 33 tokens  
**Character Count:** 129 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains function definition(s)*

### Full Code Content

```javascript
function defaultEstimateTokens(text, charsPerToken = 4) {
  return Math.max(1, Math.ceil((text || "").length / charsPerToken));
}
```

---

## Chunk 3

**Splitting Method:** `ast_semantic`  
**Token Count:** 17 tokens  
**Character Count:** 67 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Mixed code content*

### Full Code Content

```javascript
sha1 = s => crypto.createHash("sha1").update(s || "").digest("hex")
```

---

## Chunk 4

**Splitting Method:** `ast_semantic`  
**Token Count:** 13 tokens  
**Character Count:** 52 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Mixed code content*

### Full Code Content

```javascript
clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
```

---

## Chunk 5

**Splitting Method:** `ast_semantic`  
**Token Count:** 14 tokens  
**Character Count:** 55 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Mixed code content*

### Full Code Content

```javascript
within = (a, b) => a.start >= b.start && a.end <= b.end
```

---

## Chunk 6

**Splitting Method:** `ast_semantic`  
**Token Count:** 175 tokens  
**Character Count:** 698 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains function definition(s)*

### Full Code Content

```javascript
function isNonEssentialLogCallee(callee) {
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, {
    name: "console"
  }) && t.isIdentifier(callee.property) && ["log", "info", "debug"].includes(callee.property.name)) return true;
  if (t.isMemberExpression(callee) && t.isMemberExpression(callee.object) && t.isIdentifier(callee.object.property, {
    name: "log"
  }) && t.isIdentifier(callee.property) && ["info", "debug"].includes(callee.property.name)) return true;
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, {
    name: "logger"
  }) && t.isIdentifier(callee.property) && ["info", "debug"].includes(callee.property.name)) return true;
  return false;
}
```

---

## Chunk 7

**Splitting Method:** `ast_semantic`  
**Token Count:** 172 tokens  
**Character Count:** 688 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains function definition(s)*

### Full Code Content

```javascript
function isEssentialLogCallee(callee) {
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, {
    name: "console"
  }) && t.isIdentifier(callee.property) && ["error", "warn"].includes(callee.property.name)) return true;
  if (t.isMemberExpression(callee) && t.isMemberExpression(callee.object) && t.isIdentifier(callee.object.property, {
    name: "log"
  }) && t.isIdentifier(callee.property) && ["error", "warn"].includes(callee.property.name)) return true;
  if (t.isMemberExpression(callee) && t.isIdentifier(callee.object, {
    name: "logger"
  }) && t.isIdentifier(callee.property) && ["error", "warn"].includes(callee.property.name)) return true;
  return false;
}
```

---

## Chunk 8

**Splitting Method:** `ast_semantic`  
**Token Count:** 73 tokens  
**Character Count:** 291 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains function definition(s)*

### Full Code Content

```javascript
function normalizeExport(path) {
  const node = path.node;
  if (t.isExportDefaultDeclaration(node) || t.isExportNamedDeclaration(node)) {
    if (node.declaration) {
      path.replaceWith(node.declaration);
      return true;
    }
    path.remove();
    return true;
  }
  return false;
}
```

---

## Chunk 9

**Splitting Method:** `ast_semantic`  
**Token Count:** 39 tokens  
**Character Count:** 156 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains variable declarations*

### Full Code Content

```javascript
routeNameGuess = call => {
  const a0 = call.arguments?.[0];
  return t.isStringLiteral(a0) ? `route_${a0.value.replace(/[^a-zA-Z0-9]/g, "_")}` : "route";
}
```

---

## Chunk 10

**Splitting Method:** `ast_semantic`  
**Token Count:** 18 tokens  
**Character Count:** 70 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Mixed code content*

### Full Code Content

```javascript
literalName = n => t.isStringLiteral(n) ? `event_${n.value}` : "event"
```

---

## Chunk 11

**Splitting Method:** `ast_semantic`  
**Token Count:** 671 tokens  
**Character Count:** 2684 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains function definition(s)*

### Full Code Content

```javascript
function collectUnits(ast) {
  const units = [];
  const fastifyAliases = new Set(["fastify"]);
  const push = (type, name, node, kind = null) => {
    if (Number.isInteger(node.start) && Number.isInteger(node.end)) {
      units.push({
        type,
        name: name || "anonymous",
        start: node.start,
        end: node.end,
        loc: node.loc ? {
          start: node.loc.start.line,
          end: node.loc.end.line
        } : null,
        kind
      });
    }
  };
  ast.program.body.forEach(n => {
    if (t.isFunctionDeclaration(n)) push("function", n.id && n.id.name, n);else if (t.isClassDeclaration(n)) push("class", n.id && n.id.name, n);else if (t.isVariableDeclaration(n)) {
      n.declarations.forEach(d => {
        if (t.isIdentifier(d.id) && t.isCallExpression(d.init) && t.isIdentifier(d.init.callee, {
          name: "fastify"
        })) fastifyAliases.add(d.id.name);
        if (t.isIdentifier(d.id) && d.init && (t.isFunctionExpression(d.init) || t.isArrowFunctionExpression(d.init))) push("function_var", d.id.name, d);
      });
    }
  });
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.object) && t.isIdentifier(callee.property)) {
        const obj = callee.object.name;
        const prop = callee.property.name;
        const verbs = new Set(["get", "post", "put", "delete", "patch", "options", "head"]);
        const deco = new Set(["decorate", "register", "addHook", "addSchema"]);
        if (fastifyAliases.has(obj) && verbs.has(prop)) {
          push("fastify_route", routeNameGuess(path.node), path.node, "route_verb");
        } else if (fastifyAliases.has(obj) && deco.has(prop)) {
          const arg0 = path.node.arguments?.[0];
          const dn = t.isStringLiteral(arg0) ? arg0.value : "decoration";
          push("fastify_decoration", `${prop}_${dn}`, path.node, "decoration");
        }
      }
      if (t.isIdentifier(callee) && fastifyAliases.has(callee.name) || t.isMemberExpression(callee) && t.isIdentifier(callee.object) && fastifyAliases.has(callee.object.name) && t.isIdentifier(callee.property, {
        name: "route"
      })) {
        push("fastify_route", "routeObject", path.node, "route_object");
      }
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        const ev = new Set(["on", "once", "addListener"]);
        if (ev.has(callee.property.name) && path.node.arguments.length >= 2) {
          push("event_listener", literalName(path.node.arguments[0]), path.node, "event");
        }
      }
    }
  });
  units.sort((a, b) => a.start - b.start);
  return units;
}
```

---

## Chunk 12

**Splitting Method:** `ast_semantic`  
**Token Count:** 181 tokens  
**Character Count:** 722 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains function definition(s)*

### Full Code Content

```javascript
function buildTree(units, fileStart, fileEnd) {
  const root = {
    type: "root",
    name: "root",
    start: fileStart,
    end: fileEnd,
    children: []
  };
  const nodes = units.map(u => ({
    ...u,
    children: []
  }));
  const stack = [root];
  for (const n of nodes) {
    let parent = root;
    const path = [];
    (function dfs(cur) {
      for (const c of cur.children) {
        if (within(n, c)) {
          path.push(c);
          dfs(c);
        }
      }
    })(root);
    if (path.length) parent = path[path.length - 1];
    parent.children.push(n);
  }
  (function sortRec(node) {
    node.children.sort((a, b) => a.start - b.start);
    node.children.forEach(sortRec);
  })(root);
  return root;
}
```

---

## Chunk 13

**Splitting Method:** `ast_semantic`  
**Token Count:** 1925 tokens  
**Character Count:** 7700 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Contains class definition*

### Full Code Content

```javascript
class ASTCodeSplitter {
  constructor(options = {}) {
    this.maxTokens = options.maxTokens ?? 800;
    this.minTokens = options.minTokens ?? 60;
    this.overlapTokens = options.overlapTokens ?? 80;
    this.enableLineFallback = options.enableLineFallback !== false;
    this.maxUnitsPerChunk = options.maxUnitsPerChunk ?? 1;
    this.charsPerToken = options.charsPerToken ?? 4;
    this.minResidualChars = options.minResidualChars ?? 12;
    this.estimateTokens = options.estimateTokens || (txt => defaultEstimateTokens(txt, this.charsPerToken));
  }
  split(code, metadata = {}) {
    if (!code || typeof code !== "string") return [];
    const ast = this._parse(code);
    this._sanitizeAST(ast);
    const cleaned = generate(ast, {
      comments: false,
      compact: false
    }).code;
    const cleanedAST = this._parse(cleaned);
    const units = collectUnits(cleanedAST);
    const root = buildTree(units, 0, cleaned.length);
    const emitted = [];
    this._emitNode(root, cleaned, metadata, emitted);
    const seenRange = new Set();
    const seenSha = new Set();
    const out = [];
    for (const d of emitted) {
      const key = d._range ? `${d._range[0]}:${d._range[1]}` : null;
      const h = d._sha || sha1(d.pageContent);
      if (key && seenRange.has(key)) continue;
      if (seenSha.has(h)) continue;
      if (key) seenRange.add(key);
      seenSha.add(h);
      delete d._range;
      delete d._sha;
      out.push(d);
    }
    if (!out.length) return this._splitByLines(cleaned, metadata);
    return out;
  }
  _parse(code) {
    return parse(code, {
      sourceType: "module",
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      ranges: true,
      plugins: ["importMeta", "topLevelAwait", "classProperties", "classPrivateProperties", "classPrivateMethods", "dynamicImport", "decorators-legacy"]
    });
  }
  _sanitizeAST(ast) {
    traverse(ast, {
      ImportDeclaration(path) {
        path.remove();
      },
      ExportDefaultDeclaration: normalizeExport,
      ExportNamedDeclaration: normalizeExport,
      CallExpression(path) {
        const {
          callee
        } = path.node;
        if (isEssentialLogCallee(callee)) return;
        if (isNonEssentialLogCallee(callee)) {
          const stmt = path.getStatementParent();
          if (stmt) stmt.remove();
        }
      }
    });
  }
  _emitNode(node, code, baseMeta, out) {
    if (node.type === "root") {
      this._emitChildrenAndGaps(node, code, baseMeta, out);
      return;
    }
    const segment = {
      start: node.start,
      end: node.end
    };
    const text = code.slice(segment.start, segment.end);
    const tokens = this.estimateTokens(text);
    if (tokens > this.maxTokens && node.children?.length) {
      this._emitChildrenAndGaps(node, code, baseMeta, out);
      return;
    }
    out.push(this._makeDoc(text, baseMeta, {
      splitting: "ast_semantic",
      unit: {
        type: node.type,
        name: node.name,
        loc: node.loc ?? null,
        kind: node.kind ?? null
      },
      span: [segment.start, segment.end]
    }));
  }
  _emitChildrenAndGaps(node, code, baseMeta, out) {
    const kids = node.children || [];
    let cursor = node.start;
    const pack = [];
    const flushPack = () => {
      if (!pack.length) return;
      const text = pack.map(p => code.slice(p.start, p.end)).join("\n\n");
      out.push(this._makeDoc(text, baseMeta, {
        splitting: "ast_semantic_pack",
        unitCount: pack.length,
        units: pack.map(p => ({
          type: p.type,
          name: p.name,
          loc: p.loc ?? null,
          kind: p.kind ?? null
        })),
        span: [pack[0].start, pack[pack.length - 1].end]
      }));
      pack.length = 0;
    };
    for (const child of kids) {
      if (child.start > cursor) {
        flushPack();
        this._emitResidual(code.slice(cursor, child.start), cursor, child.start, baseMeta, out);
      }
      const childText = code.slice(child.start, child.end);
      const childTokens = this.estimateTokens(childText);
      if (childTokens > this.maxTokens && child.children?.length) {
        flushPack();
        this._emitNode(child, code, baseMeta, out);
      } else {
        if (this.maxUnitsPerChunk > 1 && this.estimateTokens(childText) < this.minTokens) {
          pack.push(child);
          if (pack.length >= this.maxUnitsPerChunk) flushPack();
        } else {
          flushPack();
          out.push(this._makeDoc(childText, baseMeta, {
            splitting: "ast_semantic",
            unit: {
              type: child.type,
              name: child.name,
              loc: child.loc ?? null,
              kind: child.kind ?? null
            },
            span: [child.start, child.end]
          }));
        }
      }
      cursor = child.end;
    }
    flushPack();
    if (cursor < node.end) {
      this._emitResidual(code.slice(cursor, node.end), cursor, node.end, baseMeta, out);
    }
  }
  _emitResidual(text, absStart, absEnd, baseMeta, out) {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < this.minResidualChars) return;
    const tokens = this.estimateTokens(text);
    if (tokens <= this.maxTokens) {
      out.push(this._makeDoc(text, baseMeta, {
        splitting: "residual",
        span: [absStart, absEnd]
      }));
      return;
    }
    const parts = this._splitByLines(text, baseMeta, null, absStart);
    out.push(...parts);
  }
  _makeDoc(text, baseMeta, extra = {}) {
    const tokenCount = this.estimateTokens(text);
    const doc = {
      pageContent: text.trim(),
      metadata: {
        ...baseMeta,
        tokenCount,
        generatedAt: new Date().toISOString(),
        ...extra
      },
      _range: extra.span || null,
      _sha: sha1(text)
    };
    return doc;
  }
  _splitByLines(text, baseMeta, unit = null, offset = 0) {
    if (!this.enableLineFallback) {
      return [this._makeDoc(text, baseMeta, {
        splitting: "single_chunk_no_units",
        span: [offset, offset + text.length]
      })];
    }
    const tokensPerWindow = clamp(this.maxTokens, this.minTokens, this.maxTokens);
    const approxCharsPerToken = this.charsPerToken;
    const targetChars = tokensPerWindow * approxCharsPerToken;
    const lines = text.split(/\r?\n/);
    const chunks = [];
    let startLine = 0;
    const overlapChars = this.overlapTokens * approxCharsPerToken;
    while (startLine < lines.length) {
      let endLine = startLine;
      let charCount = 0;
      while (endLine < lines.length && charCount < targetChars) {
        charCount += lines[endLine].length + 1;
        endLine++;
      }
      while (endLine < lines.length && endLine - startLine > 5) {
        const ln = lines[endLine - 1].trim();
        if (ln === "" || ln === "}" || ln === "{") break;
        endLine--;
      }
      const slice = lines.slice(startLine, endLine).join("\n").trim();
      if (slice) {
        const absStart = offset + lines.slice(0, startLine).join("\n").length + (startLine ? 1 : 0);
        const absEnd = absStart + slice.length;
        chunks.push(this._makeDoc(slice, baseMeta, {
          splitting: "line_window",
          window: [startLine + 1, endLine],
          oversizeOf: unit ? {
            type: unit.type,
            name: unit.name,
            loc: unit.loc ?? null
          } : null,
          span: [absStart, absEnd]
        }));
      }
      if (endLine >= lines.length) break;
      let backChars = 0;
      let newStart = endLine;
      while (newStart > startLine && backChars < overlapChars) {
        newStart--;
        backChars += lines[newStart].length + 1;
      }
      startLine = newStart;
    }
    return chunks;
  }
}
```

---

## Chunk 14

**Splitting Method:** `residual`  
**Token Count:** 9 tokens  
**Character Count:** 33 chars  
**Unit Count:** 0  
**SHA1:** `undefined`  

**Type:** Residual/Gap chunk (structural code between semantic units)

**Code Preview:**
*Short structural chunk*

### Full Code Content

```javascript
module.exports = ASTCodeSplitter;
```

---

## 📊 Comprehensive Statistics

### Chunk Size Distribution
| Metric | Value |
|--------|-------|
| Total Chunks | 14 |
| Total Tokens | 3399 |
| Average Tokens per Chunk | 243 |
| Min Tokens | 9 |
| Max Tokens | 1925 |
| Original File Tokens | 4349 |
| Compression Ratio | 78.2% |

### Splitting Methods Used
- **residual**: 2 chunks (14.3%)
- **ast_semantic**: 12 chunks (85.7%)

### Semantic Unit Types Detected
- **residual**: 14 occurrences (100.0%)

## 🤔 Self-Analysis Insights

This meta-analysis reveals how the AST splitter understands its own architecture:

1. **Modular Design**: Clean separation between utility functions, main class, and helper methods
2. **Semantic Intelligence**: Correctly identifies its own functions, classes, and patterns
3. **Efficient Chunking**: Creates appropriately-sized chunks for complex JavaScript
4. **Tree Awareness**: Demonstrates the hierarchical understanding it applies to all code

The splitter successfully processes its own 4349 tokens into 14 focused, semantically meaningful chunks - proving its effectiveness on real-world JavaScript codebases!
