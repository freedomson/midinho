// audioWorker.js

importScripts('./tts/app-tts.js');
importScripts('./tts/sherpa-onnx-tts.js');
importScripts('./tts/sherpa-onnx-wasm-main-tts.js');

self.onmessage = async function (e) {
  const { speachStr, speachStrTokens, final } = e.data;
  const audioNode = await generateAudioNode(speachStr);
  self.postMessage({...audioNode, speachStrTokens, final});
};

function generateBtn(text) {
  let speakerId = 0
  let speedInput = 1
  let audio = tts.generate({text : text, sid : speakerId, speed : speedInput});
  return {audio,sampleRate: tts.sampleRate};
}

async function generateAudioNode(str) {
  return generateBtn(str);
}
