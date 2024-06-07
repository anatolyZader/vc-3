// Video.js aggregate

const { v4: uuidv4 } = require('uuid');
const Snapshot = require('../entities/snapshot.js');
const Transcript = require('../entities/transcript.js');
const CodeSnippet = require('../entities/codeSnippet.js');
const TextSnippet = require('../entities/textSnippet.js');
const videoConstructService = require('../services/videoConstructService.js');

const youtubeAPIKey = process.env.YOUTUBE_API_KEY || '';

class Video {
  constructor(
    videoYoutubeId,
    videoConstructService,  
    IsnapshotPort,
    IaiPort,
    IdatabasePort,
    IyoutubeDataPort,
    IocrPort
  ) {
    this.videoYoutubeId = videoYoutubeId;
    this.videoId = uuidv4();   
    this.title = 'default title';
    this.author = 'default author';
    this.duration = 0;
    this.description = 'default description';
    this.snapshots = [];
    this.codeSnippets = [];
    this.textSnippets = [];
    this.IsnapshotPort = IsnapshotPort;
    this.IaiPort = IaiPort;
    this.IocrPort = IocrPort;
    this.IdatabasePort = IdatabasePort;
    this.IyoutubeDataPort = IyoutubeDataPort;
    this.videoConstructService = videoConstructService;
    this.init(); // Automatically fetch video details when Video object is instantiated
  }
  
  async init() {
    try {
      const videoData = await this.videoConstructService.fetchVideoData(this.videoYoutubeId); // Await the asynchronous fetch operation
      this.title = videoData.title;
      this.author = videoData.author;
      this.duration = videoData.duration;
      this.description = videoData.description;
    } catch (error) {
      console.error("Error initializing video details:", error);
      throw error;
    }
  }
  
  async takeSnapshot(videoYoutubeId, youtubeApiKey, snapshotPort, databasePort) {
    try {
      const receivedSnapshotDto = await this.IsnapshotPort.takeSnapshot(this.videoYoutubeId, youtubeAPIKey);
      const snapshotDto = receivedSnapshotDto;
      const snapshot = new Snapshot(snapshotDto.videoYoutubeId, snapshotDto.timestamp, this.IocrPort, databasePort);
      await this.IdatabasePort.saveSnapshot(this.videoYoutubeId, snapshot);
      console.log('new snapshot saved successfully!');
      return snapshotDto;
    } catch (error) {
        console.error('Error taking snapshot:', error);
        throw error;
    }
  }

  async downloadTranscript(videoId) {
    try {
        const transcript = await this.IyoutubeDataPort.downloadTranscript(videoId);
        return transcript;
    } catch (error) {
        console.error('Error downloading transcript:', error);
        throw error;
    }
  }
}

module.exports = Video;