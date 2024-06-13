class IOCRPort {
    constructor() {
      if (new.target === IOCRPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
}

module.exports = IOCRPort;