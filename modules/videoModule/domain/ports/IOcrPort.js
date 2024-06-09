class IOcrPort {
    constructor() {
      if (new.target === IOcrPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
}

module.exports = IOcrPort;