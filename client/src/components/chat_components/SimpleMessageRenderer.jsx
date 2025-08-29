// SimpleMessageRenderer.jsx - A simpler approach without complex markdown
import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import PropTypes from 'prop-types';
import './messageRenderer.css';

const SimpleMessageRenderer = ({ content, isUserMessage = false }) => {
  const renderContent = () => {
    const elements = [];
    let currentIndex = 0;
    
    // Find code blocks first (```...```)
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      // Add text before code block
      if (match.index > currentIndex) {
        const textBefore = content.slice(currentIndex, match.index);
        elements.push(...renderTextWithInlineCode(textBefore, elements.length));
      }
      
      // Add code block
      const language = match[1] || 'text';
      const code = match[2].trim();
      
      elements.push(
        <div key={`codeblock-${elements.length}`} className="code-block-container">
          <div className="code-block-header">
            <span className="code-language">{language}</span>
            <button 
              className="copy-button"
              onClick={() => navigator.clipboard.writeText(code)}
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
          >
            {code}
          </SyntaxHighlighter>
        </div>
      );
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < content.length) {
      const remainingText = content.slice(currentIndex);
      elements.push(...renderTextWithInlineCode(remainingText, elements.length));
    }
    
    return elements.length > 0 ? elements : renderTextWithInlineCode(content, 0);
  };
  
  const renderTextWithInlineCode = (text, startKey = 0) => {
    const elements = [];
    let currentIndex = 0;
    
    // Simple inline code regex - avoiding triple backticks
    const inlineCodeRegex = /(?<!```.*)`([^`\n]+)`(?!.*```)/g;
    let match;
    
    while ((match = inlineCodeRegex.exec(text)) !== null) {
      // Add text before inline code
      if (match.index > currentIndex) {
        const textBefore = text.slice(currentIndex, match.index);
        elements.push(
          <span key={`text-${startKey}-${elements.length}`}>
            {renderPlainText(textBefore)}
          </span>
        );
      }
      
      // Add inline code
      elements.push(
        <code key={`inline-${startKey}-${elements.length}`} className="inline-code">
          {match[1]}
        </code>
      );
      
      currentIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (currentIndex < text.length) {
      const remainingText = text.slice(currentIndex);
      elements.push(
        <span key={`text-${startKey}-${elements.length}`}>
          {renderPlainText(remainingText)}
        </span>
      );
    }
    
    return elements.length > 0 ? elements : [renderPlainText(text)];
  };
  
  const renderPlainText = (text) => {
    return text.split('\n').map((line, index, array) => (
      <React.Fragment key={`line-${index}`}>
        {line}
        {index < array.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <div className={`message-content ${isUserMessage ? 'user-message' : 'ai-message'}`}>
      {renderContent()}
    </div>
  );
};

SimpleMessageRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  isUserMessage: PropTypes.bool
};

export default SimpleMessageRenderer;
