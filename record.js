 let mediaRecorder;
  let audioChunks = [];
  let timerInterval;
  let secondsElapsed = 0;

  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.start();
        startTimer();

        mediaRecorder.ondataavailable = event => {
          audioChunks.push(event.data);
        };
      })
      .catch(error => {
        alert("Microphone access denied.");
        console.error(error);
      });
  }

  function stopRecording() {
    if (!mediaRecorder) return;

    mediaRecorder.stop();
    stopTimer();

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = document.getElementById("audioPlayback");
      audio.src = audioUrl;
      audio.style.display = "block";
    };
  }

  function startTimer() {
    secondsElapsed = 0;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
      secondsElapsed++;
      updateTimerDisplay();
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
  }

  function updateTimerDisplay() {
    const minutes = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
    const seconds = String(secondsElapsed % 60).padStart(2, "0");
    document.getElementById("timer").textContent = `${minutes}:${seconds}`;
   }