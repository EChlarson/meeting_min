let mediaRecorder;
let audioChunks = [];
let recordingStream = null;
let secondsElapsed = 0;
let currentMeetingId = null;
const DRAFT_KEY = "meetingDraft";
let autoSaveTimer = null;
const ATTENDEES_KEY = "attendees";
const AI_ENDPOINT = "https://meeting-minutes-ai.chl20001.workers.dev";

// Attendance 
function getAttendees() {
  return JSON.parse(localStorage.getItem(ATTENDEES_KEY)) || [];
}

function setAttendees(attendees) {
  localStorage.setItem(ATTENDEES_KEY, JSON.stringify(attendees));
}

function renderAttendanceList(selectedAttendance = []) {
  const ul = document.getElementById("attendanceList");
  if (!ul) return;

  const attendees = getAttendees();
  if (!attendees.length) {
    ul.innerHTML = `<li style="color:#666;">No attendees yet. Add them in the Attendees tab.</li>`;
    return;
  }

  // selectedAttendance is an array of { attendeeId, present }
  const presentMap = new Map(
    selectedAttendance.map(a => [a.attendeeId, !!a.present])
  );

  ul.innerHTML = attendees.map(a => {
    const checked = presentMap.get(a.id) ? "checked" : "";
    return `
      <li data-attendee-id="${a.id}">
        <label>
          <input type="checkbox" ${checked}>
          <span class="name">${escapeHtml(a.name)}</span>
        </label>
        <input class="email" type="email" value="${escapeHtml(a.email || "")}" disabled>
      </li>
    `;
  }).join("");
}

function renderAttendeesManager() {
  const container = document.getElementById("attendeesList");
  if (!container) return;

  const attendees = getAttendees();
  if (!attendees.length) {
    container.innerHTML = `<p style="color:#666;">No attendees added yet.</p>`;
    return;
  }

  container.innerHTML = attendees.map(a => `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid #eee;">
      <div>
        <div style="font-weight:600;">${escapeHtml(a.name)}</div>
        <div style="font-size:12px; color:#666;">${escapeHtml(a.email || "")}</div>
      </div>
      <button class="button" onclick="deleteAttendee(${a.id})">Delete</button>
    </div>
  `).join("");
}

function addAttendee() {
  const nameEl = document.getElementById("newAttendeeName");
  const emailEl = document.getElementById("newAttendeeEmail");

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();

  if (!name) {
    alert("Please enter a name.");
    return;
  }

  const attendees = getAttendees();
  attendees.push({ id: Date.now(), name, email });

  setAttendees(attendees);

  nameEl.value = "";
  emailEl.value = "";

  renderAttendeesManager();
  renderAttendanceList(getCurrentAttendanceSelection()); // keep meeting page in sync
  saveDraft(); // so refresh keeps everything
}

function deleteAttendee(attendeeId) {
  const attendees = getAttendees().filter(a => a.id !== attendeeId);
  setAttendees(attendees);

  renderAttendeesManager();
  renderAttendanceList(getCurrentAttendanceSelection());
  saveDraft();
}

function getCurrentAttendanceSelection() {
  // returns [{ attendeeId, present }]
  const selections = [];
  document.querySelectorAll("#attendanceList li").forEach(li => {
    const attendeeId = Number(li.dataset.attendeeId);
    const present = li.querySelector('input[type="checkbox"]').checked;
    selections.push({ attendeeId, present });
  });
  return selections;
}

// Pick the best mime type the browser supports
function pickSupportedMimeType() {
  if (!window.MediaRecorder) return null;

  const types = [
    "audio/mp4",               // often best for iOS
    "audio/webm;codecs=opus",  // common on Chrome/desktop
    "audio/webm"
  ];

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return ""; // browser default
}

