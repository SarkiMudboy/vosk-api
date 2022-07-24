
let dataArray = [];
var recording = true;

const main = async () => {

  const context = new AudioContext()
  const microphone = await navigator.mediaDevices.getUserMedia({
    audio:true
  })

  let sampleRate = 16000
  let numOfChannels = 1

  const source = context.createMediaStreamSource(microphone)

  await context.audioWorklet.addModule('js/recorderWorkletProcessor.js')

  const recorder = new AudioWorkletNode(context, "recorder.worklet")

  source.connect(recorder).connect(context.destination)

  recorder.port.onmessage = (e) => {


    // downsample to 16KHz sample rate
    downSampledData = downsampleBuffer(e.data, sampleRate, context.sampleRate)

    // convert to audio/wav format
    let dataView = encodeWAV(downSampledData, context, sampleRate)

    // dataView = convertFloat32To16BitPCM(downSampledData)

    dataArray.push(dataView)

    // // Create a blob file
    // let blob = new Blob([ dataView ], { type: 'audio/wav' });

    // // send to the server
    // upload(blob)
  
    if (!recording){

      console.log("RECORDING STOPPED");
      recorder.disconnect(context.destination);
      source.disconnect(recorder);

      // Create a blob file
      let blob = new Blob(dataArray, { type: 'audio/wav' });

      // send to the server
      upload(blob)

    }
  }
};

// sorry I am not using this but floatTo16BitPCM()
function convertFloat32To16BitPCM(input) {
  const output = new Int16Array(input.length)

  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]))
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  return output

}

function startRec () {
  // start the recording
  main()
}

function stopRec () {
  // stop the recording
  console.log('stopped')
  recording = false
}

// convert to 16Bit PCM
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

// convert to wave format
function encodeWAV(samples, context, sampleRate) {
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
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 4, true);
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
  // convert blob to base64 encoding
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      resolve(reader.result);
    };
  });
};

const upload = async (audioData) => {

        // send the blob containing audio bytes to the flask server

        var AjaxURL = 'http://127.0.0.1:5000/media';

        // const b64 = await blobToBase64(audioData);

        var form = new FormData()
        
        form.append('file', audioData, 'file')

        // const jsonString = JSON.stringify({blob: b64});

        // console.log(jsonString);
        
        $.ajax({
        type: "POST",
        url: AjaxURL,
        data: form,
        processData: false,
        contentType: false,
        // contentType: 'application/json;charset=UTF-8',
        success: function(result) {
            window.console.log(result.response);
        }
});
}

function downsampleBuffer(buffer, rate, sampleRate) {
  if (rate == sampleRate) {
      return buffer;
  }
  if (rate > sampleRate) {
      throw "downsampling rate show be smaller than original sample rate";
  }
  var sampleRateRatio = sampleRate / rate;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Float32Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;
  while (offsetResult < result.length) {
      var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
       // Use average value of skipped samples
      var accum = 0, count = 0;
      for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
          accum += buffer[i];
          count++;
      }
      result[offsetResult] = accum / count;
      // Or you can simply get rid of the skipped samples:
      // result[offsetResult] = buffer[nextOffsetBuffer];
      offsetResult++;
      offsetBuffer = nextOffsetBuffer;
  }
  return result;
}
