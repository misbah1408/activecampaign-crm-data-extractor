// Extract tasks from ActiveCampaign tasks page

// ===== EXTRACT TASKS (Real ActiveCampaign Structure) =====
async function extractTasks() {
  console.log("Extracting tasks from ActiveCampaign...");
  const tasks = [];

  try {
    // Wait for tasks table
    await waitForElement("table tbody tr.tasks_task-row", 5000);

    // Get all task rows
    const taskRows = document.querySelectorAll("table tbody tr.tasks_task-row");

    console.log(`Found ${taskRows.length} task rows`);

    taskRows.forEach((row, index) => {
      try {
        // Extract task ID from row ID (e.g., "ember1721")
        const rowId = row.id || `task_${index}_${Date.now()}`;

        // Extract title from the title column
        const titleElement = row.querySelector(
          ".tasks_index__title .task-title",
        );
        const title = titleElement?.textContent?.trim() || "Untitled Task";

        // Extract description if available
        const descElement = row.querySelector(".task-description");
        const description = descElement?.textContent?.trim() || "";

        // Extract related entity (deal/contact)
        const relatedElement = row.querySelector('.owner-type span[rel="tip"]');
        const linkedTo = relatedElement?.textContent?.trim() || "N/A";

        // Extract due date
        const dateElement = row.querySelector('.date span[rel="tip"]');
        const dueDate = dateElement?.textContent?.trim() || "No due date";

        // Extract status
        const statusElement = row.querySelector(".status-text");
        const status = statusElement?.textContent?.trim() || "Unknown";

        // Extract task type
        const typeElement = row.querySelector(".deal-task-type");
        const taskType =
          typeElement?.textContent?.trim().toLowerCase() || "task";

        // Determine if task is completed
        const isCompleted = row.classList.contains("completed");

        tasks.push({
          id: rowId,
          type: taskType,
          title,
          description,
          dueDate,
          status,
          isCompleted,
          linkedTo,
          assignee: "N/A", // Not visible in this view
        });
      } catch (err) {
        console.error("Error parsing task row:", err);
      }
    });
  } catch (error) {
    console.error("Error extracting tasks:", error);
  }

  console.log(`Successfully extracted ${tasks.length} tasks`);
  return tasks;
}

function extractTaskType(element) {
  const typeElement = element.querySelector(
    "[data-type], .task-type, .type-badge",
  );
  const typeText = typeElement?.textContent?.trim().toLowerCase() || "";

  if (typeText.includes("call")) return "call";
  if (typeText.includes("email")) return "email";
  if (typeText.includes("meeting")) return "meeting";

  // Check for icons
  const iconElement = element.querySelector("i, svg, .icon");
  if (iconElement) {
    const iconClass = iconElement.className || "";
    if (iconClass.includes("phone") || iconClass.includes("call"))
      return "call";
    if (iconClass.includes("email") || iconClass.includes("mail"))
      return "email";
    if (iconClass.includes("calendar") || iconClass.includes("meeting"))
      return "meeting";
  }

  return "task";
}

function extractLinkedEntity(element) {
  const linkElement = element.querySelector(
    "[data-linked], .linked-entity, .related-to",
  );
  return linkElement?.textContent?.trim() || "N/A";
}
