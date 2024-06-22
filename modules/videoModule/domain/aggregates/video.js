// Video.js aggregate

const { v4: uuidv4 } = require('uuid');
const Snapshot = require('../entities/snapshot');

const videoConstructService = require('../../application/services/videoConstructService');
const youtubeAPIKey = process.env.YOUTUBE_API_KEY || '';

class Video {
  constructor(
    videoYoutubeId,
    // videoConstructService,  
    ISnapshotPort,
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
    this.IsnapshotPort = ISnapshotPort;
    this.IaiPort = IaiPort;
    this.IocrPort = IocrPort;
    this.IdatabasePort = IdatabasePort;
    this.IyoutubeDataPort = IyoutubeDataPort;
    this.videoConstructService = videoConstructService;

    this.videoId = 123456123456 // remove this line!!!!!!!!!!!!!!!!!!!!!!!!!!!

    this.init(); // Automatically fetch video details when Video object is instantiated
  }
  
  async init() {
    try {
      const videoData = await this.videoConstructService.fetchVideoData(this.videoYoutubeId); 
      this.title = videoData.title;
      this.author = videoData.author;
      this.duration = videoData.duration;
      this.description = videoData.description;
    } catch (error) {
      console.error("Error initializing video details:", error);
      throw error;
    }
  }
  
  async takeSnapshot(videoYoutubeId, ISnapshotPort, databasePort) {
    try {
      const receivedSnapshotDto = await this.ISnapshotPort.doSnapshot(this.videoYoutubeId, youtubeAPIKey);
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

  async downloadTranscript(videoId, IDatabasePort) {
    try {
        // const transcript = await this.IyoutubeDataPort.downloadTranscript(videoId);
        const transcript = 'This is a video transcript';
        IDatabasePort.saveTranscript(transcript, videoId);
        return transcript; 
    } catch (error) {
        console.error('Error downloading transcript:', error);
        throw error;
    }
  }
}

module.exports = Video;