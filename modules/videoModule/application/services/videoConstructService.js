const IyoutubeDataPort = require('../../ports/IyoutubeDataPort');

const videoData = {
  title: 'default title',
  author: 'default author',
  duration: 0,
  description: 'default description',
};

class VideoConstructService {
  constructor(youtubeApiKey) {
    if (!youtubeApiKey) {
      throw new Error('YOUTUBE_API_KEY is not set');
    }
    this.youtubeDataAdapter = diContainer.resolve('youtubeDataAdapter', youtubeApiKey);
  }

  async fetchVideoData(youtubeVideoId) {
    try {
      const fetchedVideoData = await this.youtubeDataAdapter.getVideoData(youtubeVideoId);
      const videoData = {
        title: fetchedVideoData.title,
        author: fetchedVideoData.author,
        duration: fetchedVideoData.duration,
        description: fetchedVideoData.description,
      };
      return videoData;
    } catch (error) {
      console.error('Error fetching video data:', error);
      throw error;
    }
  }
}

module.exports = VideoConstructService;