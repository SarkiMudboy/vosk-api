const main = async () => {
  const context = new AudioContext()
  const microphone = await navigator.mediaDevices.getUserMedia({
    audio:true
  })
  console.log(microphone)
  const source = context.createMediaStreamSource(microphone)
  // const source = new MediaStreamAudioSourceNode(context, {
  //   mediaStream: stream // Your stream here.
  // });

  await context.audioWorklet.addModule('js/recorderWorkletProcessor.js')
  console.log(source)

  const recorder = new AudioWorkletNode(context, "recorder.worklet")

  source.connect(recorder).connect(context.destination)

  recorder.port.onmessage = (e) => {
    // console.log(e.data)
    let dataView = encodeWAV(e.data, context)
    let blob = new Blob([ dataView ], { type: 'audio/wav' });
    console.log(blob)
    upload(blob)
  }

  // source.start()
};

function convertFloat32To16BitPCM(input) {
  const output = new Int16Array(input.length)

  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  return output

}

function startRec () {
  main()
}

function stopRec () {
  console.log('stopped')
  return
}


function floatTo16BitPCM(output, offset, input){
    for (var i = 0; i < input.length; i++, offset+=2){
        var s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view, offset, string){
    for (var i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}


function encodeWAV(samples, context) {
    let buffer = new ArrayBuffer(44 + samples.length * 2);
    let view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, 'WAVE');
    /* format chunk identifier */
    writeString(view, 12, 'fmt ');
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, 1, true);
    /* sample rate */
    view.setUint32(24, context.sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, context.sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, 1 * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
}

const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      resolve(reader.result);
    };
  });
};

const upload = async (audioData) => {

        var AjaxURL = 'http://127.0.0.1:5000/media';

        const b64 = await blobToBase64(audioData);
        const jsonString = JSON.stringify({blob: b64});

        console.log(jsonString);

        $.ajax({
        type: "POST",
        url: AjaxURL,
        data: jsonString,
        contentType: 'application/json;charset=UTF-8',
        success: function(result) {
            window.console.log(result);
        }
});
}
