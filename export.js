/***************************************
 * EXPORT HELPERS
 * - Builds a single clean text block
 * - Supports Email / Copy / Download
 ***************************************/

/**
 * Build ONE clean block of text for exporting.
 * This pulls:
 * - Meeting title/date
 * - Present attendees (based on attendance checkboxes)
 * - The minutes textarea text
 */
function getFormattedMinutes() {
  const title = document.getElementById("meetingTitle")?.value.trim() || "Meeting";
  const date = document.getElementById("meetingDate")?.value || new Date().toLocaleDateString();
  const minutes = document.getElementById("meetingMinutes")?.value || "";

  // Attendees are stored in localStorage (record.js)
  const attendees = getAttendees();
  const presentSelections = getCurrentAttendanceSelection();
  const presentMap = new Map(presentSelections.map(a => [a.attendeeId, a.present]));

  const presentNames = attendees
    .filter(a => presentMap.get(a.id))
    .map(a => a.name)
    .join("\n");

  return `
MEETING MINUTES

Title: ${title}
Date: ${date}

ATTENDANCE
${presentNames || "None recorded"}

----------------------------------------

${minutes}
`.trim();
}

/***************************************
 * EMAIL EXPORT
 * - Opens default mail app (mailto)
 * - Auto-fills recipients/subject/body
 * - Falls back to copying if message is too long
 ***************************************/
document.getElementById("emailBtn")?.addEventListener("click", async () => {
  const title = document.getElementById("meetingTitle")?.value.trim() || "Meeting";
  const date = document.getElementById("meetingDate")?.value || new Date().toLocaleDateString();
  const minutesText = getFormattedMinutes();

  // Build recipients from present attendees who have emails
  const attendees = getAttendees();
  const presentSelections = getCurrentAttendanceSelection();
  const presentMap = new Map(presentSelections.map(a => [a.attendeeId, a.present]));

  const recipients = attendees
    .filter(a => presentMap.get(a.id))
    .map(a => (a.email || "").trim())
    .filter(email => email.includes("@"));

  if (!recipients.length) {
    alert("No attendee emails selected. Mark attendees present and add emails in Attendees.");
    return;
  }

  const subject = `Meeting Minutes - ${title} (${date})`;

  // mailto URLs have length limits (varies by browser/email app).
  // If too long, we copy instead.
  const mailtoUrl =
    `mailto:${encodeURIComponent(recipients.join(","))}` +
    `?subject=${encodeURIComponent(subject)}` +
    `&body=${encodeURIComponent(minutesText)}`;

  if (mailtoUrl.length > 1800) {
    try {
      await navigator.clipboard.writeText(minutesText);
      alert("Email is too long for mailto. Minutes copied to clipboard instead.");
    } catch {
      alert("Email is too long for mailto. Please copy the minutes manually.");
    }
    return;
  }

  window.location.href = mailtoUrl;
});

/***************************************
 * COPY EXPORT
 * - Copies formatted minutes to clipboard
 ***************************************/
document.getElementById("copyBtn")?.addEventListener("click", async () => {
  const minutesText = getFormattedMinutes();

  try {
    await navigator.clipboard.writeText(minutesText);
    alert("Copied!");
  } catch (e) {
    console.error(e);
    alert("Copy failed. Your browser may block clipboard access.");
  }
});

/***************************************
 * DOWNLOAD EXPORT
 * - Downloads a .txt file with formatted minutes
 ***************************************/
document.getElementById("downloadBtn")?.addEventListener("click", () => {
  const title = document.getElementById("meetingTitle")?.value.trim() || "Meeting";
  const date = document.getElementById("meetingDate")?.value || "";
  const minutesText = getFormattedMinutes();

  // Nice filename: 2026-03-03_Meeting-Minutes_Test-AI.txt
  const safeTitle = title.replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-");
  const safeDate = date || new Date().toISOString().slice(0, 10);
  const filename = `${safeDate}_Meeting-Minutes_${safeTitle || "Meeting"}.txt`;

  const blob = new Blob([minutesText], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
});