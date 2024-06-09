class IOcrPort {
    constructor() {
      if (new.target === IocrPort) {
        throw new Error("Cannot instantiate an abstract class.");
      }
    }
}