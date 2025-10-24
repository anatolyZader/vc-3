// HybridAnimatedRenderer.jsx - Renders text with animation while showing code blocks immediately
import React, { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { onTypewriterScroll } from './scrollUtils';

// Safely convert ReactMarkdown code children to string
const codeChildrenToString = (children) => {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    return children.map((c) => (typeof c === 'string' ? c : '')).join('');
  }
  return String(children);
};

// Helper function to extract code blocks and text segments
const parseContentSegments = (content) => {
  const segments = [];
  const codeBlockRegex = /```[\s\S]*?```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before the code block
    if (match.index > lastIndex) {
      const textSegment = content.slice(lastIndex, match.index);
      if (textSegment.trim()) {
        segments.push({
          type: 'text',
          content: textSegment.trim(),
          startIndex: lastIndex,
          endIndex: match.index
        });
      }
    }

    // Add the code block
    segments.push({
      type: 'codeblock',
      content: match[0],
      startIndex: match.index,
      endIndex: match.index + match[0].length
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after the last code block
  if (lastIndex < content.length) {
    const textSegment = content.slice(lastIndex);
    if (textSegment.trim()) {
      segments.push({
        type: 'text',
        content: textSegment.trim(),
        startIndex: lastIndex,
        endIndex: content.length
      });
    }
  }

  // If no code blocks found, return the entire content as text
  if (segments.length === 0) {
    segments.push({
      type: 'text',
      content: content,
      startIndex: 0,
      endIndex: content.length
    });
  }

  return segments;
};

const HybridAnimatedRenderer = ({ 
  content, 
  animationSpeed = 80,
  onComplete = null 
}) => {
  const segments = useMemo(() => {
    const parsed = parseContentSegments(content);
    console.log('HybridAnimatedRenderer - Parsed segments:', parsed);
    return parsed;
  }, [content]);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [displayedTextInCurrentSegment, setDisplayedTextInCurrentSegment] = useState('');
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Get words for the current text segment
  const currentSegment = segments[currentSegmentIndex];
  const currentWords = useMemo(() => {
    if (!currentSegment || currentSegment.type !== 'text') return [];
    const parts = currentSegment.content.split(/(\s+)/);
    return parts.filter(part => part.length > 0);
  }, [currentSegment]);

  // Animation effect
  useEffect(() => {
    console.log('HybridAnimatedRenderer - Animation effect triggered, currentSegmentIndex:', currentSegmentIndex, 'segments.length:', segments.length);
    
    if (currentSegmentIndex >= segments.length) {
      console.log('HybridAnimatedRenderer - Animation complete');
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const currentSeg = segments[currentSegmentIndex];
    console.log('HybridAnimatedRenderer - Processing segment:', currentSegmentIndex, 'type:', currentSeg?.type);
    
    // If current segment is a code block, show it immediately and move to next
    if (currentSeg.type === 'codeblock') {
      console.log('HybridAnimatedRenderer - Processing code block, moving to next segment');
      const timer = setTimeout(() => {
        console.log('HybridAnimatedRenderer - Moving from code block to next segment');
        setCurrentSegmentIndex(prev => {
          const next = prev + 1;
          console.log('HybridAnimatedRenderer - New segment index:', next);
          return next;
        });
        setCurrentWordIndex(0);
        setDisplayedTextInCurrentSegment('');
      }, 100); // Slightly longer delay to ensure rendering
      return () => clearTimeout(timer);
    }

    // If current segment is text, animate word by word
    if (currentSeg.type === 'text') {
      if (currentWordIndex >= currentWords.length) {
        // Current text segment is complete, move to next segment
        const timer = setTimeout(() => {
          setCurrentSegmentIndex(prev => prev + 1);
          setCurrentWordIndex(0);
          setDisplayedTextInCurrentSegment('');
        }, 50);
        return () => clearTimeout(timer);
      }

      // Animate next word
      const timer = setTimeout(() => {
        setDisplayedTextInCurrentSegment(prev => prev + currentWords[currentWordIndex]);
        setCurrentWordIndex(prev => prev + 1);
        
        // Trigger scroll callback
        if (onTypewriterScroll) {
          setTimeout(() => onTypewriterScroll(), 0);
        }
      }, animationSpeed);

      return () => clearTimeout(timer);
    }
  }, [currentSegmentIndex, currentWordIndex, segments.length, currentWords.length, animationSpeed, onComplete]);

  // Reset when content changes
  useEffect(() => {
    setCurrentSegmentIndex(0);
    setCurrentWordIndex(0);
    setDisplayedTextInCurrentSegment('');
    setIsComplete(false);
  }, [content]);

  // Render the content with cursor tracking
  const renderSegments = () => {
    const renderedSegments = [];
    
    segments.forEach((segment, index) => {
      if (index < currentSegmentIndex) {
        // Completed segments - render fully
        if (segment.type === 'text') {
          renderedSegments.push(
            <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
              {segment.content}
            </span>
          );
        } else if (segment.type === 'codeblock') {
          renderedSegments.push(
            <div key={index} style={{ margin: '0.5em 0' }}>
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
                {segment.content}
              </ReactMarkdown>
            </div>
          );
        }
      } else if (index === currentSegmentIndex) {
        // Currently processing segment
        if (segment.type === 'text') {
          renderedSegments.push(
            <span key={index} style={{ whiteSpace: 'pre-wrap' }}>
              {displayedTextInCurrentSegment}
              {!isComplete && <span className="typewriter-cursor">|</span>}
            </span>
          );
        } else if (segment.type === 'codeblock') {
          // Render code block immediately when we reach it
          renderedSegments.push(
            <div key={index} style={{ margin: '0.5em 0' }}>
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
                {segment.content}
              </ReactMarkdown>
            </div>
          );
        }
      }
    });

    // Add cursor to show animation progress
    if (!isComplete) {
      const currentSeg = segments[currentSegmentIndex];
      console.log('HybridAnimatedRenderer - Cursor logic, currentSegmentIndex:', currentSegmentIndex, 'currentSeg type:', currentSeg?.type, 'hasMoreSegments:', currentSegmentIndex + 1 < segments.length);
      
      if (currentSeg) {
        // If we're currently showing a code block and there are more segments
        if (currentSeg.type === 'codeblock' && currentSegmentIndex + 1 < segments.length) {
          console.log('HybridAnimatedRenderer - Adding cursor after code block');
          renderedSegments.push(
            <div key="cursor-after-code" style={{ display: 'inline-block', marginLeft: '4px' }}>
              <span className="typewriter-cursor">|</span>
            </div>
          );
        }
        // If we're at the end and waiting for more text (not handled in text rendering)
        else if (currentSeg.type === 'text' && displayedTextInCurrentSegment === '' && currentSegmentIndex > 0) {
          console.log('HybridAnimatedRenderer - Adding cursor before text');
          // This handles the case where we just finished a code block and are about to start text
          renderedSegments.push(
            <span key="cursor-before-text" className="typewriter-cursor" style={{ marginLeft: '2px' }}>|</span>
          );
        }
      }
    }

    return renderedSegments;
  };

  return (
    <div className="hybrid-animated-content">
      {renderSegments()}
    </div>
  );
};

HybridAnimatedRenderer.propTypes = {
  content: PropTypes.string.isRequired,
  animationSpeed: PropTypes.number,
  onComplete: PropTypes.func
};

export default HybridAnimatedRenderer;