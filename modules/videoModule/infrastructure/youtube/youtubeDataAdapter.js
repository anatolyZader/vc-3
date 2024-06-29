/* eslint-disable no-unused-vars */

//youtubeDataAdapter.js

const { google } = require('googleapis');

class YoutubeDataAdapter {
  constructor(youtubeApiKey) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: youtubeApiKey
    });
  }

  fetchVideoData(videoYoutubeID) {
    // Fetch video data from YouTube API
    const id = 'mock id';
    const title = 'mock title';
    const author = 'mock author';
    const duration = 0;
    const description = 'mock description';
    const videoInfoDto = { id, title, author, duration, description };
    return videoInfoDto;
  }

  downloadTranscript(videoId) {
    // Fetch transcript from YouTube API
    return 'mock transcript';
  }
}

module.exports = YoutubeDataAdapter;
