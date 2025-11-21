// SimpleHybridRenderer.jsx - A simpler approach to handle cursor jumping after code blocks
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { onTypewriterScroll } from './scrollUtils';

// Convert short single-line fenced code blocks into inline code for better text flow
function inlineShortFenced(md) {
  if (!md) return md;
  // Match any fenced code block (supports indentation and CRLF)
  const fencePattern = /```(\w+)?[^\S\r\n]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g;
  return md.replace(fencePattern, (match, lang, body) => {
    const lines = String(body).split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 1) {
      const text = lines[0].trim();
      // Inline if no language or "inert" languages like text/txt/plain
      const inertLang = !lang || /^(text|txt|plain|plaintext)$/i.test(lang);
      if (inertLang && text.length <= 80 && !text.includes('```')) {
        return ` \`${text}\` `;
      }
    }
    return match;
  });
}

// Helper function to safely convert children to string
const codeChildrenToString = (children) => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === 'string' ? c : '')).join('');
  }
  return String(children);
};

const SimpleHybridRenderer = ({ 
  content, 
  animationSpeed = 80,
  onComplete = null 
}) => {
  const processedContent = useMemo(() => inlineShortFenced(content), [content]);
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Split content by code blocks, but keep them in the result
  const contentParts = useMemo(() => {
    const parts = [];
    const codeBlockRegex = /```[\s\S]*?```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(processedContent)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: processedContent.slice(lastIndex, match.index)
        });
      }
      // Add code block - use match[0] to get the full matched block
      parts.push({
        type: 'code',
        content: match[0]
      });
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < processedContent.length) {
      parts.push({
        type: 'text',
        content: processedContent.slice(lastIndex)
      });
    }

    console.log('SimpleHybridRenderer - Content parts:', parts);
    return parts;
  }, [processedContent]);

  // Animation effect
  useEffect(() => {
    if (currentIndex >= processedContent.length) {
      setIsComplete(true);
      if (onComplete) onComplete();
      return;
    }

    // Check if we're at a code block position
    let charCount = 0;
    
    for (const part of contentParts) {
      if (currentIndex >= charCount && currentIndex < charCount + part.content.length) {
        if (part.type === 'code') {
          // We've reached a code block, show it immediately
          console.log('SimpleHybridRenderer - Reached code block, jumping ahead');
          setDisplayedContent(processedContent.slice(0, charCount + part.content.length));
          setCurrentIndex(charCount + part.content.length);
          
          if (onTypewriterScroll) {
            setTimeout(() => onTypewriterScroll(), 0);
          }
          return;
        }
        break;
      }
      charCount += part.content.length;
    }

    // Normal character-by-character animation
    const timer = setTimeout(() => {
      setDisplayedContent(processedContent.slice(0, currentIndex + 1));
      setCurrentIndex(prev => prev + 1);
      
      if (onTypewriterScroll) {
        setTimeout(() => onTypewriterScroll(), 0);
      }
    }, animationSpeed);

    return () => clearTimeout(timer);
  }, [currentIndex, processedContent, contentParts, animationSpeed, onComplete]);

  // Reset when content changes
  useEffect(() => {
    setDisplayedContent('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [processedContent]);

  return (
    <div className="simple-hybrid-content">
      {!isComplete ? (
        // During animation - show raw text with cursor
        <span style={{ whiteSpace: 'pre-wrap' }}>
          {displayedContent}
          <span className="typewriter-cursor">|</span>
        </span>
      ) : (
        // After animation - show processed markdown
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'text';
              // Normalize by trimming trailing whitespace
              const codeText = codeChildrenToString(children).replace(/\s+$/, '');
              const isSingle = !codeText.includes('\n');
              const isInertLang = !match || /^(text|txt|plain|plaintext)$/i.test(language);
              
              // Force inline for short, single-line blocks with inert language
              if (!inline && isSingle && isInertLang && codeText.length <= 80) {
                return <code className="inline-code" {...props}>{codeText}</code>;
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
                        fontSize: '0.9em',
                        lineHeight: '1.4'
                      }}
                    >
                      {codeText}
                    </SyntaxHighlighter>
                  </div>
                );
              }
              
              // codeText already normalized above
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
              
              return <code className="inline-code" {...props}>{children}</code>;
            }
          }}
          skipHtml={true}
        >
          {processedContent}
        </ReactMarkdown>
      )}
    </div>
  );
};

SimpleHybridRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  animationSpeed: PropTypes.number,
  onComplete: PropTypes.func
};

export default SimpleHybridRenderer;