// Import required dependencies
const video = require('../../domain/aggregates/video');

class VideoAppService {
    constructor(video) {
        console.log('VideoAppService instantiated!');
        this.video = video;
      }

    // eslint-disable-next-line no-unused-vars
    async takeSnapshot(videoYoutubeId, snapshotAdapter, databaseAdapter) {       
        try {
            console.log('Taking snapshot ...')
            // await this.video.doSnapshot();
        } catch (error) {
            console.error('Error taking snapshot:', error);
            throw error;
        }
    }

    async downloadTranscript(videoYoutubeId) {
        try {
            await video.downloadTranscript(videoYoutubeId);
        } catch (error) {
            console.error('Error downloading transcript:', error);
            throw error;
        }
    }
}

// Export the class
module.exports = VideoAppService;