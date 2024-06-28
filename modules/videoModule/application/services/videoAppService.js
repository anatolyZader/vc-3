'strict'
// videoAppService.js
class VideoAppService {
    constructor({video, snapshotAdapter, postgresAdapter}) {
        console.log('VideoAppService instantiated!');
        this.video = video;  
        this.snapshotAdapter = snapshotAdapter;
        this.postgresAdapter = postgresAdapter;     
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

    async downloadTranscript(videoYoutubeId, youtubeAPIKey, youtubeDataAdapter, postgresAdapter) {
        try {
            await this.video.downloadTranscript(videoYoutubeId, youtubeAPIKey, youtubeDataAdapter, postgresAdapter);
        } catch (error) {
            console.error('Error downloading transcript:', error);
            throw error;
        }
    }
}

// Export the class
module.exports = VideoAppService;