function generateMinutes() {
  const text = document.getElementById("transcript").value;

  // Reset outputs
  document.getElementById("summary").textContent = "";
  document.getElementById("decisions").innerHTML = "";
  document.getElementById("minutesActions").innerHTML = "";
  document.getElementById("nextSteps").textContent = "";

  if (!text.trim()) {
    alert("Please add transcript or notes first.");
    return;
  }

  const lines = text.split("\n").map(line => line.trim()).filter(Boolean);

  // Simple rules-based parsing
  lines.forEach(line => {
    const lower = line.toLowerCase();

    if (lower.startsWith("decision")) {
      addListItem("decisions", line);
    }
    else if (
      lower.startsWith("action") ||
      lower.startsWith("follow up") ||
      lower.startsWith("prepare") ||
      lower.startsWith("send")
    ) {
      addListItem("minutesActions", line);
    }
    else {
      // First meaningful sentence becomes summary
      if (!document.getElementById("summary").textContent) {
        document.getElementById("summary").textContent = line;
      }
    }
  });

  document.getElementById("nextSteps").textContent =
    "Review action items and confirm assignments before next meeting.";
}

function addListItem(elementId, text) {
  const li = document.createElement("li");
  li.textContent = text;
  document.getElementById(elementId).appendChild(li);
}