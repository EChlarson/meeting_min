//Create One Clean Block of Text to Export
function getFormattedMinutes() {

   //Date
   const dateInput = document.getElementById("meetingDate")?.value;
   const date = dateInput || new Date().toLocaleDateString();

   //Notes / Minutes
   const summary = document.getElementById("summary")?.textContent || "";
   const decisions = document.getElementById("decisions")?.innerText || "";
   const actions = document.getElementById("minutesActions")?.innerText || "";
   const nextSteps = document.getElementById("nextSteps")?.textContent || "";

   //Attendance
   const attendanceElems = document.querySelectorAll("#attendanceList li input:checked");
   const attendanceNames = Array.from(attendanceElems).map(el => el.parentElement.textContent.trim()).join("\n");

  return `
MEETING MINUTES
DATE: ${date}

ATTENDANCE
${attendanceNames || "No attendees selected"}

SUMMARY
${summary}

DECISIONS
${decisions}

ACTION ITEMS
${actions}

NEXT STEPS
${nextSteps}
`.trim();
}

//Copy to clipboard
document.getElementById("copyBtn").addEventListener("click", () => {
  const text = getFormattedMinutes();
  navigator.clipboard.writeText(text);
  alert("Minutes copied to clipboard");
});

//Download as a Text File
document.getElementById("downloadBtn").addEventListener("click", () => {
  const text = getFormattedMinutes();
  const blob = new Blob([text], { type: "text/plain" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "meeting-minutes.txt";
  link.click();

  URL.revokeObjectURL(link.href);
});

//Email Minutes
document.getElementById("emailBtn").addEventListener("click", () => {
  const subject = encodeURIComponent("Meeting Minutes");
  const body = encodeURIComponent(getFormattedMinutes());

  window.location.href = `mailto:?subject=${subject}&body=${body}`;
});