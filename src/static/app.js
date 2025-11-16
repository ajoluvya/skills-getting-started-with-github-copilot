document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // small helper to avoid HTML injection when inserting participant names/emails
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

          // build participants list HTML (each participant gets a delete button)
          const participantsHtml =
            details.participants && details.participants.length
              ? details.participants
                  .map(
                    (p) =>
                      `<li class="participant-item" data-email="${escapeHtml(
                        p
                      )}">${escapeHtml(p)} <button class="delete-participant" data-email="${escapeHtml(
                        p
                      )}" data-activity="${escapeHtml(name)}" title="Unregister">✕</button></li>`
                  )
                  .join("")
              : `<li class="participant-empty">No participants yet</li>`;

        activityCard.innerHTML = `
          <h4>${escapeHtml(name)}</h4>
          <p>${escapeHtml(details.description)}</p>
          <p><strong>Schedule:</strong> ${escapeHtml(details.schedule)}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants" aria-live="polite">
            <p class="participants-title"><strong>Participants</strong></p>
            <ul class="participants-list">
              ${participantsHtml}
            </ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Attach delete handlers for participants in this activity card
        activityCard.querySelectorAll(".delete-participant").forEach((btn) => {
          btn.addEventListener("click", async (ev) => {
            ev.preventDefault();
            const email = btn.getAttribute("data-email");
            const activityName = btn.getAttribute("data-activity");

            // Ask for confirmation before unregistering
            const ok = confirm(`Unregister ${email} from ${activityName}?`);
            if (!ok) return;

            try {
              const res = await fetch(
                `/activities/${encodeURIComponent(activityName)}/unregister`,
                {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email }),
                }
              );

              const result = await res.json();

              if (res.ok) {
                // remove the participant element from the DOM for a snappy UX
                const li = btn.closest("li");
                if (li) li.remove();
              } else {
                console.error("Failed to unregister:", result);
                alert(result.detail || "Failed to unregister participant");
              }
            } catch (error) {
              console.error("Error unregistering participant:", error);
              alert("Failed to unregister participant. Please try again.");
            }
          });
        });

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // refresh list to show the newly signed up participant
        await fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
