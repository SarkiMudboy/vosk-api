var AjaxURL = 'http://127.0.0.1:5000/media';

let audioIN = { audio: true };

// audio is true, for recording

// Access the permission for use
// the microphone
navigator.mediaDevices.getUserMedia(audioIN)
// 'then()' method returns a Promise
.then(function (mediaStreamObj) {

	// Chunk array to store the audio data
    let dataArray = [];

    // Start record
    let start = document.getElementById('btnStart');

    // Stop record
    let stop = document.getElementById('btnStop');

    // This is the main thing to recorded
    // the audio 'MediaRecorder' API
    let mediaRecorder = new MediaRecorder(mediaStreamObj);
    // Pass the audio stream

    // Start event
    start.addEventListener('click', function (ev) {
    mediaRecorder.start(1000);
    console.log(mediaRecorder.state);
    })

   	// Stop event
    stop.addEventListener('click', function (ev) {
    mediaRecorder.stop();
    console.log(mediaRecorder.state);
    });

    mediaRecorder.ondataavailable = function (ev) {
    	dataArray.push(ev.data);

    	const audioUrl = URL.createObjectURL(ev.data);
      recordedAudio = new Audio(audioUrl);
      recordedAudio.play();

      // blob of type mp3
      let audioData = new Blob(dataArray, { 'type': 'audio/mp3;' });

	    (async () => {
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
	    })();

    }
})
  // If any error occurs then handles the error
.catch(function (err) {
    console.log(err.name, err.message);
});

const blobToBase64 = (blob) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = function () {
      resolve(reader.result);
    };
  });
};