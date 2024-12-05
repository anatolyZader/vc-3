'use strict';
/* eslint-disable no-unused-vars */
// IVideoAppService.js
class IVideoAppService {
  constructor() {
    if (new.target === IVideoAppService) {
      throw new Error('Cannot instantiate an abstract class.');
    }
  }

  async takeSnapshot(videoYoutubeId, IVideoPersistPort, ISnapshotPort) {
    throw new Error('Method not implemented.');
  }


  async downloadTranscript(
    videoYoutubeId,
    youtubeAPIKey,
    IyoutubeDataPort,
    IVideoPersistPort
  ) {
    throw new Error('Method not implemented.');
  }
}

module.exports = IVideoAppService;
