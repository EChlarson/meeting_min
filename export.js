//Create One Clean Block of Text to Export
function getFormattedMinutes() {
  const title = document.getElementById("meetingTitle")?.value.trim() || "Meeting";
  const date = document.getElementById("meetingDate")?.value || new Date().toLocaleDateString();
  const minutes = document.getElementById("meetingMinutes")?.value || "";

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
    alert("No attendee emails selected. Mark attendees present and add emails in Attendees.");
    return;
  }

  const subject = encodeURIComponent(`Meeting Minutes - ${title} (${date})`);
  const body = encodeURIComponent(minutesText);

  window.location.href = `mailto:${recipients.join(",")}?subject=${subject}&body=${body}`;
});

