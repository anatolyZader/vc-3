'strict'
// videoAppService.js
class VideoAppService {
    constructor(video) {
        console.log('VideoAppService instantiated!');
        this.video = video;       
      }

    // eslint-disable-next-line no-unused-vars
    async takeSnapshot(videoYoutubeId, snapshotAdapter, postgresAdapter) {       
        try {
            console.log('Taking snapshot ...')
            await this.video.takeSnapshot(videoYoutubeId, snapshotAdapter, postgresAdapter);
        } catch (error) {
            console.error('Error taking snapshot:', error);
            throw error;
        }
    }

    async downloadTranscript(videoYoutubeId, postgresAdapter) {
        try {
            await this.video.downloadTranscript(videoYoutubeId, postgresAdapter);
        } catch (error) {
            console.error('Error downloading transcript:', error);
            throw error;
        }
    }
}

// Export the class
module.exports = VideoAppService;