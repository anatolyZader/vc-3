// astCodeSplitter.js
"use strict";

/**
 * AST-first code splitter for backend JS (no JSX).
 * - Strips imports & normalizes/drops exports
 * - Removes non-essential logs (keeps only error/warn)
 * - Drops comments/markdown via Babel codegen (comments:false)
 * - Detects semantic units: functions, classes, var-functions, Fastify routes/decorations, event listeners
 * - Builds a unit tree, emits either the unit OR its children+gaps (never both)
 * - Covers residual gaps so trailing exports/bootstraps are kept
 * - Fallbacks to line-window splitting for oversized segments
 * - Pluggable token estimator (default ~chars/4)
 *
 * Output: Array<{ pageContent: string, metadata: object }>
 */

const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const t = require("@babel/types");
const generate = require("@babel/generator").default;
const crypto = require("crypto");

// ---------- Token estimation (simple & fast) ----------
function defaultEstimateTokens(text, charsPerToken = 4) {
  return Math.max(1, Math.ceil((text || "").length / charsPerToken));
}

// ---------- Utilities ----------
const sha1 = (s) => crypto.createHash("sha1").update(s || "").digest("hex");
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const within = (a, b) => a.start >= b.start && a.end <= b.end;

// Strip string literals to avoid counting braces inside strings
function stripStrings(s) { 
  return s.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, ''); 
}

// Cheap balance check for better packing decisions (ignores braces in strings)
function isBalancedBraces(s) {
  s = stripStrings(s);
  let b=0,p=0,c=0;
  for (const ch of s) {
    if (ch === '{') b++; else if (ch === '}') b--;
    if (ch === '(') p++; else if (ch === ')') p--;
    if (ch === '[') c++; else if (ch === ']') c--;
  }
  return b===0 && p===0 && c===0;
}

// Log filters
function isNonEssentialLogCallee(callee) {
  // console.log/info/debug
  if (
    t.isMemberExpression(callee) &&
    t.isIdentifier(callee.object, { name: "console" }) &&
    t.isIdentifier(callee.property) &&
    ["log", "info", "debug"].includes(callee.property.name)
  ) return true;

  // *.log.info/debug (fastify/app/etc)
  if (
    t.isMemberExpression(callee) &&
    t.isMemberExpression(callee.object) &&
    t.isIdentifier(callee.object.property, { name: "log" }) &&
    t.isIdentifier(callee.property) &&
    ["info", "debug"].includes(callee.property.name)
  ) return true;

  // logger.info/debug
  if (
    t.isMemberExpression(callee) &&
    t.isIdentifier(callee.object, { name: "logger" }) &&
    t.isIdentifier(callee.property) &&
    ["info", "debug"].includes(callee.property.name)
  ) return true;

  return false;
}

function isEssentialLogCallee(callee) {
  // console.error/warn
  if (
    t.isMemberExpression(callee) &&
    t.isIdentifier(callee.object, { name: "console" }) &&
    t.isIdentifier(callee.property) &&
    ["error", "warn"].includes(callee.property.name)
  ) return true;

  // *.log.error/warn
  if (
    t.isMemberExpression(callee) &&
    t.isMemberExpression(callee.object) &&
    t.isIdentifier(callee.object.property, { name: "log" }) &&
    t.isIdentifier(callee.property) &&
    ["error", "warn"].includes(callee.property.name)
  ) return true;

  // logger.error/warn
  if (
    t.isMemberExpression(callee) &&
    t.isIdentifier(callee.object, { name: "logger" }) &&
    t.isIdentifier(callee.property) &&
    ["error", "warn"].includes(callee.property.name)
  ) return true;

  return false;
}

// Convert `export <decl>` to `<decl>`; drop bare exports/re-exports.
function normalizeExport(path) {
  const node = path.node;
  if (t.isExportDefaultDeclaration(node) || t.isExportNamedDeclaration(node)) {
    if (node.declaration) {
      path.replaceWith(node.declaration);
    } else {
      path.remove();
    }
  }
}

