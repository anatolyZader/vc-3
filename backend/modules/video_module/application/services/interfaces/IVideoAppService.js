'use strict';

// IVideoAppService.js
class IVideoAppService {
  constructor() {
    if (new.target === IVideoAppService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  // eslint-disable-next-line no-unused-vars
  async takeSnapshot(videoYoutubeId, snapshotAdapter, postgresAdapter) {
    throw new Error('Method not implemented.');
  }

  // eslint-disable-next-line no-unused-vars
  async downloadTranscript(
    videoYoutubeId,
    youtubeAPIKey,
    youtubeDataAdapter,
    postgresAdapter
  ) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IVideoAppService;
