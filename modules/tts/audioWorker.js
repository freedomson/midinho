// audioWorker.js
var lang = ""

function generateAudioNode(text) {
  console.log("--------------- AUDIOWORKER  >>>> GENERATING --------------------", text)
  let speakerId = 0
  let speedInput = 1
  let audio = tts.generate({text : text, sid : speakerId, speed : speedInput});
  console.log("--------------- AUDIOWORKER  <<<< GENERATED--------------------", text)
  return {audio,sampleRate: tts.sampleRate};
}

self.onmessage = function (e) {

  if (e.data?.init) {
    console.log("--------------- AUDIOWORKER Initialize worker ---------------")
    lang = e.data.lang
    importScripts('./app-tts.js');
    importScripts('./sherpa-onnx-tts.js');
    importScripts(`./models/${lang}/sherpa-onnx-wasm-main-tts.js`);
    return;
  }

  console.log("--------------- AUDIOWORKER  onmessage ---------------")
  const { id, speachStr, speachStrTokens, final } = e.data;
  const audioNode = generateAudioNode(speachStr);
  self.postMessage({
    id, // ✅ CRITICAL
    ...audioNode,
    speachStrTokens,
    final
  });
};