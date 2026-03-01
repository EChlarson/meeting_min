let mediaRecorder;
let audioChunks = [];
let timerInterval;
let secondsElapsed = 0;
let currentMeetingId = null;
const DRAFT_KEY = "meetingDraft";
let autoSaveTimer = null;

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
    document.querySelectorAll("#attendanceList li").forEach(li => {
      const present = li.querySelector('input[type="checkbox"]').checked;
      const name = li.querySelector(".name").textContent.trim();
      const email = li.querySelector(".email").value.trim();

      attendance.push({ name, email, present });
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

    clearDraft();
    saveDraft(); // immediately store the latest state as a fresh draft

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
    document.querySelectorAll("#attendanceList li").forEach(li => {
      const name = li.querySelector(".name").textContent.trim();
      const match = meeting.attendance.find(a => a.name === name);
      if (!match) return;

      li.querySelector('input[type="checkbox"]').checked = !!match.present;
      li.querySelector(".email").value = match.email || "";
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

// Auto Save 
function collectDraftData() {
  const title = document.getElementById("meetingTitle")?.value || "";
  const date = document.getElementById("meetingDate")?.value || "";
  const notes = document.getElementById("meetingNotes")?.value || "";
  const minutes = document.getElementById("meetingMinutes")?.value || "";

  const attendance = [];
    document.querySelectorAll("#attendanceList li").forEach(li => {
      const present = li.querySelector('input[type="checkbox"]').checked;
      const name = li.querySelector(".name").textContent.trim();
      const email = li.querySelector(".email").value.trim();

      attendance.push({ name, email, present });
    });

  return {
    currentMeetingId, // so drafts stay tied to an opened meeting
    title,
    date,
    notes,
    minutes,
    attendance,
    savedAt: Date.now()
  };
}

function saveDraft() {
  const draft = collectDraftData();
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

function loadDraft() {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return;

  let draft;
  try {
    draft = JSON.parse(raw);
  } catch {
    return;
  }

  // restore current meeting context
  currentMeetingId = draft.currentMeetingId ?? null;

  if (document.getElementById("meetingTitle")) document.getElementById("meetingTitle").value = draft.title || "";
  if (document.getElementById("meetingDate")) document.getElementById("meetingDate").value = draft.date || "";
  if (document.getElementById("meetingNotes")) document.getElementById("meetingNotes").value = draft.notes || "";
  if (document.getElementById("meetingMinutes")) document.getElementById("meetingMinutes").value = draft.minutes || "";

  // restore attendance
  if (Array.isArray(draft.attendance)) {
    document.querySelectorAll("#attendanceList li").forEach(li => {
      const name = li.querySelector(".name").textContent.trim();
      const match = draft.attendance.find(a => a.name === name);
      if (!match) return;

      li.querySelector('input[type="checkbox"]').checked = !!match.present;
      li.querySelector(".email").value = match.email || "";
    });
  }

  // update save button label based on whether editing an existing meeting
  const saveBtn = document.getElementById("saveBtn");
  if (saveBtn) saveBtn.textContent = currentMeetingId ? "Update Meeting" : "Save Meeting";
}

function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}

function startAutoSave() {
  // Save frequently, but lightly
  if (autoSaveTimer) clearInterval(autoSaveTimer);
  autoSaveTimer = setInterval(saveDraft, 2000);

  // Also save on user interactions (more responsive)
  const watchIds = ["meetingTitle", "meetingDate", "meetingNotes", "meetingMinutes"];
  watchIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", saveDraft);
  });

  document.querySelectorAll("#attendanceList input").forEach(box => {
    box.addEventListener("change", saveDraft);
  });
}

window.addEventListener("load", () => {
  loadDraft();
  startAutoSave();
});

//Email 
document.getElementById("emailBtn").addEventListener("click", () => {
  const title = document.getElementById("meetingTitle")?.value.trim() || "Meeting";
  const date = document.getElementById("meetingDate")?.value || new Date().toLocaleDateString();

  const minutesText = getFormattedMinutes(); // your existing formatter

  // recipients = checked attendees with valid-looking emails
  const recipients = [];
  document.querySelectorAll("#attendanceList li").forEach(li => {
    const present = li.querySelector('input[type="checkbox"]').checked;
    const email = li.querySelector(".email").value.trim();

    if (present && email.includes("@")) recipients.push(email);
  });

  if (!recipients.length) {
    alert("No attendee emails selected. Check attendance and add emails.");
    return;
  }

  const subject = encodeURIComponent(`Meeting Minutes - ${title} (${date})`);
  const body = encodeURIComponent(minutesText);

  // mailto supports comma-separated recipients
  window.location.href = `mailto:${recipients.join(",")}?subject=${subject}&body=${body}`;
});

