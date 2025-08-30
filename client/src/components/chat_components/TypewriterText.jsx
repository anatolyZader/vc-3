// TypewriterText.jsx - Component for word-by-word animated text
import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const TypewriterText = ({ 
  text, 
  speed = 100, // milliseconds between words
  onComplete = null,
  className = '',
  startDelay = 0 // delay before starting animation
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Split text into words while preserving spaces and newlines
  const words = React.useMemo(() => {
    if (!text) return [];
    
    // Split by spaces but keep the spaces
    const parts = text.split(/(\s+)/);
    return parts.filter(part => part.length > 0);
  }, [text]);

  const animateText = useCallback(() => {
    if (currentIndex >= words.length) {
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
      return;
    }

    const timer = setTimeout(() => {
      setDisplayedText(prev => prev + words[currentIndex]);
      setCurrentIndex(prev => prev + 1);
    }, speed);

    return () => clearTimeout(timer);
  }, [currentIndex, words, speed, onComplete]);

  // Reset when text changes
  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
    setIsComplete(false);
  }, [text]);

  // Start animation
  useEffect(() => {
    if (words.length === 0) return;

    if (startDelay > 0) {
      const delayTimer = setTimeout(() => {
        animateText();
      }, startDelay);
      return () => clearTimeout(delayTimer);
    } else {
      return animateText();
    }
  }, [animateText, startDelay, words.length]);

  // Handle clicking to complete animation instantly
  const handleClick = () => {
    if (!isComplete && words.length > 0) {
      setDisplayedText(text);
      setCurrentIndex(words.length);
      setIsComplete(true);
      if (onComplete) {
        onComplete();
      }
    }
  };

  return (
    <span 
      className={`typewriter-text ${className}`}
      onClick={handleClick}
      style={{ cursor: isComplete ? 'default' : 'pointer' }}
      title={isComplete ? '' : 'Click to show full message'}
    >
      {displayedText}
      {!isComplete && (
        <span className="typewriter-cursor">|</span>
      )}
    </span>
  );
};

TypewriterText.propTypes = {
  text: PropTypes.string.isRequired,
  speed: PropTypes.number,
  onComplete: PropTypes.func,
  className: PropTypes.string,
  startDelay: PropTypes.number
};

export default TypewriterText;