// Recording
async function startRecording() {
  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("This browser does not support recording.");
      return;
    }
    if (!window.MediaRecorder) {
      alert("Recording is not supported on this iPhone/iOS version.");
      return;
    }

    const mimeType = pickSupportedMimeType();

    recordingStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];

    const options = mimeType ? { mimeType } : undefined;
    mediaRecorder = new MediaRecorder(recordingStream, options);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onerror = (e) => {
      console.error("Recorder error:", e);
      alert("Recorder error: " + (e?.error?.message || "Unknown error"));
    };

    mediaRecorder.start();
    startTimer();
  } catch (error) {
    console.error(error);
    alert("Mic access failed: " + (error?.message || error));
  }
}

function stopRecording() {
  if (!mediaRecorder) return;

  mediaRecorder.onstop = () => {
    stopTimer();

    const mimeType = mediaRecorder.mimeType || "audio/mp4";
    const audioBlob = new Blob(audioChunks, { type: mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = document.getElementById("audioPlayback");
    audio.src = audioUrl;
    audio.style.display = "block";

    // ✅ IMPORTANT for iPhone: release the microphone
    if (recordingStream) {
      recordingStream.getTracks().forEach(t => t.stop());
      recordingStream = null;
    }
  };

  mediaRecorder.stop();
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

    const attendance = getCurrentAttendanceSelection();
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

  const attendance = getCurrentAttendanceSelection();
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
  renderAttendanceList(draft.attendance || []);

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

  const minutesText = getFormattedMinutes();

  const attendees = getAttendees();
  const presentSelections = getCurrentAttendanceSelection();
  const presentMap = new Map(presentSelections.map(a => [a.attendeeId, a.present]));

  const recipients = attendees
    .filter(a => presentMap.get(a.id))
    .map(a => (a.email || "").trim())
    .filter(email => email.includes("@"));

  if (!recipients.length) {
    alert("No attendee emails selected. Mark attendees present and add their emails in Attendees.");
    return;
  }

  const subject = encodeURIComponent(`Meeting Minutes - ${title} (${date})`);
  const body = encodeURIComponent(minutesText);

  window.location.href = `mailto:${recipients.join(",")}?subject=${subject}&body=${body}`;
});

// Add button on Attendees Tab
window.addEventListener("load", () => {
  loadDraft();
  startAutoSave();

  // Attendees page
  const addBtn = document.getElementById("addAttendeeBtn");
  if (addBtn) addBtn.addEventListener("click", addAttendee);

  // Initial renders
  renderAttendeesManager();
  renderAttendanceList(getCurrentAttendanceSelection());
});

// Helper?
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// AI MIN
document.getElementById("aiMinutesBtn")?.addEventListener("click", async () => {
  const notes = document.getElementById("meetingNotes")?.value || "";
  const title = document.getElementById("meetingTitle")?.value || "";
  const date = document.getElementById("meetingDate")?.value || "";

  if (!notes.trim()) {
    alert("Add notes first.");
    return;
  }

  // present attendee names
    const attendees = getAttendees();
    const presentSelections = getCurrentAttendanceSelection();
    const presentMap = new Map(presentSelections.map(a => [a.attendeeId, a.present]));
    const presentNames = attendees.filter(a => presentMap.get(a.id)).map(a => a.name);

    const btn = document.getElementById("aiMinutesBtn");
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Generating...";

    // NEW: timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, title, date, attendees: presentNames }),
        signal: controller.signal, // NEW
      });

      // NEW: don’t crash if response isn’t JSON
      const data = await res.json().catch(() => ({}));

      // NEW: better error messages (supports {message} or {error})
      if (!res.ok) {
        const msg = data?.message || data?.error || `AI request failed (status ${res.status})`;
        throw new Error(msg);
      }

      // NEW: validate minutes
      const minutes = data.minutes || "";
      if (!minutes) throw new Error("AI returned no minutes.");

      document.getElementById("meetingMinutes").value = minutes;
      saveDraft();
    } catch (e) {
      const msg =
        e.name === "AbortError"
          ? "AI request timed out. Try again."
          : e.message;

      alert("AI failed: " + msg);
    } finally {
      clearTimeout(timeoutId); // NEW
      btn.disabled = false;
      btn.textContent = oldText;
    }
});