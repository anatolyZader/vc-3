/* eslint-disable no-unused-vars */
class ISnapshotPort {
    constructor() {
      if (new.target === ISnapshotPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
  
    async doSnapshot(videoYoutubeId, snapshotPort, databasePort) {
      throw new Error("Method 'takeSnapshot(videoYoutubeId, youtubeApiKey)' must be implemented.");
    }
  }
  
  module.exports = ISnapshotPort;
  