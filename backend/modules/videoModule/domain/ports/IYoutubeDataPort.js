/* eslint-disable no-unused-vars */
class IYoutubeDataPort {
    constructor() {
      if (new.target === IYoutubeDataPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
  
    getVideoData(videoYoutubeID) {
      throw new Error("Method 'getVideoData(videoYoutubeID)' must be implemented.");
    }
  
    downloadTranscript(videoId, youtubeAPIKey, IYoutubeDataPort, IDatabasePort) {
      throw new Error("Method 'downloadTranscript(videoId)' must be implemented.");
    }
  }
  
  module.exports = IYoutubeDataPort;
  