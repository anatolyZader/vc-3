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
      return true;
    }
    path.remove();
    return true;
  }
  return false;
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
   * @param {number} [options.maxTokens=800]
   * @param {number} [options.minTokens=60]
   * @param {number} [options.overlapTokens=80]
   * @param {(text:string)=>number} [options.estimateTokens]
   * @param {boolean} [options.enableLineFallback=true]
   * @param {number} [options.maxUnitsPerChunk=1]
   * @param {number} [options.charsPerToken=4]
   * @param {number} [options.minResidualChars=12]
   */
  constructor(options = {}) {
    this.maxTokens = options.maxTokens ?? 800;
    this.minTokens = options.minTokens ?? 60;
    this.overlapTokens = options.overlapTokens ?? 80;
    this.enableLineFallback = options.enableLineFallback !== false;
    this.maxUnitsPerChunk = options.maxUnitsPerChunk ?? 1;
    this.charsPerToken = options.charsPerToken ?? 4;
    this.minResidualChars = options.minResidualChars ?? 12;
    this.estimateTokens =
      options.estimateTokens || ((txt) => defaultEstimateTokens(txt, this.charsPerToken));
  }

  split(code, metadata = {}) {
    if (!code || typeof code !== "string") return [];

    // 1) Parse & sanitize AST
    const ast = this._parse(code);
    this._sanitizeAST(ast);

    // 2) Generate cleaned code (comments removed)
    const cleaned = generate(ast, { comments: false, compact: false }).code;

    // 3) Reparse cleaned, collect units, and build tree
    const cleanedAST = this._parse(cleaned);
    const units = collectUnits(cleanedAST);
    const root = buildTree(units, 0, cleaned.length);

    // 4) Plan emission recursively (no double-emit)
    const emitted = [];
    this._emitNode(root, cleaned, metadata, emitted);

    // 5) Dedupe by span or sha
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

    // 6) If nothing (unlikely), fallback whole file
    if (!out.length) return this._splitByLines(cleaned, metadata);

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
  _sanitizeAST(ast) {
    traverse(ast, {
      ImportDeclaration(path) {
        path.remove();
      },
      ExportDefaultDeclaration: normalizeExport,
      ExportNamedDeclaration: normalizeExport,
      CallExpression(path) {
        const { callee } = path.node;
        if (isEssentialLogCallee(callee)) return;
        if (isNonEssentialLogCallee(callee)) {
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
      // Prefer inner units and gaps (no line_window for parent)
      this._emitChildrenAndGaps(node, code, baseMeta, out);
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
        // Consider packing small units
        if (this.maxUnitsPerChunk > 1 && this.estimateTokens(childText) < this.minTokens) {
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
    const tokenCount = this.estimateTokens(text);
    const doc = {
      pageContent: text.trim(),
      metadata: {
        ...baseMeta,
        tokenCount,
        generatedAt: new Date().toISOString(),
        ...extra,
      },
      _range: extra.span || null,
      _sha: sha1(text),
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

      const slice = lines.slice(startLine, endLine).join("\n").trim();
      if (slice) {
        const absStart = offset + lines.slice(0, startLine).join("\n").length + (startLine ? 1 : 0);
        const absEnd = absStart + slice.length;
        chunks.push(
          this._makeDoc(slice, baseMeta, {
            splitting: "line_window",
            window: [startLine + 1, endLine],
            oversizeOf: unit
              ? { type: unit.type, name: unit.name, loc: unit.loc ?? null }
              : null,
            span: [absStart, absEnd],
          })
        );
      }

      if (endLine >= lines.length) break;

      // compute new start with overlap
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

module.exports = ASTCodeSplitter;

/*
Usage example:

const ASTCodeSplitter = require('./astCodeSplitter');
const splitter = new ASTCodeSplitter({
  maxTokens: 800,
  minTokens: 60,
  overlapTokens: 80,
  maxUnitsPerChunk: 1,
  // Optional: precise tokenizer
  // estimateTokens: (txt) => enc.encode(txt || "").length
});

const chunks = splitter.split(sourceCode, { source: '/path/to/file.js' });
// => [{ pageContent, metadata }, ...]
*/
