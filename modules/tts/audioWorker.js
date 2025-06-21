// audioWorker.js
self.onmessage = function (e) {
  const { speachStr, speachStrTokens, final } = e.data;
  console.log("GENERATING")
  const audioNode = generateAudioNode(speachStr);
  console.log("GENERATED")
  self.postMessage({...audioNode, speachStrTokens, final});
};

function generateBtn(text) {
  let speakerId = 0
  let speedInput = 1
  let audio = tts.generate({text : text, sid : speakerId, speed : speedInput});
  return {audio,sampleRate: tts.sampleRate};
}

function generateAudioNode(str) {
  return generateBtn(str);
}
