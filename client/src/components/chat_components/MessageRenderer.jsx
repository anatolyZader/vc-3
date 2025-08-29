// MessageRenderer.jsx
import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import './messageRenderer.css';

const MessageRenderer = ({ content, isUserMessage = false }) => {
  // Custom components for rendering different markdown elements
  const components = {
    // Code blocks (```language) and inline code (`code`)
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      
      // Debug logging
      console.log('Code element:', { inline, className, language, children: String(children) });
      
      // Handle multi-line code blocks with syntax highlighting
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
                fontSize: '14px',
                lineHeight: '1.4'
              }}
              {...props}
            >
              {String(children).replace(/\n$/, '')}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      // Handle inline code (single backticks) - no copy button, just styling
      return (
        <code className="inline-code" {...props}>
          {children}
        </code>
      );
    },
    
    // Blockquotes
    blockquote({ children, ...props }) {
      return (
        <blockquote className="markdown-blockquote" {...props}>
          {children}
        </blockquote>
      );
    },
    
    // Tables
    table({ children, ...props }) {
      return (
        <div className="table-container">
          <table className="markdown-table" {...props}>
            {children}
          </table>
        </div>
      );
    },
    
    // Lists
    ul({ children, ...props }) {
      return <ul className="markdown-ul" {...props}>{children}</ul>;
    },
    
    ol({ children, ...props }) {
      return <ol className="markdown-ol" {...props}>{children}</ol>;
    },
    
    // Links
    a({ children, href, ...props }) {
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
    },
    
    // Headers
    h1({ children, ...props }) {
      return <h1 className="markdown-h1" {...props}>{children}</h1>;
    },
    
    h2({ children, ...props }) {
      return <h2 className="markdown-h2" {...props}>{children}</h2>;
    },
    
    h3({ children, ...props }) {
      return <h3 className="markdown-h3" {...props}>{children}</h3>;
    },
    
    // Paragraphs
    p({ children, ...props }) {
      return <p className="markdown-paragraph" {...props}>{children}</p>;
    }
  };

  return (
    <div className={`message-content ${isUserMessage ? 'user-message' : 'ai-message'}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
        skipHtml={true} // For security
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

MessageRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  isUserMessage: PropTypes.bool
};

export default MessageRenderer;
