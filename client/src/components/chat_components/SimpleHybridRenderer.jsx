// SimpleHybridRenderer.jsx - A simpler approach to handle cursor jumping after code blocks
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { onTypewriterScroll } from './scrollUtils';

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
  const [displayedContent, setDisplayedContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Split content by code blocks, but keep them in the result
  const contentParts = useMemo(() => {
    const parts = [];
    const codeBlockRegex = /(```[\s\S]*?```)/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index)
        });
      }
      // Add code block
      parts.push({
        type: 'code',
        content: match[1]
      });
      lastIndex = match.index + match[1].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex)
      });
    }

    console.log('SimpleHybridRenderer - Content parts:', parts);
    return parts;
  }, [content]);

  // Animation effect
  useEffect(() => {
    if (currentIndex >= content.length) {
      setIsComplete(true);
      if (onComplete) onComplete();
      return;
    }

    // Check if we're at a code block position
    let charCount = 0;
    
    for (const part of contentParts) {
      if (currentIndex >= charCount && currentIndex < charCount + part.content.length) {
        if (part.type === 'code' && !inCodeBlock) {
          // We've reached a code block, show it immediately
          console.log('SimpleHybridRenderer - Reached code block, jumping ahead');
          setDisplayedContent(content.slice(0, charCount + part.content.length));
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
      setDisplayedContent(content.slice(0, currentIndex + 1));
      setCurrentIndex(prev => prev + 1);
      
      if (onTypewriterScroll) {
        setTimeout(() => onTypewriterScroll(), 0);
      }
    }, animationSpeed);

    return () => clearTimeout(timer);
  }, [currentIndex, content, contentParts, animationSpeed, onComplete]);

  // Reset when content changes
  useEffect(() => {
    setDisplayedContent('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [content]);

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
              
              if (!inline) {
                return (
                  <div className="code-block-container">
                    <div className="code-block-header">
                      <span className="code-language">{language}</span>
                      <button 
                        className="copy-button"
                        onClick={() => navigator.clipboard.writeText(codeChildrenToString(children))}
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
              
              return <code className="inline-code" {...props}>{children}</code>;
            }
          }}
          skipHtml={true}
        >
          {content}
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