// https://k2-fsa.github.io/sherpa/onnx/tts/wasm/build.html

let index = 0;
let tts = null;
let audioCtx = null;

Module = {};

// https://emscripten.org/docs/api_reference/module.html#Module.locateFile
Module.locateFile = function(path, scriptDirectory = '') {
  // console.log(`path: ${path}, scriptDirectory: ${scriptDirectory}`);
  return `./models/${lang}/${path}`;
};

// https://emscripten.org/docs/api_reference/module.html#Module.locateFile
Module.setStatus = function(status) {
  // console.log(`status ${status}`,status);
  self.postMessage({status});
  // const statusElement = document.getElementById('status');
  // if (status == "Running...") {
  //   status = 'Model downloaded. Initializing text to speech model...'
  // }
  // statusElement.textContent = status;
  // if (status === '') {
  //   statusElement.style.display = 'none';
  //   // statusElement.parentNode.removeChild(statusElement);

  //   document.querySelectorAll('.tab-content').forEach((tabContentElement) => {
  //     tabContentElement.classList.remove('loading');
  //   });
  // } else {
  //   statusElement.style.display = 'block';
  //   document.querySelectorAll('.tab-content').forEach((tabContentElement) => {
  //     tabContentElement.classList.add('loading');
  //   });
  // }
};

Module.onRuntimeInitialized = function() {
  //console.log('Model files downloaded!');
  console.log('Initializing tts ......');
  tts = createOfflineTts(Module)
  // Preload
  tts.generate({ text: ".", sid: 0, speed: 1 });
  // if (tts.numSpeakers > 1) {
  //   speakerIdLabel.innerHTML = `Speaker ID (0 - ${tts.numSpeakers - 1}):`;
  // }
  self.postMessage({ workerReady: true });
  // generateBtn.disabled = false;
};
