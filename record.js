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

  function saveMeeting() {

    const title = document.getElementById("meetingTitle").value;
    const date = document.getElementById("meetingDate").value;
    const notes = document.getElementById("meetingNotes").value;
    const minutes = document.getElementById("meetingMinutes").value;

    const attendanceCheckboxes =
      document.querySelectorAll("#attendanceList input");

    const attendance = [];

    attendanceCheckboxes.forEach(box => {
      attendance.push({
        name: box.parentElement.textContent.trim(),
        present: box.checked
      });
    });

    const meeting = {
      id: Date.now(),
      title,
      date,
      notes,
      minutes,
      attendance
    };

    let meetings =
      JSON.parse(localStorage.getItem("meetings")) || [];

    meetings.push(meeting);

    localStorage.setItem(
      "meetings",
      JSON.stringify(meetings)
    );

    alert("Meeting saved successfully.");
  }

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      // buttons
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      // views
      const target = btn.dataset.target;
      document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
      document.getElementById(target).classList.add("active");

      // optional: refresh saved list when opening Saved tab
      if (target === "view-saved") {
        renderSavedMeetings();
      }
    });
  });