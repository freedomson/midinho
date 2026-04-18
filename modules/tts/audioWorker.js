// audioWorker.js
var lang = ""

function generateBtn(text) {
  let speakerId = 0
  let speedInput = 1
  let audio = tts.generate({text : text, sid : speakerId, speed : speedInput});
  return {audio,sampleRate: tts.sampleRate};
}

function generateAudioNode(str) {
  return generateBtn(str);
}

self.onmessage = function (e) {

  if (e.data?.init) {
    console.log("Initialize worker")
    lang = e.data.lang
    importScripts('./app-tts.js');
    importScripts('./sherpa-onnx-tts.js');
    importScripts(`./models/${lang}/sherpa-onnx-wasm-main-tts.js`);
    return;
  }

  const { speachStr, speachStrTokens, final } = e.data;
  const audioNode = generateAudioNode(speachStr);
  self.postMessage({...audioNode, speachStrTokens, final});
  // Preload
  tts.generate({ text: ".", sid: 0, speed: 1 });
};