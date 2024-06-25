/* eslint-disable no-unused-vars */
class IDatabasePort {
    constructor() {
      if (new.target === IDatabasePort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
  
    async saveVideo(video) {
      throw new Error("Method 'saveVideo(video)' must be implemented.");
    }
  
    async findVideoById(id) {
      throw new Error("Method 'findVideoById(id)' must be implemented.");
    }
  
    async findAllVideos() {
      throw new Error("Method 'findAllVideos()' must be implemented.");
    }
  
    async saveSnapshot(videoYoutubeId, snapshot) {
      throw new Error("Method 'saveSnapshot(videoYoutubeId, snapshot)' must be implemented.");
    }
  
    async findSnapshotById(id) {
      throw new Error("Method 'findSnapshotById(id)' must be implemented.");
    }
  
    async findAllSnapshotsByVideoId(videoId) {
      throw new Error("Method 'findAllSnapshotsByVideoId(videoId)' must be implemented.");
    }
  
    async saveCodeSnippet(codeSnippet) {
      throw new Error("Method 'saveCodeSnippet(codeSnippet)' must be implemented.");
    }

    async saveCodeExplanation(codeExplanation) {
      throw new Error("Method 'saveCodeExplanation(codeExplanation))' must be implemented.");
    }
  
    async findCodeSnippetById(id) {
      throw new Error("Method 'findCodeSnippetById(id)' must be implemented.");
    }
  
    async findAllCodeSnippetsbyVideoId(snapshotId) {
      throw new Error("Method 'findAllCodeSnippetsbyVideoId(snapshotId)' must be implemented.");
    }
  
    async saveTextSnippet(textSnippet) {
      throw new Error("Method 'saveTextSnippet(textSnippet)' must be implemented.");
    }

    async saveTextExplanation(textExplanation) {
      throw new Error("Method 'saveTextExplanation(textExplanation))' must be implemented.");
    }
  
    async findTextSnippetById(id) {
      throw new Error("Method 'findTextSnippetById(id)' must be implemented.");
    }
  
    async findAllTextSnippetsbyVideoId(snapshotId) {
      throw new Error("Method 'findAllTextSnippetsbyVideoId(snapshotId)' must be implemented.");
    }
  
    async saveTranscript(transcript, videoYoutubeId) {
      throw new Error("Method 'saveTranscript(transcript, videoYoutubeId)' must be implemented.");
    }
  
    async findTranscriptByVideoId(id) {
      throw new Error("Method 'findTranscriptByVideoId(id)' must be implemented.");
    }
  
    async saveVideoData(videoDataDTO, videoYoutubeId) {
      throw new Error("Method 'saveVideoData(videoDataDTO, videoYoutubeId)' must be implemented.");
    }
  
    async findVideoDataByVideoId(id) {
      throw new Error("Method 'findVideoDataByVideoId(id)' must be implemented.");
    }
  }
  
  module.exports = IDatabasePort;