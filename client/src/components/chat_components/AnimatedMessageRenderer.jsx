// AnimatedMessageRenderer.jsx - Enhanced message renderer with typewriter effect for AI messages
/* eslint-disable react/no-unstable-nested-components */
import React, { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import TypewriterText from './TypewriterText';
import { onTypewriterScroll } from './scrollUtils';
import './messageRenderer.css';
import './TypewriterText.css';

// Convert short single-line fenced code blocks into inline code for better text flow
function inlineShortFenced(md) {
  if (!md) return md;
  const singleLineFence = /(?:\n{1,2}|^)\s*```(?:\w+)?\s*\n([^\n\r]+)\n\s*```(?:\n{1,2}|$)/g;
  return md.replace(singleLineFence, (match, code) => {
    const text = String(code).trim();
    if (text.length <= 80 && !text.includes('```')) {
      return ` \`${text}\` `;
    }
    return match;
  });
}

// Safely convert ReactMarkdown code children to string
function codeChildrenToString(children) {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    // children from react-markdown often is an array with a single string
    return children.map((c) => (typeof c === 'string' ? c : '')).join('');
  }
  return '';
}

const AnimatedMessageRenderer = ({ 
  content, 
  isUserMessage = false, 
  enableAnimation = true,
  animationSpeed = 80 
}) => {
  const processedContent = useMemo(() => inlineShortFenced(content), [content]);

  // For user messages or when animation is disabled, always render normally
  if (isUserMessage || !enableAnimation) {
    return (
      <div className={`message-content ${isUserMessage ? 'user-message' : 'ai-message'}`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'text';
              const codeTextAll = codeChildrenToString(children);
              // Treat very short single-line, language-less blocks as inline
              const isSingle = !codeTextAll.includes('\n');
              if (!inline && isSingle && (!match || language === 'text') && codeTextAll.trim().length <= 80) {
                return <code className="inline-code" {...props}>{children}</code>;
              }

              if (!inline) {
                return (
                  <div className="code-block-container">
                    <div className="code-block-header">
                      <span className="code-language">{language}</span>
                      <button 
                        className="copy-button"
                        onClick={() => navigator.clipboard.writeText(codeTextAll)}
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
                        fontSize: '14px'
                      }}
                      {...props}
                    >
                      {codeTextAll.replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                );
              }

              const codeText = codeTextAll;
              const shouldShowCopyButton = codeText.length > 20 || codeText.includes(' ') || codeText.includes('.');
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
      </div>
    );
  }

  // For AI messages with animation enabled
  // Only skip animation for very complex content that would break with word-by-word animation
  const hasCodeBlocks = /```[\s\S]*?```/.test(content);
  const hasTables = /^\|.*\|.*$/m.test(content);
  
  // Skip animation only for code blocks and tables - everything else gets animated
  if (hasCodeBlocks || hasTables) {
    return (
      <div className={`message-content ai-message`}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'text';
              
              if (!inline) {
                return (
                  <div className="code-block-container">
                    <div className="code-block-header">
                      <span className="code-language">{language}</span>
                      <button 
                        className="copy-button"
                        onClick={() => navigator.clipboard.writeText(String(children))}
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
                        fontSize: '14px'
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
                );
              }
              
              // Handle inline code appropriately
              const codeText = String(children);
              const shouldShowCopyButton = codeText.length > 20 || codeText.includes(' ') || codeText.includes('.');
              
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
          }}
          skipHtml={true}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  }

  // For all other content, use typewriter effect first, then render markdown when done
  const [done, setDone] = useState(false);
  return (
    <div className={`message-content ai-message`}>
      {!done ? (
        <TypewriterText 
          text={content} 
          speed={animationSpeed}
          className="ai-message-text"
          onScroll={onTypewriterScroll}
          onComplete={() => setDone(true)}
        />
      ) : (
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'text';
              const raw = codeChildrenToString(children);
              const isSingle = !raw.includes('\n');
              if (!inline && isSingle && (!match || language === 'text') && raw.trim().length <= 80) {
                return <code className="inline-code" {...props}>{children}</code>;
              }
              if (!inline) {
                return (
                  <div className="code-block-container">
                    <div className="code-block-header">
                      <span className="code-language">{language}</span>
                      <button 
                        className="copy-button"
                        onClick={() => navigator.clipboard.writeText(raw)}
                        title="Copy code"
                      >
                        📋
                      </button>
                    </div>
                    <SyntaxHighlighter
                      style={oneDark}
                      language={language}
                      PreTag="div"
                      customStyle={{ margin: 0, borderRadius: '0 0 8px 8px', fontSize: '14px' }}
                      {...props}
                    >
                      {raw.replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  </div>
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

AnimatedMessageRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  isUserMessage: PropTypes.bool,
  enableAnimation: PropTypes.bool,
  animationSpeed: PropTypes.number
};

export default AnimatedMessageRenderer;
