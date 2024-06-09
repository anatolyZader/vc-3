// Import required dependencies
const video = require('../../domain/aggregates/video'); 
const postgresAdapter = require('../../infrastructure/database/postgresAdapter'); 
const snapshotAdapter = require('../../infrastructure/youtube/snapshotAdapter'); 

// Define the service functions
async function takeSnapshot(videoYoutubeId) {
    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    try {
        await video.takeSnapshot(videoYoutubeId, youtubeApiKey, snapshotAdapter, postgresAdapter);
    } catch (error) {
        console.error('Error taking snapshot:', error);
        throw error;
    }
}

async function downloadTranscript(videoYoutubeId) {
    try {
        await video.downloadTranscript(videoYoutubeId);
    } catch (error) {
        console.error('Error downloading transcript:', error);
        throw error;
    }
}

// Export the service functions
module.exports = {
    takeSnapshot,
    downloadTranscript
};
