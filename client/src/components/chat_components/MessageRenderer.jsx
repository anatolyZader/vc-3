// MessageRenderer.jsx
/* eslint-disable react/no-unstable-nested-components */
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import './messageRenderer.css';

// Convert short single-line fenced code blocks into inline code for better text flow
function inlineShortFenced(md) {
  if (!md) return md;
  // Match any fenced code block (supports indentation and CRLF)
  const fencePattern = /```(\w+)?[^\S\r\n]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g;
  let replacements = 0;
  const result = md.replace(fencePattern, (match, lang, body) => {
    const lines = String(body).split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 1) {
      const text = lines[0].trim();
      // Inline if no language or "inert" languages like text/txt/plain
      const inertLang = !lang || /^(text|txt|plain|plaintext)$/i.test(lang);
      if (inertLang && text.length <= 80 && !text.includes('```')) {
        replacements++;
        console.log(`[MessageRenderer] inlineShortFenced: Converting \`\`\`${lang||''}\\n${text}\\n\`\`\` to inline`);
        return ` \`${text}\` `;
      }
    }
    return match;
  });
  if (replacements > 0) {
    console.log(`[MessageRenderer] inlineShortFenced: Made ${replacements} replacements`);
  }
  return result;
}

// Renderers for ReactMarkdown (defined outside to avoid unstable nested components)
function CodeRenderer({ node, inline, className, children, ...props }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : 'text';
  // Normalize by trimming trailing whitespace (including \n) to properly detect single-line blocks
  const codeText = String(children).replace(/\s+$/, '');
  const isSingleLine = !codeText.includes('\n');
  const isInertLang = !match || /^(text|txt|plain|plaintext)$/i.test(language);
  
  // Treat very short single-line blocks with no/inert language as inline to preserve flow
  if (!inline && isSingleLine && isInertLang && codeText.length <= 80) {
    return (
      <code className="inline-code" {...props}>{codeText}</code>
    );
  }

  if (!inline) {
    return (
      <div className="code-block-container">
        <div className="code-block-header">
          <span className="code-language">{language}</span>
          <button 
            className="copy-button"
            onClick={() => navigator.clipboard.writeText(codeText)}
            title="Copy code"
          >
            📋
          </button>
        </div>
        <SyntaxHighlighter
          style={oneDark}
          language={language}
          PreTag="div"
          customStyle={{
            margin: 0,
            borderRadius: '0 0 8px 8px',
            fontSize: '14px',
            lineHeight: '1.4'
          }}
          {...props}
        >
          {codeText.replace(/\n$/, '')}
        </SyntaxHighlighter>
      </div>
    );
  }

  // codeText already defined above - normalized
  // Only show copy button for longer code snippets or multi-word content that looks like actual code
  // Exclude simple filenames, class names, and single identifiers to preserve text flow
  const shouldShowCopyButton = codeText.length > 40 || 
    (codeText.includes(' ') && codeText.length > 15) || 
    (codeText.includes('\n')) ||
    (codeText.includes('()') && codeText.length > 10);
    
  if (shouldShowCopyButton) {
    return (
      <span className="inline-code-with-copy">
        <code className="inline-code" {...props}>
          {children}
        </code>
        <button 
          className="inline-copy-button"
          onClick={() => navigator.clipboard.writeText(codeText)}
          title="Copy code"
        >
          📋
        </button>
      </span>
    );
  }
  return (
    <code className="inline-code" {...props}>
      {children}
    </code>
  );
}

function BlockquoteRenderer({ children, ...props }) {
  return (
    <blockquote className="markdown-blockquote" {...props}>
      {children}
    </blockquote>
  );
}

function TableRenderer({ children, ...props }) {
  return (
    <div className="table-container">
      <table className="markdown-table" {...props}>
        {children}
      </table>
    </div>
  );
}

function UlRenderer({ children, ...props }) {
  return <ul className="markdown-ul" {...props}>{children}</ul>;
}

function OlRenderer({ children, ...props }) {
  return <ol className="markdown-ol" {...props}>{children}</ol>;
}

function LinkRenderer({ children, href, ...props }) {
  return (
    <a 
      className="markdown-link" 
      href={href} 
      target="_blank" 
      rel="noopener noreferrer" 
      {...props}
    >
      {children}
    </a>
  );
}

function H1Renderer({ children, ...props }) {
  return <h1 className="markdown-h1" {...props}>{children}</h1>;
}

function H2Renderer({ children, ...props }) {
  return <h2 className="markdown-h2" {...props}>{children}</h2>;
}

function H3Renderer({ children, ...props }) {
  return <h3 className="markdown-h3" {...props}>{children}</h3>;
}

function ParagraphRenderer({ children, ...props }) {
  return <p className="markdown-paragraph" {...props}>{children}</p>;
}

const MessageRenderer = ({ content, isUserMessage = false }) => {
  // Content normalization is done via helper

  // Custom components for rendering different markdown elements
  const components = {
    code: CodeRenderer,
    blockquote: BlockquoteRenderer,
    table: TableRenderer,
    ul: UlRenderer,
    ol: OlRenderer,
    a: LinkRenderer,
    h1: H1Renderer,
    h2: H2Renderer,
    h3: H3Renderer,
    p: ParagraphRenderer
  };

  return (
    <div className={`message-content ${isUserMessage ? 'user-message' : 'ai-message'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        skipHtml={true} // For security
      >
        {inlineShortFenced(content)}
      </ReactMarkdown>
    </div>
  );
};

MessageRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  isUserMessage: PropTypes.bool
};

export default MessageRenderer;
