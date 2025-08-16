// VoiceInput.jsx
import React from 'react';
import { useVoiceRecording } from './useVoiceRecording';
import './voiceInput.css';

const VoiceInput = ({ onVoiceMessage, disabled, className = '' }) => {
  const {
    isRecording,
    isProcessing,
    audioLevel,
    recordingDuration,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    checkAudioDevices,
    setIsProcessing,
    setError
  } = useVoiceRecording();

  // Debug function to check devices
  const debugDevices = async () => {
    console.log('[Voice Debug] Checking audio devices...');
    const devices = await checkAudioDevices();
    console.log('[Voice Debug] Found devices:', devices);
    
    // Also check browser support
    console.log('[Voice Debug] Browser support:', {
      getUserMedia: !!navigator.mediaDevices?.getUserMedia,
      MediaRecorder: !!window.MediaRecorder,
      AudioContext: !!(window.AudioContext || window.webkitAudioContext)
    });
  };

  // Run device check on component mount
  React.useEffect(() => {
    debugDevices();
  }, []);

  const handleMicClick = async () => {
    if (disabled) return;

    if (isRecording) {
      // Stop recording and process
      setIsProcessing(true);
      try {
        const audioBlob = await stopRecording();
        if (audioBlob && onVoiceMessage) {
          await onVoiceMessage(audioBlob);
        }
      } catch (error) {
        console.error('[Voice] Error processing recording:', error);
        setError('Failed to process recording');
      } finally {
        setIsProcessing(false);
      }
    } else {
      // Start recording
      await startRecording();
    }
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    cancelRecording();
    setError(null);
  };

  // Clear error after 5 seconds
  React.useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  // Handle keyboard shortcuts during recording
  React.useEffect(() => {
    if (!isRecording) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel(e);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleMicClick();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isRecording, handleCancel, handleMicClick]);

  return (
    <div className={`voice-input ${className}`}>
      {/* Main microphone button */}
      <button
        className={`mic-button ${
          isRecording ? 'recording' : 
          isProcessing ? 'processing' : 
          disabled ? 'disabled' : 'idle'
        }`}
        onClick={handleMicClick}
        disabled={disabled || isProcessing}
        title={
          isRecording ? 'Click to stop recording' : 
          isProcessing ? 'Processing...' : 
          disabled ? 'Microphone disabled' : 
          'Click to start recording'
        }
      >
        {isProcessing ? (
          <div className="processing-spinner" />
        ) : (
          <svg 
            className="mic-icon" 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
          </svg>
        )}
      </button>

      {/* Recording indicator overlay */}
      {isRecording && (
        <div className="recording-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="recording-info">
            <div className="recording-header">
              <div className="recording-status">
                <div className="recording-dot" />
                <span>Recording</span>
              </div>
              <button 
                className="cancel-button"
                onClick={handleCancel}
                title="Cancel recording"
              >
                ×
              </button>
            </div>
            
            <div className="recording-details">
              <div className="duration">{recordingDuration}</div>
              
              {/* Audio level visualizer */}
              <div className="audio-level-container">
                <div className="audio-level-bar">
                  <div 
                    className="audio-level-fill"
                    style={{ width: `${audioLevel}%` }}
                  />
                </div>
                <div className="audio-level-text">{Math.round(audioLevel)}%</div>
              </div>
              
              {/* Stop recording button */}
              <button 
                className="stop-recording-button"
                onClick={handleMicClick}
                disabled={isProcessing}
              >
                <svg 
                  className="stop-icon" 
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                >
                  <path d="M6 6h12v12H6z"/>
                </svg>
                {isProcessing ? 'Processing...' : 'Stop Recording'}
              </button>
              
              <div className="recording-hint">
                Press <kbd>Enter</kbd> or <kbd>Space</kbd> to stop, <kbd>Esc</kbd> to cancel
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="voice-error">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
