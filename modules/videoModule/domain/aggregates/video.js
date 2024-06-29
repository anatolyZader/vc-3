'strict'
// Video.js aggregate

const { v4: uuidv4 } = require('uuid');
const Snapshot = require('../entities/snapshot');
// eslint-disable-next-line no-unused-vars
const VideoConstructService = require('../../application/services/videoConstructService')
const videoConstructService = new VideoConstructService;

class Video {
  constructor(
    videoYoutubeId,
    ISnapshotPort,
    IAIPort,
    IDatabasePort,
    IYoutubeDataPort,
    IOCRPort,
    youtubeAPIKey
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
    this.ISnapshotPort = ISnapshotPort;
    this.IAIPort = IAIPort;
    this.IOCRPort = IOCRPort;
    this.IDatabasePort = IDatabasePort;
    this.IYoutubeDataPort = IYoutubeDataPort;
    this.youtubeAPIKey = youtubeAPIKey;
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
  } // ensure that init() is not blocking other critical operations if the fetch fails.
  
  async takeSnapshot(videoYoutubeId, ISnapshotPort, IDatabasePort) {
    try {
      const receivedSnapshotDto = await this.ISnapshotPort.takeSnapshot(this.videoYoutubeId, IDatabasePort);
      const snapshotDto = receivedSnapshotDto;
      const snapshot = new Snapshot(snapshotDto.videoYoutubeId, snapshotDto.timestamp, this.IocrPort, IDatabasePort);
      await this.IdatabasePort.saveSnapshot(this.videoYoutubeId,snapshot);
      console.log('new snapshot saved successfully!');
      return snapshotDto;
    } catch (error) {
        console.error('Error taking snapshot:', error);
        throw error;
    }
  }

  async downloadTranscript(videoYoutubeId, youtubeAPIKey, IYoutubeDataPort, IDatabasePort) {
    try {
        // const transcript = await this.IyoutubeDataPort.downloadTranscript(videoId);
        const transcript = await IYoutubeDataPort.downloadTranscript(videoYoutubeId, youtubeAPIKey);
        IDatabasePort.saveTranscript(transcript, videoYoutubeId);
        return transcript; 
    } catch (error) {
        console.error('Error downloading transcript:', error);
        throw error;
    }
  }
}

module.exports = Video;