let mediaRecorder;
let audioChunks = [];
let timerInterval;
let secondsElapsed = 0;
let currentMeetingId = null;

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
    const title = document.getElementById("meetingTitle").value.trim();
    const date = document.getElementById("meetingDate").value;
    const notes = document.getElementById("meetingNotes").value;
    const minutes = document.getElementById("meetingMinutes")?.value || "";

    const attendanceCheckboxes = document.querySelectorAll("#attendanceList input");
    const attendance = [];
    attendanceCheckboxes.forEach(box => {
      attendance.push({
        name: box.parentElement.textContent.trim(),
        present: box.checked
      });
    });

    let meetings = getMeetings();

    // Build meeting object
    const meeting = {
      id: currentMeetingId ?? Date.now(),
      title,
      date,
      notes,
      minutes,
      attendance
    };

    if (currentMeetingId === null) {
      // CREATE
      meetings.push(meeting);
      alert("Meeting saved.");
    } else {
      // UPDATE
      meetings = meetings.map(m => (m.id === currentMeetingId ? meeting : m));
      alert("Meeting updated.");
    }

    setMeetings(meetings);

    // If you're on Saved tab, refresh list
    if (document.getElementById("view-saved")?.classList.contains("active")) {
      renderSavedMeetings();
    }
  }

//Navigation
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

//Save Meeting
function getMeetings() {
  return JSON.parse(localStorage.getItem("meetings")) || [];
}

function setMeetings(meetings) {
  localStorage.setItem("meetings", JSON.stringify(meetings));
}

function renderSavedMeetings() {
  const list = document.getElementById("savedMeetingsList");
  const meetings = getMeetings();

  if (!meetings.length) {
    list.innerHTML = "No saved meetings yet.";
    return;
  }

  // newest first
  const sorted = [...meetings].sort((a, b) => b.id - a.id);

  list.innerHTML = sorted.map(m => {
    const title = m.title?.trim() || "Untitled Meeting";
    const date = m.date || "No date";
    return `
      <div class="saved-item" style="display:flex; justify-content:space-between; gap:12px; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
        <div>
          <div style="font-weight:600;">${escapeHtml(title)}</div>
          <div style="font-size:12px; color:#666;">${escapeHtml(date)}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="button" onclick="openMeeting(${m.id})">Open</button>
          <button class="button" onclick="deleteMeeting(${m.id})">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

function openMeeting(meetingId) {
  const meetings = getMeetings();
  const meeting = meetings.find(m => m.id === meetingId);
  if (!meeting) return;

  currentMeetingId = meeting.id;

  document.getElementById("meetingTitle").value = meeting.title || "";
  document.getElementById("meetingDate").value = meeting.date || "";
  document.getElementById("meetingNotes").value = meeting.notes || "";

  const minutesEl = document.getElementById("meetingMinutes");
  if (minutesEl) minutesEl.value = meeting.minutes || "";

  // Restore attendance
  if (Array.isArray(meeting.attendance)) {
    const boxes = document.querySelectorAll("#attendanceList input");
    boxes.forEach(box => {
      const name = box.parentElement.textContent.trim();
      const match = meeting.attendance.find(a => a.name === name);
      if (match) box.checked = !!match.present;
    });
  }

  // Change button label
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.textContent = "Update Meeting";

  switchView("view-meeting");
}

function deleteMeeting(meetingId) {
  const meetings = getMeetings();
  const filtered = meetings.filter(m => m.id !== meetingId);
  setMeetings(filtered);
  renderSavedMeetings();
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => btn.classList.remove("active"));
  const btn = document.querySelector(`.nav-btn[data-target="${viewId}"]`);
  if (btn) btn.classList.add("active");
}

// tiny helper so titles can’t break your HTML
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function newMeeting() {
  currentMeetingId = null;

  document.getElementById("meetingTitle").value = "";
  document.getElementById("meetingDate").value = "";
  document.getElementById("meetingNotes").value = "";

  const minutesEl = document.getElementById("meetingMinutes");
  if (minutesEl) minutesEl.value = "";

  document.querySelectorAll("#attendanceList input").forEach(box => (box.checked = false));

  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.textContent = "Save Meeting";
}