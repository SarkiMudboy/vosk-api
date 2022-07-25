let recBuffers = [[], []];
let recLength = 0;
let numChannels = 1;
let listening = false;
let timeout = null;
let constraints = {
    audio: true
};
let failedToGetUserMedia = false;
let recContext = null
let recSource = null
let recNode = null;

if (navigator.getUserMedia) {
    navigator.getUserMedia(constraints, (stream) => {
        init(stream);
    }, (err) => {
        alert('Unable to access audio.\n\n' + err);
        console.log('The following error occurred: ' + err);
        failedToGetUserMedia = true;
    });
}
else if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        init(stream);
    }).catch((err) => {
        alert('Unable to access audio.\n\n' + err);
        console.log('The following error occurred: ' + err);
        failedToGetUserMedia = true;
    });
}
else failedToGetUserMedia = true;


function beginRecording() {

    if (!listening) {   
        listening = true;
        recLength = 0;
    }
    recBuffers = [[], []];
    console.log('recording....')
    timeout = setTimeout(() => {
        endRecording();
    }, 2000);
}

function endRecording() {

    // clearTimeout(timeout);
    // timeout = null;

    audioBlob = exportWAV(false);
    // console.log(audioBlob)
    upload(audioBlob)

    // this one is for playing the file back
    audioBlobToPlay = exportWAV(true)

    const audioUrl = URL.createObjectURL(audioBlobToPlay);
    const audio = new Audio(audioUrl);
    audio.play();
    
    beginRecording()
    
}

function stopRec(){
    clearTimeout(timeout);
    timeout = null;
    console.log("RECORDING STOPPED");
    listening = false
    recNode.disconnect(recContext.destination)
    recSource.disconnect(recNode)
}

async function init(stream) {
    let audioContext = new AudioContext();
    let source = audioContext.createMediaStreamSource(stream);
    let context = source.context;

    await context.audioWorklet.addModule('js/recorderWorkletProcessor.js')
    const node = new AudioWorkletNode(context, "recorder.worklet")

    node.port.onmessage = (e) => {
        if (!listening) return;

        for (var i = 0; i < numChannels; i++) {
            recBuffers[i].push(e.data);
        }

        recLength += recBuffers[0][0].length;

    }

    source.connect(node);
    node.connect(context.destination);
    console.log(context.sampleRate)

    recContext = context
    recNode = node
    recSource = source
}

function mergeBuffers(buffers, len) {
    let result = new Float32Array(len);
    let offset = 0;
    for (var i = 0; i < buffers.length; i++) {
        result.set(buffers[i], offset);
        offset += buffers[i].length;
    }
    return result;
}

function interleave(inputL, inputR) {
    let len = inputL.length + inputR.length;
    let result = new Float32Array(len);

    let index = 0;
    let inputIndex = 0;

    while (index < len) {
        result[index++] = inputL[inputIndex];
        result[index++] = inputR[inputIndex];
        inputIndex++;
    }

    return result;
}

function exportWAV(toPlay) {
    let buffers = [];
    for (var i = 0; i < numChannels; i++) {
        buffers.push(mergeBuffers(recBuffers[i], recLength));
    }

    if (!toPlay){
        buffers[0] = downsampleBuffer(buffers[0], 16000, 48000)
    }
    let interleaved = numChannels == 2 ? interleave(buffers[0], buffers[1]) : buffers[0];
    let dataView = encodeWAV(interleaved, recContext);
    let blob = new Blob([ dataView ], { type: 'audio/wav' });
    blob.name = Math.floor((new Date()).getTime() / 1000) + '.wav';

    // listening = false;

    return blob;
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

function encodeWAV(samples, context){
    var buffer = new ArrayBuffer(44 + samples.length * 2);
    var view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, 'RIFF');
    /* file length */
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
    view.setUint16(22, numChannels, true);
    /* sample rate */
    view.setUint32(24, context.sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, context.sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numChannels * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, 'data');
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
}

const upload = async (audioData) => {

    var AjaxURL = 'http://127.0.0.1:5000/media';

    var form = new FormData()
    
    form.append('file', audioData, 'file')
    
    $.ajax({
    type: "POST",
    url: AjaxURL,
    data: form,
    processData: false,
    contentType: false,
    // contentType: 'application/json;charset=UTF-8',
    success: function(result) {

        if (result.response.length !== 0){
            window.console.log(result.response);
            textbox = document.getElementById('output_text')

            if (textbox.value.length == 0){
                textbox.value = result.response
            }else{
                textbox.value += " " + result.response
            }
        }
    }
    });
}

// ----------------------------

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

if (!failedToGetUserMedia){
    beginRecording()
}