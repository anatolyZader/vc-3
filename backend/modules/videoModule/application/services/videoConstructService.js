const YoutubeDataAdapter = require('../../infrastructure/youtube/youtubeDataAdapter');

class VideoConstructService {
  constructor() {
    // if (!youtubeApiKey) {
    //   throw new Error('YOUTUBE_API_KEY is not set');
    // }
    // eslint-disable-next-line no-undef
    this.youtubeDataAdapter = new YoutubeDataAdapter();
  }

  async fetchVideoData(youtubeVideoId) {
    try {
      const fetchedVideoData = await this.youtubeDataAdapter.fetchVideoData(youtubeVideoId);
      // console.log('youtubeDataAdapter at videoConstructService.fetchVideoData(): ', fetchedVideoData);
      const videoData = {
        id: fetchedVideoData.id,
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
