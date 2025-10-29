/**
 * Stub implementation for the `canvas` package used by pdf.js in Node.
 * pdf.js bundles references to `canvas` even for browser-only usage.
 * During Next.js builds we alias those references to this stub so that
 * webpack does not attempt to resolve the native module.
 *
 * The stub throws if any of the exported members are invoked, which
 * indicates the code executed in an unsupported environment.
 */
const createStub = (member) => {
  throw new Error(
    `The '${member}' export from the stubbed 'canvas' module was invoked. ` +
      "This likely means pdf.js is running in a Node environment where the " +
      "native 'canvas' package should be installed."
  );
};

class StubbedDOMMatrix {
  constructor() {
    createStub("DOMMatrix");
  }
}

class StubbedCanvas {
  constructor() {
    createStub("Canvas");
  }
}

class StubbedImage {
  constructor() {
    createStub("Image");
  }
}

module.exports = {
  createCanvas: () => createStub("createCanvas"),
  Canvas: StubbedCanvas,
  Image: StubbedImage,
  DOMMatrix: StubbedDOMMatrix,
};
