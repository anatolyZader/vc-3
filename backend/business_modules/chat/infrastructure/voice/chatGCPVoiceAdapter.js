// chatGCPVoiceAdapter.js
'use strict';

// Imports the Google Cloud client libraries
const textToSpeech = require('@google-cloud/text-to-speech');
const speech = require('@google-cloud/speech');

// Import required libraries
const { writeFile, readFile } = require('node:fs/promises');
const IChatVoicePort = require('../../domain/ports/IChatVoicePort');

class ChatGCPVoiceAdapter extends IChatVoicePort {
  constructor() {
    super();
    this.textToSpeechClient = new textToSpeech.TextToSpeechClient();
    this.speechToTextClient = new speech.SpeechClient();
  }

  async textToSpeech(text, options = {}) {
    try {
      if (!text || typeof text !== 'string') {
        throw new Error('Text parameter is required and must be a string');
      }

      // Default options
      const defaultOptions = {
        languageCode: 'en-US',
        ssmlGender: 'NEUTRAL',
        audioEncoding: 'MP3',
        outputFile: null // If null, returns audio buffer instead of saving to file
      };

      const mergedOptions = { ...defaultOptions, ...options };

      // Construct the request
      const request = {
        input: { text: text },
        voice: {
          languageCode: mergedOptions.languageCode,
          ssmlGender: mergedOptions.ssmlGender
        },
        audioConfig: {
          audioEncoding: mergedOptions.audioEncoding
        }
      };

      // Performs the text-to-speech request
      const [response] = await this.textToSpeechClient.synthesizeSpeech(request);

      if (mergedOptions.outputFile) {
        // Save to file if output file is specified
        await writeFile(mergedOptions.outputFile, response.audioContent, 'binary');
        console.log(`[Voice] Audio content written to file: ${mergedOptions.outputFile}`);
        return { success: true, filePath: mergedOptions.outputFile };
      } else {
        // Return audio buffer
        console.log('[Voice] Text-to-speech conversion completed');
        return { success: true, audioBuffer: response.audioContent };
      }
    } catch (error) {
      console.error('Error in text-to-speech conversion:', error);
      throw error;
    }
  }

  async speechToText(audioData, options = {}) {
    try {
      if (!audioData) {
        throw new Error('Audio data parameter is required');
      }

      // Default options
      const defaultOptions = {
        languageCode: 'en-US',
        sampleRateHertz: 16000,
        encoding: 'LINEAR16',
        enableAutomaticPunctuation: true
      };

      const mergedOptions = { ...defaultOptions, ...options };

      let audioContent;

      // Handle different types of audio input
      if (typeof audioData === 'string') {
        // Assume it's a file path
        audioContent = await readFile(audioData);
      } else if (Buffer.isBuffer(audioData)) {
        // Audio data is already a buffer
        audioContent = audioData;
      } else {
        throw new Error('Audio data must be a file path (string) or Buffer');
      }

      // Construct the request
      const request = {
        audio: {
          content: audioContent.toString('base64')
        },
        config: {
          encoding: mergedOptions.encoding,
          sampleRateHertz: mergedOptions.sampleRateHertz,
          languageCode: mergedOptions.languageCode,
          enableAutomaticPunctuation: mergedOptions.enableAutomaticPunctuation
        }
      };

      // Performs the speech-to-text request
      const [response] = await this.speechToTextClient.recognize(request);

      if (!response.results || response.results.length === 0) {
        console.log('[Voice] No speech detected in audio');
        return { success: true, transcript: '', confidence: 0 };
      }

      // Get the first result with highest confidence
      const transcription = response.results
        .map(result => result.alternatives[0])
        .map(alternative => ({
          transcript: alternative.transcript,
          confidence: alternative.confidence || 0
        }))[0];

      console.log(`[Voice] Speech-to-text conversion completed: "${transcription.transcript}"`);
      return {
        success: true,
        transcript: transcription.transcript,
        confidence: transcription.confidence,
        fullResults: response.results
      };
    } catch (error) {
      console.error('Error in speech-to-text conversion:', error);
      throw error;
    }
  }
}

module.exports = ChatGCPVoiceAdapter;