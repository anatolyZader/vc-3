// AnimatedMessageRenderer.jsx - Enhanced message renderer with typewriter effect for AI messages
/* eslint-disable react/no-unstable-nested-components */
import React, { useMemo, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import TypewriterText from './TypewriterText';
import SimpleHybridRenderer from './SimpleHybridRenderer';
import { onTypewriterScroll } from './scrollUtils';
import './messageRenderer.css';
import './TypewriterText.css';
import './forceCompactStyles.css';
import './avatarFix.css';

// Convert short single-line fenced code blocks into inline code for better text flow
function inlineShortFenced(md) {
  if (!md) return md;
  // Match any fenced code block (supports indentation and CRLF)
  const fencePattern = /```(\w+)?[^\S\r\n]*\r?\n([\s\S]*?)\r?\n[ \t]*```/g;
  let replacements = 0;
  const result = md.replace(fencePattern, (match, lang, body) => {
    // If the fenced block contains exactly one non-empty line, inline it
    const lines = String(body).split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 1) {
      const text = lines[0].trim();
      // Inline if no language or "inert" languages like text/txt/plain
      const inertLang = !lang || /^(text|txt|plain|plaintext)$/i.test(lang);
      if (inertLang && text.length <= 80 && !text.includes('```')) {
        replacements++;
        console.log(`[AnimatedMessageRenderer] inlineShortFenced: Converting \`\`\`${lang||''}\\n${text}\\n\`\`\` to inline`);
        return ` \`${text}\` `;
      }
    }
    return match;
  });
  if (replacements > 0) {
    console.log(`[AnimatedMessageRenderer] inlineShortFenced: Made ${replacements} replacements`);
  }
  return result;
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
  // All hooks must be called at the top level
  const processedContent = useMemo(() => {
    console.log('[AnimatedMessageRenderer] Raw content received:', content.substring(0, 500));
    const result = inlineShortFenced(content);
    console.log('[AnimatedMessageRenderer] Processed content:', result.substring(0, 500));
    return result;
  }, [content]);
  const [done, setDone] = useState(false);
  const typewriterRef = useRef(null);

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
              // Normalize by trimming trailing whitespace (including \n)
              const codeTextAll = codeChildrenToString(children).replace(/\s+$/, '');
              const isSingle = !codeTextAll.includes('\n');
              const isInertLang = !match || /^(text|txt|plain|plaintext)$/i.test(language);
              
              // Treat very short single-line blocks with inert language as inline
              if (!inline && isSingle && isInertLang && codeTextAll.length <= 80) {
                return <code className="inline-code" {...props}>{codeTextAll}</code>;
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

              // codeTextAll already normalized above
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
      </div>
    );
  }

  // For AI messages with animation enabled
  // Detect different content types to choose appropriate animation strategy
  const hasCodeBlocks = /```[\s\S]*?```/.test(content);
  const hasTables = /^\|.*\|.*$/m.test(content);
  
  // Skip animation only for tables (complex layout)
  if (hasTables) {
    console.log('AnimatedMessageRenderer - Table detected, skipping animation');
    return (
      <div className={`message-content ai-message compact-spacing-override`}>
        <div 
          className="compact-final-content"
          style={{
            margin: 0,
            padding: 0,
            display: 'block',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Force compact styling with inline styles to override any CSS
              p: ({ children, ...props }) => (
                <p 
                  {...props} 
                  style={{ 
                    margin: '0.2em 0', 
                    padding: 0,
                    lineHeight: '1.4'
                  }}
                >
                  {children}
                </p>
              ),
              ul: ({ children, ...props }) => (
                <ul 
                  {...props} 
                  style={{ 
                    margin: '0.2em 0', 
                    paddingLeft: '1.2em',
                    listStyleType: 'disc',
                    listStylePosition: 'inside',
                    display: 'block'
                  }}
                >
                  {children}
                </ul>
              ),
              ol: ({ children, ...props }) => (
                <ol 
                  {...props} 
                  style={{ 
                    margin: '0.2em 0', 
                    paddingLeft: '1.2em',
                    listStylePosition: 'inside',
                    display: 'block'
                  }}
                >
                  {children}
                </ol>
              ),
              li: ({ children, ...props }) => (
                <li 
                  {...props} 
                  style={{ 
                    margin: '0.05em 0', 
                    padding: 0,
                    lineHeight: '1.4',
                    display: 'list-item',
                    listStylePosition: 'inside',
                    textAlign: 'left'
                  }}
                >
                  {children}
                </li>
              ),
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : 'text';
              // Normalize by trimming trailing whitespace
              const codeText = String(children).replace(/\s+$/, '');
              const isSingle = !codeText.includes('\n');
              const isInertLang = !match || /^(text|txt|plain|plaintext)$/i.test(language);
              
              // Force inline for short, single-line "text" blocks
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
                        fontSize: '14px'
                      }}
                      {...props}
                    >
                      {codeText.replace(/\n$/, '')}
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
      </div>
    );
  }

  // DISABLED: Animation skipping logic - all content now gets animated
  // const hasSignificantFormatting = useMemo(() => {
  //   // Detection logic disabled - all content gets animation
  //   return false;
  // }, [content]);

  // Choose animation strategy based on content type
  console.log('AnimatedMessageRenderer - Animation path, hasCodeBlocks:', hasCodeBlocks, 'done:', done, 'content preview:', content.substring(0, 100));
  console.log('AnimatedMessageRenderer - Using renderer:', hasCodeBlocks ? 'HybridAnimatedRenderer' : 'TypewriterText');
  
  // Handle animation completion
  const handleAnimationComplete = () => {
    setDone(true);
  };
  
  return (
    <div className={`message-content ai-message compact-spacing-override`}>
      <div className="animated-content-wrapper">
        <div className="unified-content-container">
          {!done ? (
            <div ref={typewriterRef}>
              {hasCodeBlocks ? (
                // Use simple hybrid renderer for content with code blocks
                <SimpleHybridRenderer 
                  content={content}
                  animationSpeed={animationSpeed}
                  onComplete={handleAnimationComplete}
                />
              ) : (
                // Use simple typewriter for text-only content
                <TypewriterText 
                  text={content} 
                  speed={animationSpeed}
                  className="ai-message-text typewriter-animated"
                  onScroll={onTypewriterScroll}
                  onComplete={handleAnimationComplete}
                />
              )}
            </div>
          ) : (
            // Post-animation: Render proper markdown with code blocks
            <div className="post-animation-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children, ...props }) => (
                    <p {...props} style={{ margin: '0.2em 0', lineHeight: '1.4' }}>
                      {children}
                    </p>
                  ),
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const language = match ? match[1] : 'text';
                    // Normalize by trimming trailing whitespace
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
                              fontSize: '0.9em',
                              lineHeight: '1.4'
                            }}
                          >
                            {codeChildrenToString(children)}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }
                    
                    // Handle inline code - codeText already defined above
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
            </div>
          )}
        </div>
      </div>
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
