// useVoiceRecording.js
import { useState, useRef, useCallback } from 'react';

export const useVoiceRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const intervalRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Check available audio devices
  const checkAudioDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('[Voice] Device enumeration not supported');
        return [];
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log('[Voice] Available audio input devices:', audioInputs.map(d => ({
        deviceId: d.deviceId,
        label: d.label,
        groupId: d.groupId
      })));

      return audioInputs;
    } catch (error) {
      console.error('[Voice] Error checking audio devices:', error);
      return [];
    }
  }, []);

  // Initialize audio level monitoring
  const initializeAudioMonitoring = useCallback((stream) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      
      microphone.connect(analyser);
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      // Start monitoring audio levels
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateLevel = () => {
        if (analyser && isRecording) {
          analyser.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
        }
      };

      intervalRef.current = setInterval(updateLevel, 100);
    } catch (error) {
      console.warn('Audio monitoring not available:', error);
    }
  }, [isRecording]);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      // Check if MediaRecorder is supported
      if (!window.MediaRecorder) {
        throw new Error('Your browser does not support MediaRecorder');
      }

      console.log('[Voice] Requesting microphone access...');

      // Check available devices first
      const audioDevices = await checkAudioDevices();
      if (audioDevices.length === 0) {
        console.warn('[Voice] No audio input devices found');
      }

      // Request microphone permission with fallback options
      let stream;
      try {
        // Try with specific constraints first
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: { ideal: 16000, min: 8000, max: 48000 }
          } 
        });
      } catch (constraintError) {
        console.warn('[Voice] Failed with constraints, trying basic audio:', constraintError);
        
        // Fallback to basic audio constraints
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (basicError) {
          console.error('[Voice] Basic audio request failed:', basicError);
          
          // Provide user-friendly error messages
          if (basicError.name === 'NotFoundError') {
            throw new Error('No microphone found. Please connect a microphone and try again.');
          } else if (basicError.name === 'NotAllowedError') {
            throw new Error('Microphone access denied. Please allow microphone access and try again.');
          } else if (basicError.name === 'NotReadableError') {
            throw new Error('Microphone is being used by another application. Please close other apps and try again.');
          } else {
            throw new Error('Could not access microphone: ' + basicError.message);
          }
        }
      }

      streamRef.current = stream;
      audioChunksRef.current = [];

      console.log('[Voice] Microphone access granted, initializing recording...');

      // Initialize audio level monitoring
      initializeAudioMonitoring(stream);

      // Determine supported MIME type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav';
        } else {
          console.warn('[Voice] No supported audio MIME type found, using default');
        }
      }

      console.log('[Voice] Using MIME type:', mimeType);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[Voice] Recording stopped, processing audio...');
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Voice] MediaRecorder error:', event.error);
        setError('Recording error: ' + event.error.message);
      };

      // Start recording
      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('[Voice] Recording started successfully');

    } catch (error) {
      console.error('[Voice] Failed to start recording:', error);
      
      // Clean up any partially created resources
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      
      setError(error.message || 'Failed to access microphone');
    }
  }, [initializeAudioMonitoring]);

  // Stop recording
  const stopRecording = useCallback(() => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      setIsRecording(false);
      setAudioLevel(0);

      // Clear intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }

      // Handle MediaRecorder stop
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current.mimeType 
        });
        
        console.log('[Voice] Audio blob created:', {
          size: audioBlob.size,
          type: audioBlob.type,
          duration: recordingDuration
        });

        // Cleanup
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        if (audioContextRef.current) {
          audioContextRef.current.close();
          audioContextRef.current = null;
        }

        analyserRef.current = null;
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setRecordingDuration(0);

        resolve(audioBlob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording, recordingDuration]);

  // Cancel recording
  const cancelRecording = useCallback(() => {
    if (!isRecording) return;

    setIsRecording(false);
    setAudioLevel(0);
    setRecordingDuration(0);

    // Clear intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    // Cleanup
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current = null;
    }

    analyserRef.current = null;
    audioChunksRef.current = [];

    console.log('[Voice] Recording cancelled');
  }, [isRecording]);

  // Format duration for display
  const formatDuration = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    isRecording,
    isProcessing,
    audioLevel,
    recordingDuration: formatDuration(recordingDuration),
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    checkAudioDevices,
    setIsProcessing,
    setError
  };
};