// Helpers for Fastify/event labels
const routeNameGuess = (call) => {
  const a0 = call.arguments?.[0];
  return t.isStringLiteral(a0) ? `route_${a0.value.replace(/[^a-zA-Z0-9]/g, "_")}` : "route";
};
const literalName = (n) => (t.isStringLiteral(n) ? `event_${n.value}` : "event");

// ---------- Collect semantic units ----------
function collectUnits(ast) {
  // A unit is { type, name, start, end, loc, kind }
  const units = [];
  const fastifyAliases = new Set(["fastify"]);
  const push = (type, name, node, kind = null) => {
    if (Number.isInteger(node.start) && Number.isInteger(node.end)) {
      units.push({
        type,
        name: name || "anonymous",
        start: node.start,
        end: node.end,
        loc: node.loc ? { start: node.loc.start.line, end: node.loc.end.line } : null,
        kind,
      });
    }
  };

  // First pass: top-level decls + track fastify aliases
  ast.program.body.forEach((n) => {
    if (t.isFunctionDeclaration(n)) push("function", n.id && n.id.name, n);
    else if (t.isClassDeclaration(n)) push("class", n.id && n.id.name, n);
    else if (t.isVariableDeclaration(n)) {
      n.declarations.forEach((d) => {
        // Track alias: const app = fastify()
        if (
          t.isIdentifier(d.id) &&
          t.isCallExpression(d.init) &&
          t.isIdentifier(d.init.callee, { name: "fastify" })
        ) fastifyAliases.add(d.id.name);

        // var function: const x = () => {} | function() {}
        if (
          t.isIdentifier(d.id) &&
          d.init &&
          (t.isFunctionExpression(d.init) || t.isArrowFunctionExpression(d.init))
        ) push("function_var", d.id.name, d);
      });
    }
  });

  // Second pass: Fastify routes/decorations + event listeners (allow nested)
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      // fastify.<verb>(path, handler)
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

      // fastify.route({...}) or app.route({...})
      if (
        (t.isIdentifier(callee) && fastifyAliases.has(callee.name)) ||
        (t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object) &&
          fastifyAliases.has(callee.object.name) &&
          t.isIdentifier(callee.property, { name: "route" }))
      ) {
        push("fastify_route", "routeObject", path.node, "route_object");
      }

      // Event listeners: x.on/once/addListener('name', handler)
      if (t.isMemberExpression(callee) && t.isIdentifier(callee.property)) {
        const ev = new Set(["on", "once", "addListener"]);
        if (ev.has(callee.property.name) && path.node.arguments.length >= 2) {
          push("event_listener", literalName(path.node.arguments[0]), path.node, "event");
        }
      }
    },
  });

  units.sort((a, b) => a.start - b.start);
  return units;
}

