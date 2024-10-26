// const { createCanvas, loadImage } = require('canvas');
// const { v4: uuidv4 } = require('uuid'); 
const ISnapshotPort = require('../../domain/ports/ISnapshotPort');

class SnapshotAdapter extends ISnapshotPort {
  constructor(videoYouTubeId, youtubeApiKey) {
    super();
    this.videoYouTubeId = videoYouTubeId;
    this.youtubeApiKey = youtubeApiKey;
  }

  // async takeSnapshot(videoYoutubeId, youtubeApiKey) {

  //    console.log('taking snapshot and saving it to db')
  // }
  //   try {
  //     const snapshotId = uuidv4();
  //     // Get video thumbnail URL from YouTube API
  //     const thumbnailUrl = await this.getThumbnailUrl(videoYoutubeId, youtubeApiKey);

  //     // Load image from URL
  //     const image = await loadImage(thumbnailUrl);

  //     // Create canvas and draw image on it
  //     const canvas = createCanvas(image.width, image.height);
  //     const ctx = canvas.getContext('2d');
  //     ctx.drawImage(image, 0, 0, image.width, image.height);

  //     // Convert canvas to base64 data URL
  //     const dataUrl = canvas.toDataURL('image/png');
  //     const snapshotDto = {
  //       videoYoutubeId: this.videoYouTubeId,
  //       snapshotId: snapshotId,
  //       timestamp: 0,
  //       imageURL: dataUrl,
  //     };
  //     return snapshotDto;
  //   } catch (error) {
  //     console.error('Error taking snapshot:', error);
  //     throw error;
  //   }
  // }


  async getThumbnailUrl(videoYoutubeId, youtubeApiKey) {
    // const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoYoutubeId}&key=${this.youtubeApiKey}&part=snippet`);
    // const data = await response.json();
    // const thumbnailUrl = data.items[0]?.snippet?.thumbnails?.high?.url;

    // if (!thumbnailUrl) {
    //   throw new Error('Thumbnail URL not found');
    // }

    // TODO: return thumbnailUrl instead;
    console.log(youtubeApiKey);
    const stubVariable = videoYoutubeId;
    console.log(stubVariable);
    return "stubString";
  }
}

module.exports = SnapshotAdapter;