// ---------- Build a nesting tree so we never double-emit ----------
function buildTree(units, fileStart, fileEnd) {
  const root = { type: "root", name: "root", start: fileStart, end: fileEnd, children: [] };
  const nodes = units.map((u) => ({ ...u, children: [] }));

  const stack = [root];
  for (const n of nodes) {
    // Find parent as the deepest node whose range encloses n
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
  // Ensure children sorted
  (function sortRec(node) {
    node.children.sort((a, b) => a.start - b.start);
    node.children.forEach(sortRec);
  })(root);

  return root;
}

// ---------- Main splitter ----------
class ASTCodeSplitter {
  /**
   * @param {object} options
   * @param {number} [options.maxTokens=1000] - Optimized for better retrieval (800-1200 range)
   * @param {number} [options.minTokens=200] - Ensure substantive chunks
   * @param {number} [options.overlapTokens=65] - Moderate overlap (50-80 tokens)
   * @param {(text:string)=>number} [options.estimateTokens]
   * @param {boolean} [options.enableLineFallback=true]
   * @param {number} [options.maxUnitsPerChunk=2] - Allow 2 units when functions are tiny
   * @param {number} [options.charsPerToken=4]
   * @param {number} [options.minResidualChars=100] - Avoid micro-residuals
   */
  constructor(options = {}) {
    // Optimized defaults for retrieval performance (per recommendations)
    this.maxTokens = options.maxTokens ?? 1000;        // Balanced for retrieval (800-1200 range)
    this.minTokens = options.minTokens ?? 200;         // Ensure substantive chunks
    this.overlapTokens = options.overlapTokens ?? 65;  // Moderate overlap (50-80 range)
    this.enableLineFallback = options.enableLineFallback !== false;
    this.maxUnitsPerChunk = options.maxUnitsPerChunk ?? 2; // Allow 2 tiny functions per chunk
    this.charsPerToken = options.charsPerToken ?? 4;
    this.minResidualChars = options.minResidualChars ?? 100; // Avoid micro-residuals
    this.estimateTokens =
      options.estimateTokens || ((txt) => defaultEstimateTokens(txt, this.charsPerToken));
  }

  /**
   * Collect all import statements from AST, including multi-line imports
   * @param {Object} ast - Babel AST
   * @param {string[]} lines - Array of source code lines
   * @returns {string[]} Array of complete import statements
   */
  collectImports(ast, lines) {
    const imports = [];
    
    traverse(ast, {
      ImportDeclaration(path) {
        const node = path.node;
        if (node.loc) {
          // Get the complete import statement including multi-line
          const startLine = node.loc.start.line - 1; // Convert to 0-based index
          const endLine = node.loc.end.line - 1;
          
          if (startLine === endLine) {
            // Single line import
            imports.push(lines[startLine].trim());
          } else {
            // Multi-line import - join all lines from start to end
            const importLines = lines.slice(startLine, endLine + 1);
            imports.push(importLines.join('\n').trim());
          }
        }
      },
      
      VariableDeclaration(path) {
        const node = path.node;
        // Check if this is a require statement
        if (node.declarations) {
          for (const declarator of node.declarations) {
            if (declarator.init && 
                t.isCallExpression(declarator.init) && 
                t.isIdentifier(declarator.init.callee, { name: 'require' })) {
              
              if (node.loc) {
                const startLine = node.loc.start.line - 1;
                const endLine = node.loc.end.line - 1;
                
                if (startLine === endLine) {
                  imports.push(lines[startLine].trim());
                } else {
                  const requireLines = lines.slice(startLine, endLine + 1);
                  imports.push(requireLines.join('\n').trim());
                }
              }
              break; // Only process the first require in this declaration
            }
          }
        }
      }
    });
    
    return imports;
  }

  /**
   * Collect JSDoc comments and function/class headers for better context
   * @param {Object} ast - Babel AST
   * @param {string[]} lines - Array of source code lines
   * @returns {Map} Map of function/class names to their JSDoc + signature
   */
  collectJSDocs(ast, lines) {
    const jsdocs = new Map();
    
    // Helper to extract comment block before a node
    const getLeadingComment = (node) => {
      if (!node.loc) return null;
      
      const nodeLine = node.loc.start.line - 1; // 0-based
      const commentLines = [];
      
      // Look backwards for JSDoc or block comments
      let lineIdx = nodeLine - 1;
      while (lineIdx >= 0) {
        const line = lines[lineIdx].trim();
        
        // Found JSDoc start
        if (line.startsWith('/**') || line.startsWith('/*')) {
          // Collect all lines until */ or current line
          const startIdx = lineIdx;
          while (lineIdx <= nodeLine - 1) {
            commentLines.unshift(lines[lineIdx]);
            if (lines[lineIdx].includes('*/')) break;
            lineIdx++;
          }
          return commentLines.join('\n').trim();
        }
        
        // Found single-line comment, include it
        if (line.startsWith('//')) {
          commentLines.unshift(lines[lineIdx]);
          lineIdx--;
          continue;
        }
        
        // Empty line or closing comment - stop searching
        if (!line || line.endsWith('*/')) break;
        
        lineIdx--;
      }
      
      return commentLines.length > 0 ? commentLines.join('\n').trim() : null;
    };
    
    // Helper to get function signature (first line)
    const getFunctionSignature = (node) => {
      if (!node.loc) return null;
      const startLine = node.loc.start.line - 1;
      return lines[startLine].trim();
    };
    
    traverse(ast, {
      FunctionDeclaration(path) {
        const name = path.node.id?.name;
        if (name) {
          const comment = getLeadingComment(path.node);
          const signature = getFunctionSignature(path.node);
          if (comment || signature) {
            jsdocs.set(name, { comment, signature });
          }
        }
      },
      
      ClassDeclaration(path) {
        const name = path.node.id?.name;
        if (name) {
          const comment = getLeadingComment(path.node);
          const signature = getFunctionSignature(path.node);
          if (comment || signature) {
            jsdocs.set(name, { comment, signature });
          }
        }
      },
      
      VariableDeclaration(path) {
        // Handle: const myFunc = function() {} or const myFunc = () => {}
        for (const declarator of path.node.declarations) {
          if (t.isIdentifier(declarator.id) &&
              declarator.init &&
              (t.isFunctionExpression(declarator.init) || 
               t.isArrowFunctionExpression(declarator.init))) {
            const name = declarator.id.name;
            const comment = getLeadingComment(path.node);
            const signature = getFunctionSignature(path.node);
            if (comment || signature) {
              jsdocs.set(name, { comment, signature });
            }
          }
        }
      }
    });
    
    return jsdocs;
  }

  split(code, metadata = {}) {
    if (!code || typeof code !== "string") return [];

    // 1) Parse & collect imports + JSDoc/function headers before sanitization
    const ast = this._parse(code);
    const lines = code.split(/\r?\n/);
    const imports = this.collectImports(ast, lines);
    const jsdocs = this.collectJSDocs(ast, lines); // New: collect JSDoc comments
    
    // 2) Sanitize AST (pass metadata for context-aware sanitization)
    this._sanitizeAST(ast, metadata);

    // 3) Generate cleaned code (comments removed, but we saved JSDoc)
    const cleaned = generate(ast, { comments: false, compact: false }).code;

    // 4) Reparse cleaned, collect units, and build tree
    const cleanedAST = this._parse(cleaned);
    const units = collectUnits(cleanedAST);
    const root = buildTree(units, 0, cleaned.length);

    // 5) Plan emission recursively (no double-emit) with imports and jsdocs in metadata
    const emitted = [];
    const enrichedMetadata = { ...metadata, imports, jsdocs };
    this._emitNode(root, cleaned, enrichedMetadata, emitted);

    // 6) Dedupe by span or sha
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
      delete d._range; delete d._sha;
      out.push(d);
    }

    // 7) If nothing (unlikely), fallback whole file
    if (!out.length) return this._splitByLines(cleaned, enrichedMetadata);

    // 8) Collect telemetry for debugging and validation
    const telemetry = this._collectTelemetry(out);
    if (metadata.collectTelemetry !== false) {
      // Add telemetry to last chunk's metadata for easy access
      if (out.length > 0) {
        out[out.length - 1].metadata.splitTelemetry = telemetry;
      }
    }

    return out;
  }

  // ---------- Parsing ----------
  _parse(code) {
    return parse(code, {
      sourceType: "module",
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      ranges: true,
      plugins: [
        "importMeta",
        "topLevelAwait",
        "classProperties",
        "classPrivateProperties",
        "classPrivateMethods",
        "dynamicImport",
        "decorators-legacy",
      ],
    });
  }

  // ---------- AST sanitation ----------
  _sanitizeAST(ast, metadata = {}) {
    const source = metadata.source || '';
    const isRouteOrPlugin = /\/(routes?|plugins?)\//i.test(source) || 
                           /Plugin\.js$/i.test(source) || 
                           /Router\.js$/i.test(source);
    
    traverse(ast, {
      ImportDeclaration(path) {
        path.remove();
      },
      ExportDefaultDeclaration: normalizeExport,
      ExportNamedDeclaration: normalizeExport,
      CallExpression(path) {
        const { callee } = path.node;
        if (isEssentialLogCallee(callee)) return;
        
        // Safety guard: don't remove statements inside route/plugin registration callbacks
        const isInsideRouteRegistration = () => {
          return !!path.findParent(p => {
            if (!t.isCallExpression(p.node)) return false;
            const callee = p.node.callee;
            const calleeStr = generate(callee).code; // small cost, scope-limited
            return calleeStr.includes('.route') ||
                   calleeStr.includes('.register') ||
                   calleeStr.includes('.get') ||
                   calleeStr.includes('.post') ||
                   calleeStr.includes('.put') ||
                   calleeStr.includes('.delete') ||
                   calleeStr.includes('.patch') ||
                   calleeStr.includes('.addHook') ||
                   calleeStr.includes('.decorate');
          });
        };
        
        // In routes/plugins, preserve contextual logs that might carry semantic meaning
        if (isRouteOrPlugin && isNonEssentialLogCallee(callee)) {
          // Check if this log contains useful context (route info, registration details, etc.)
          const args = path.node.arguments || [];
          const hasContextualInfo = args.some(arg => {
            if (t.isStringLiteral(arg)) {
              const content = arg.value.toLowerCase();
              return content.includes('register') || 
                     content.includes('route') || 
                     content.includes('plugin') || 
                     content.includes('endpoint') ||
                     content.includes('middleware');
            }
            return false;
          });
          
          if (hasContextualInfo || isInsideRouteRegistration()) return; // Keep contextual/nested logs
        }
        
        if (isNonEssentialLogCallee(callee) && !isInsideRouteRegistration()) {
          const stmt = path.getStatementParent();
          if (stmt) stmt.remove();
        }
      },
    });
  }

  // ---------- Emission planning ----------
  _emitNode(node, code, baseMeta, out) {
    if (node.type === "root") {
      // Emit children + gaps across whole file
      this._emitChildrenAndGaps(node, code, baseMeta, out);
      return;
    }

    const segment = { start: node.start, end: node.end };
    const text = code.slice(segment.start, segment.end);
    const tokens = this.estimateTokens(text);

    if (tokens > this.maxTokens && node.children?.length) {
      // Soft expansion: if slightly oversized (<1.3×), emit as single coherent chunk
      // Only recurse for truly oversized units (1.3×+)
      if (tokens < this.maxTokens * 1.3) {
        out.push(this._makeDoc(text, baseMeta, {
          splitting: "ast_semantic_soft_oversize",
          unit: { type: node.type, name: node.name, loc: node.loc ?? null, kind: node.kind ?? null },
          span: [segment.start, segment.end],
        }));
      } else {
        // Prefer inner units and gaps (no line_window for parent)
        this._emitChildrenAndGaps(node, code, baseMeta, out);
      }
      return;
    }

    // Emit this unit as a single semantic chunk (do NOT emit its children)
    out.push(this._makeDoc(text, baseMeta, {
      splitting: "ast_semantic",
      unit: { type: node.type, name: node.name, loc: node.loc ?? null, kind: node.kind ?? null },
      span: [segment.start, segment.end],
    }));
  }

  _emitChildrenAndGaps(node, code, baseMeta, out) {
    const kids = node.children || [];
    let cursor = node.start;

    const pack = []; // small semantic units to pack (respect maxUnitsPerChunk)
    const flushPack = () => {
      if (!pack.length) return;
      const text = pack.map(p => code.slice(p.start, p.end)).join("\n\n");
      out.push(this._makeDoc(text, baseMeta, {
        splitting: "ast_semantic_pack",
        unitCount: pack.length,
        units: pack.map(p => ({ type: p.type, name: p.name, loc: p.loc ?? null, kind: p.kind ?? null })),
        span: [pack[0].start, pack[pack.length - 1].end],
      }));
      pack.length = 0;
    };

    for (const child of kids) {
      // Gap before child
      if (child.start > cursor) {
        flushPack();
        this._emitResidual(code.slice(cursor, child.start), cursor, child.start, baseMeta, out);
      }

      // Child: either emit unit or its inside
      const childText = code.slice(child.start, child.end);
      const childTokens = this.estimateTokens(childText);

      if (childTokens > this.maxTokens && child.children?.length) {
        flushPack();
        this._emitNode(child, code, baseMeta, out); // will recurse into its children+gaps
      } else {
        // Intelligent packing: avoid tiny fragments and unbalanced blocks
        const childToks = this.estimateTokens(childText);
        const willFitPack = this.maxUnitsPerChunk > 1 && childToks < this.minTokens;
        const looksBalanced = isBalancedBraces(childText);
        
        if (willFitPack && looksBalanced) {
          pack.push(child);
          if (pack.length >= this.maxUnitsPerChunk) flushPack();
        } else {
          flushPack();
          out.push(this._makeDoc(childText, baseMeta, {
            splitting: "ast_semantic",
            unit: { type: child.type, name: child.name, loc: child.loc ?? null, kind: child.kind ?? null },
            span: [child.start, child.end],
          }));
        }
      }

      cursor = child.end;
    }

    flushPack();

    // Trailing gap
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
        span: [absStart, absEnd],
      }));
      return;
    }

    // Oversized residual => line windows
    const parts = this._splitByLines(text, baseMeta, null, absStart);
    out.push(...parts);
  }

  // ---------- Construct doc ----------
  _makeDoc(text, baseMeta, extra = {}) {
    const baseTokenCount = this.estimateTokens(text);
    let finalText = text.trim();
    let hasPrependedImports = false;
    let hasPrependedJSDoc = false;
    
    // For semantic chunks, optionally prepend JSDoc + function header if available
    if (extra?.splitting?.startsWith('ast_semantic') && 
        extra?.unit?.name && 
        baseMeta.jsdocs?.has(extra.unit.name) &&
        baseTokenCount < this.maxTokens * 0.85) {
      const jsdocInfo = baseMeta.jsdocs.get(extra.unit.name);
      const headerParts = [];
      
      if (jsdocInfo.comment) {
        headerParts.push(jsdocInfo.comment);
      }
      if (jsdocInfo.signature && !finalText.startsWith(jsdocInfo.signature)) {
        headerParts.push(jsdocInfo.signature);
      }
      
      if (headerParts.length > 0) {
        const headerText = headerParts.join('\n');
        const withHeader = headerText + '\n' + finalText;
        const withHeaderTokens = this.estimateTokens(withHeader);
        
        if (withHeaderTokens <= this.maxTokens) {
          finalText = withHeader;
          hasPrependedJSDoc = true;
        }
      }
    }
    
    // For semantic chunks, optionally prepend imports if budget allows
    if (extra?.splitting?.startsWith('ast_semantic') && 
        baseMeta.imports && 
        baseMeta.imports.length && 
        this.estimateTokens(finalText) < this.maxTokens * 0.8) {
      const importsText = baseMeta.imports.join('\n');
      const combinedText = importsText + '\n\n' + finalText;
      const combinedTokens = this.estimateTokens(combinedText);
      
      if (combinedTokens <= this.maxTokens) {
        finalText = combinedText;
        hasPrependedImports = true;
      }
    }
    
    const tokenCount = this.estimateTokens(finalText);
    
    // Determine specific file type if not already set
    let fileType = baseMeta.type;
    if (!fileType || fileType === 'github-file') {
      const FileTypeClassifier = require('../utils/fileTypeClassifier');
      fileType = FileTypeClassifier.determineGitHubFileType(baseMeta.source || '', finalText);
    }
    
    const doc = {
      pageContent: finalText,
      metadata: {
        ...baseMeta,
        tokenCount,
        generatedAt: new Date().toISOString(),
        ...(hasPrependedImports && { hasPrependedImports: true }),
        ...(hasPrependedJSDoc && { hasPrependedJSDoc: true }),
        // Retrieval-friendly fields:
        type: fileType,
        fileType: baseMeta.fileType ?? 'js',
        eventstorm_module: baseMeta.eventstorm_module ?? null,
        semantic_role: extra.unit?.type ?? null,   // function | class | fastify_route | ...
        unit_name: extra.unit?.name ?? null,
        is_complete_block: isBalancedBraces(finalText),
        spanHash: sha1(`${baseMeta.source||''}:${(extra.span||[]).join('-')}:${sha1(finalText)}`),
        ...extra,
      },
      _range: extra.span || null,
      _sha: sha1(finalText),
    };
    return doc;
  }

  // ---------- Line-window fallback ----------
  _splitByLines(text, baseMeta, unit = null, offset = 0) {
    if (!this.enableLineFallback) {
      return [
        this._makeDoc(text, baseMeta, {
          splitting: "single_chunk_no_units",
          span: [offset, offset + text.length],
        }),
      ];
    }

    const tokensPerWindow = clamp(this.maxTokens, this.minTokens, this.maxTokens);
    const approxCharsPerToken = this.charsPerToken;
    const targetChars = tokensPerWindow * approxCharsPerToken;

    const lines = text.split(/\r?\n/);
    const chunks = [];
    let startLine = 0;

    const overlapChars = this.overlapTokens * approxCharsPerToken;
    
    // Snap to brace boundaries to reduce dangling blocks
    function snapToBraceBoundary(lines, start, end) {
      // Simple heuristic: try to expand end to include complete braced blocks
      let adjustedEnd = end;
      let braceCount = 0;
      
      // Count braces from start to original end
      for (let i = start; i < Math.min(end, lines.length); i++) {
        const line = lines[i];
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
      }
      
      // If unbalanced, try to extend a few lines to balance
      if (braceCount > 0 && adjustedEnd < lines.length) {
        for (let i = adjustedEnd; i < Math.min(adjustedEnd + 5, lines.length); i++) {
          const line = lines[i];
          braceCount += (line.match(/\{/g) || []).length;
          braceCount -= (line.match(/\}/g) || []).length;
          adjustedEnd = i + 1;
          if (braceCount === 0) break;
        }
      }
      
      return [start, adjustedEnd];
    }

    while (startLine < lines.length) {
      let endLine = startLine;
      let charCount = 0;
      while (endLine < lines.length && charCount < targetChars) {
        charCount += lines[endLine].length + 1;
        endLine++;
      }

      // try to land on a "nice" boundary
      while (endLine < lines.length && endLine - startLine > 5) {
        const ln = lines[endLine - 1].trim();
        if (ln === "" || ln === "}" || ln === "{") break;
        endLine--;
      }

      // Apply brace boundary snapping for better structural integrity
      let [adjustedStart, adjustedEnd] = snapToBraceBoundary(lines, startLine, endLine);
      
      // Re-check token budget after snapping and shrink if needed
      let slice = lines.slice(adjustedStart, adjustedEnd).join("\n").trim();
      while (this.estimateTokens(slice) > this.maxTokens && adjustedEnd - adjustedStart > 5) {
        // Trim from end until within budget
        adjustedEnd--;
        slice = lines.slice(adjustedStart, adjustedEnd).join("\n").trim();
      }
      
      if (slice) {
        const absStart = offset + lines.slice(0, adjustedStart).join("\n").length + (adjustedStart ? 1 : 0);
        const absEnd = absStart + slice.length;
        chunks.push(
          this._makeDoc(slice, baseMeta, {
            splitting: "line_window_balanced",
            window: [adjustedStart + 1, adjustedEnd],
            originalWindow: [startLine + 1, endLine],
            oversizeOf: unit
              ? { type: unit.type, name: unit.name, loc: unit.loc ?? null }
              : null,
            span: [absStart, absEnd],
          })
        );
      }

      if (adjustedEnd >= lines.length) break;

      // compute new start with overlap based on adjusted end
      let backChars = 0;
      let newStart = adjustedEnd;
      while (newStart > adjustedStart && backChars < overlapChars) {
        newStart--;
        backChars += lines[newStart].length + 1;
      }
      startLine = Math.max(newStart, adjustedEnd - Math.ceil(overlapChars / 80));
    }

    return chunks;
  }

  // ---------- Telemetry collection ----------
  _collectTelemetry(chunks) {
    if (!chunks.length) return { totalChunks: 0 };

    const stats = {
      totalChunks: chunks.length,
      splittingTypes: {},
      tokenStats: {
        total: 0,
        mean: 0,
        min: Infinity,
        max: 0,
        p95: 0
      },
      balanceStats: {
        completeBlocks: 0,
        balancedChunks: 0
      },
      importStats: {
        chunksWithImports: 0
      }
    };

    const tokenCounts = [];
    
    for (const chunk of chunks) {
      const splitting = chunk.metadata.splitting || 'unknown';
      stats.splittingTypes[splitting] = (stats.splittingTypes[splitting] || 0) + 1;
      
      const tokens = chunk.metadata.tokenCount || this.estimateTokens(chunk.pageContent);
      tokenCounts.push(tokens);
      stats.tokenStats.total += tokens;
      stats.tokenStats.min = Math.min(stats.tokenStats.min, tokens);
      stats.tokenStats.max = Math.max(stats.tokenStats.max, tokens);
      
      // Check if chunk appears to be a complete block (balanced braces)
      if (isBalancedBraces(chunk.pageContent)) {
        stats.balanceStats.balancedChunks++;
        
        // Heuristic for "complete" semantic units
        const content = chunk.pageContent.trim();
        if ((content.includes('function ') || content.includes('class ') || 
             content.includes('const ') || content.includes('async ')) &&
            content.endsWith('}')) {
          stats.balanceStats.completeBlocks++;
        }
      }
      
      if (chunk.metadata.hasPrependedImports) {
        stats.importStats.chunksWithImports++;
      }
    }

    // Calculate percentiles and averages
    if (tokenCounts.length > 0) {
      stats.tokenStats.mean = Math.round(stats.tokenStats.total / tokenCounts.length);
      tokenCounts.sort((a, b) => a - b);
      const p95Index = Math.floor(tokenCounts.length * 0.95);
      stats.tokenStats.p95 = tokenCounts[p95Index] || tokenCounts[tokenCounts.length - 1];
    }

    // Calculate percentages
    for (const [type, count] of Object.entries(stats.splittingTypes)) {
      stats.splittingTypes[type] = {
        count,
        percentage: Math.round((count / stats.totalChunks) * 100)
      };
    }

    stats.balanceStats.completeBlocksPercentage = 
      Math.round((stats.balanceStats.completeBlocks / stats.totalChunks) * 100);
    stats.balanceStats.balancedChunksPercentage = 
      Math.round((stats.balanceStats.balancedChunks / stats.totalChunks) * 100);

    return stats;
  }
}

module.exports = ASTCodeSplitter;

/*
Usage example:

const ASTCodeSplitter = require('./astCodeSplitter');
const splitter = new ASTCodeSplitter({
  maxTokens: 2000,           // Increased for better semantic preservation
  minTokens: 140,            // Increased to avoid tiny fragments
  overlapTokens: 120,        // Increased for better context
  maxUnitsPerChunk: 4,       // Increased to allow small sibling packing
  // Optional: precise tokenizer
  // estimateTokens: (txt) => enc.encode(txt || "").length
});

const chunks = splitter.split(sourceCode, { 
  source: '/path/to/file.js',
  type: 'github-code',  // Will be auto-detected if not provided
  fileType: 'js',
  eventstorm_module: 'ai'
});
// => [{ pageContent, metadata: { spanHash, semantic_role, unit_name, is_complete_block, ... } }, ...]
*/
