const timelineContainer = document.getElementById("timeline-container");
const verticalBtn = document.querySelector(".vertical-btn");
const horizontalBtn = document.querySelector(".horizontal-btn");
const importanceSelect = document.getElementById("importance-select");
const categorySelect = document.getElementById("category-select");
const tagSelect = document.getElementById("tag-select");
let currentImportanceLevel = 1;

// --- Function to Toggle Details ---
function toggleDetails(event) {
    // Find the closest ancestor marker or content block with the data attribute
    const targetElement = event.target.closest("[data-detail-id]");
    if (!targetElement) return; // Exit if click wasn't on a relevant element

    // Check if the click was on the spread button
    if (event.target.closest(".spread-button")) {
        toggleSpread(event);
        return; // Do nothing if the spread button was clicked
    }

    const detailElement = targetElement
        .closest(".timeline-item")
        .querySelector(".timeline-detail");
    const contentElement = targetElement.closest(".timeline-content");

    if (detailElement) {
        // Check if the content is spread
        if (!contentElement.classList.contains("spread")) {
            const isActive = detailElement.classList.contains("active");
            // Toggle the current one
            if (!isActive) {
                detailElement.classList.add("active");
            } else {
                detailElement.classList.remove("active");
            }
        }
    }
}

function toggleSpread(event) {
    const targetElement = event.target.closest("[data-detail-id]");
    if (!targetElement) return;

    const contentElement = targetElement.closest(".timeline-content");
    const titleContainer = targetElement
        .closest(".timeline-content")
        .querySelector(".timeline-title-container");
    const detailElement = targetElement
        .closest(".timeline-item")
        .querySelector(".timeline-detail");

    if (contentElement) {
        contentElement.classList.toggle("spread");
        titleContainer.classList.toggle("spread");
    }
    if (detailElement) {
        if (contentElement.classList.contains("spread")) {
            detailElement.classList.add("active");
        } else {
            detailElement.classList.remove("active");
        }
    }
    event.stopPropagation();
}

// --- Function to Apply Layout Classes ---
// This function applies alternating classes based on the current layout mode
function applyLayoutClasses() {
    const isVertical = timelineContainer.classList.contains("is-vertical");
    const timelineItems = timelineContainer.querySelectorAll(".timeline-item");

    timelineItems.forEach((item, index) => {
        // Remove potentially conflicting classes first
        item.classList.remove("item-right", "item-below");

        if (isVertical) {
            // Apply 'item-right' to even-indexed items (0-based) for vertical alternating layout
            if (index % 2 !== 0) {
                item.classList.add("item-right");
            }
        } else {
            // Horizontal layout
            // Apply 'item-below' to even-indexed items (0-based) for horizontal alternating layout
            if (index % 2 !== 0) {
                item.classList.add("item-below");
            }
        }
    });
    // Close any open text details when layout changes
    document
        .querySelectorAll(".timeline-detail.active")
        .forEach((activeDetail) => {
            const contentElement = activeDetail.closest(".timeline-content");
            if (!contentElement.classList.contains("spread")) {
                activeDetail.classList.remove("active");
            }
        });

    stopAllAudios(); // Stop audio when layout changes

    if (isVertical) {
        setTimeout(() => {
            adjustVerticalCardPositions();
        }, 200);
    } else {
        adjustHorizontalCardPositions();
    }
}

// --- Functions to Switch Layout ---
function switchToVertical() {
    if (timelineContainer.classList.contains("is-vertical")) return; // Already vertical
    timelineContainer.classList.remove("is-horizontal");
    timelineContainer.classList.add("is-vertical");
    verticalBtn.classList.add("active");
    horizontalBtn.classList.remove("active");
    applyLayoutClasses(); // Re-apply layout classes
}

function switchToHorizontal() {
    if (timelineContainer.classList.contains("is-horizontal")) return; // Already horizontal
    timelineContainer.classList.remove("is-vertical");
    timelineContainer.classList.add("is-horizontal");
    horizontalBtn.classList.add("active");
    verticalBtn.classList.remove("active");
    applyLayoutClasses(); // Re-apply layout classes
}

// --- Function to Load Timeline Data ---
async function loadTimelineData() {
    try {
        const indexResponse = await fetch("data/index.json");
        const indexData = await indexResponse.json();

        console.log(indexData, "indexData");

        const allData = [];
        for (const item of indexData) {
            const fileResponse = await fetch(
                `data/importance-${item.importance}/${item.filename}`
            );
            const markdownText = await fileResponse.text();
            const entry = parseMarkdown(markdownText);
            entry.importance = item.importance;
            entry.filename = item.filename;
            allData.push(entry);
        }
        // Sort the data by frequency before creating the timeline
        allData.sort((a, b) => {
            // Extract the numeric part of the frequency and handle BCE/CE
            const frequencyA = a.frequency;
            const frequencyB = b.frequency;

            // Compare frequencys
            if (frequencyA !== frequencyB) {
                return frequencyA - frequencyB;
            }

            // If both start and end are the same, sort by title alphabetically
            return a.title.localeCompare(b.title);
        });
        createTimeline(allData);
    } catch (error) {
        console.error("Error loading timeline data:", error);
    }
}

// --- Function to Parse Markdown ---
function parseMarkdown(markdownText) {
    const entry = {};
    const lines = markdownText.split("\n");
    let metadataEnded = false;
    let detailLines = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "---") {
            if (metadataEnded) {
                // Metadata section ended, start collecting detail lines
                detailLines = lines.slice(i + 1);
                break; // Exit the loop after finding the second '---'
            }
            metadataEnded = true;
        } else if (metadataEnded) {
            // We are in the metadata section
            const [key, ...valueParts] = line
                .split(":")
                .map((str) => str.trim());
            if (key && valueParts.length > 0) {
                entry[key] = valueParts.join(":").trim(); // Handle colons in values
            }
        }
    }
    entry.detail = parseDetailMarkdown(detailLines.join("\n").trim()); // Join detail lines and parse markdown
    if (entry.category) {
        entry.category = entry.category.split(",").map((str) => str.trim());
    }
    if (entry.tags) {
        entry.tags = entry.tags.split(",").map((str) => str.trim());
    }
    return entry;
}

function parseDetailMarkdown(detailText) {
    // Bold text: **bold** or __bold__
    detailText = detailText.replace(/(\*\*|__)(.*?)\1/g, "<b>$2</b>");

    // Italic text: *italic* or _italic_
    detailText = detailText.replace(/(\*|_)(.*?)\1/g, "<i>$2</i>");

    // Strikethrough: ~~strikethrough~~
    detailText = detailText.replace(/~~(.*?)~~/g, "<del>$1</del>");

    // Headings: # H1, ## H2, ### H3, #### H4, ##### H5, ###### H6
    detailText = detailText.replace(/^###### (.*$)/gim, "<h6>$1</h6>");
    detailText = detailText.replace(/^##### (.*$)/gim, "<h5>$1</h5>");
    detailText = detailText.replace(/^#### (.*$)/gim, "<h4>$1</h4>");
    detailText = detailText.replace(/^### (.*$)/gim, "<h3>$1</h3>");
    detailText = detailText.replace(/^## (.*$)/gim, "<h2>$1</h2>");
    detailText = detailText.replace(/^# (.*$)/gim, "<h1>$1</h1>");

    // Unordered lists: - item, * item, + item
    detailText = detailText.replace(
        /^(\s*[-+*]\s+.*)(\n\s*[-+*]\s+.*)*/gim,
        (match) => {
            const items = match
                .split("\n")
                .map((item) => item.replace(/^\s*[-+*]\s+/, ""));
            return `<ul>${items
                .map((item) => `<li>${item}</li>`)
                .join("")}</ul>`;
        }
    );

    // Ordered lists: 1. item, 2. item, etc.
    detailText = detailText.replace(
        /^(\s*\d+\.\s+.*)(\n\s*\d+\.\s+.*)*/gim,
        (match) => {
            const items = match
                .split("\n")
                .map((item) => item.replace(/^\s*\d+\.\s+/, ""));
            return `<ol>${items
                .map((item) => `<li>${item}</li>`)
                .join("")}</ol>`;
        }
    );

    // Links: link text
    detailText = detailText.replace(
        /\[(.*?)\]\((.*?)\)/g,
        '<a href="$2" target="_blank">$1</a>'
    );

    // Images: !alt text
    detailText = detailText.replace(
        /!\[(.*?)\]\((.*?)\)/g,
        '<img src="$2" alt="$1" />'
    );

    // Code blocks: ```code```
    detailText = detailText.replace(
        /```(.*?)```/gs,
        "<pre><code>$1</code></pre>"
    );

    // Inline code: `code`
    detailText = detailText.replace(/`(.*?)`/g, "<code>$1</code>");

    // Blockquotes: > quote
    detailText = detailText.replace(
        /^>(.*$)/gim,
        "<blockquote>$1</blockquote>"
    );

    // Horizontal rules: --- or *** or ___
    detailText = detailText.replace(/^(\s*[-*_]\s*){3,}$/gim, "<hr>");

    // Spacers
    detailText = detailText.replace(
        /---spacer---/g,
        '<div class="spacer"></div>'
    );

    // Line breaks (two spaces + newline)
    detailText = detailText.replace(/ {2}$/gm, "<br>");

    // Split into paragraphs based on any newline
    detailText = detailText
        .split(/\n/)
        .map((paragraph) => {
            if (paragraph.trim() === "") {
                return `<p style="height: 12px;"></p>`;
            }
            return `<p class="indented-paragraph">${paragraph}</p>`;
        })
        .join("");

    return detailText;
}

// --- Function to Parse frequency ---
function parsefrequency(frequencyString) {
    frequencyString = frequencyString
        .replace(/c\.\s*|\s*(BCE|CE)/gi, "")
        .trim();

    let start, end;

    // Handle ranges (e.g., "2000-1700", "-2000--1700", "-2000-1700")
    if (frequencyString.includes("-")) {
        [start, end] = frequencyString.split("-").map(Number);
        // Ensure start is always the smaller (more negative or earlier) number
        if (start > end) {
            [start, end] = [end, start];
        }
    } else {
        // Handle single numbers
        start = end = Number(frequencyString);
    }

    // Check if it's BCE (before common era)
    if (frequencyString.toUpperCase().includes("BCE")) {
        start = -start;
        end = -end;
    }

    return { start: start, end: end };
}

// --- Function to Create Timeline Elements ---
function createTimeline(data) {
    timelineContainer.innerHTML = '<div class="timeline-line"></div>'; // Clear existing timeline
    const allCategories = new Set();
    const allTags = new Set();

    data.forEach((item, index) => {
        const timelineItem = document.createElement("div");
        timelineItem.classList.add("timeline-item");
        timelineItem.setAttribute("data-importance", item.importance);
        timelineItem.setAttribute("data-category", item.category);
        timelineItem.setAttribute("data-tags", item.tags);

        const timelineSpacer = document.createElement("div");
        timelineSpacer.classList.add("timeline-spacer");

        const timelineMarkerContainer = document.createElement("div");
        timelineMarkerContainer.classList.add("timeline-marker-container");

        const timelineMarker = document.createElement("div");
        timelineMarker.classList.add("timeline-marker");
        timelineMarker.setAttribute("data-detail-id", `detail-${index}`);

        const timelineContent = document.createElement("div");
        timelineContent.classList.add("timeline-content");
        timelineContent.setAttribute("data-detail-id", `detail-${index}`); // Add data-detail-id here

        const spreadButton = document.createElement("div");
        spreadButton.classList.add("spread-button");
        timelineContent.appendChild(spreadButton);

        const timelineTitleContainer = document.createElement("div");
        timelineTitleContainer.classList.add("timeline-title-container");

        const timelineTitleContainerInner = document.createElement("div");
        timelineTitleContainerInner.classList.add("flex", "flex-col");

        const timelineTitle = document.createElement("h3");
        timelineTitle.classList.add(
            "mb-1",
            "font-semibold",
            "text-xlg",
            "text-yellow-600"
        );
        timelineTitle.textContent = item.title;

        const timelineFrequency = document.createElement("p");
        timelineFrequency.classList.add(
            "text-lg",
            "font-medium",
            "text-gray-500"
        );
        timelineFrequency.textContent = item.frequency;

        console.log(item, "item");

        const imageFilename = item.filename.replace(".md", "") + ".png";
        const imagePath = `data/images/${imageFilename}`;
        const timelineImage = document.createElement("img");
        timelineImage.src = imagePath;
        timelineImage.alt = item.title;
        timelineImage.classList.add("timeline-image");

        // --- Audio Player Elements ---
        const audioButton = document.createElement("button");
        audioButton.classList.add(
            "audio-button",
            "ml-2",
            "p-1",
            "text-sm",
            "bg-gray-200",
            "rounded",
            "hover:bg-gray-300",
            "focus:outline-none"
        );
        audioButton.textContent = "▶️"; // Initial state: Play icon
        audioButton.setAttribute("aria-label", `Play audio for ${item.title}`);
        audioButton.style.cursor = "pointer";
        audioButton.disabled = true; // Disable initially until audio metadata loads

        const audioSrc = `data/audios/${item.title}.mp3`; // Assumes title matches filename and .mp3 extension
        const audioElement = new Audio(audioSrc);
        audioElement.setAttribute("preload", "metadata");

        audioButton.audioElement = audioElement; // Store audio element on the button
        audioButton.dataset.playing = "false";

        audioElement.addEventListener("loadedmetadata", () => {
            audioButton.disabled = false; // Enable button if metadata loads
            audioButton.title = `Play audio (duration: ${formatTime(
                audioElement.duration
            )})`;
        });

        audioElement.addEventListener("error", (e) => {
            console.warn(
                `Audio file not found or error loading: ${audioSrc}`,
                e
            );
            audioButton.textContent = "🔇"; // Indicate audio not available
            audioButton.title = "Audio not available";
            audioButton.disabled = true;
        });

        audioElement.addEventListener("ended", () => {
            audioButton.textContent = "▶️";
            audioButton.dataset.playing = "false";
            audioElement.currentTime = 0; // Reset for next play
        });

        audioButton.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevent card detail toggle
            const btn = event.currentTarget;
            const audio = btn.audioElement;

            if (btn.dataset.playing === "false") {
                stopAllAudios(); // Stop any other playing audio
                audio
                    .play()
                    .then(() => {
                        btn.textContent = "⏸️"; // Pause icon
                        btn.dataset.playing = "true";
                    })
                    .catch((error) => {
                        console.error(
                            `Error playing audio (${audioSrc}):`,
                            error
                        );
                        btn.textContent = "⚠️";
                        btn.title = "Error playing audio";
                        btn.disabled = true;
                    });
            } else {
                audio.pause();
                btn.textContent = "▶️"; // Play icon
                btn.dataset.playing = "false";
            }
        });

        const titleAndAudioWrapper = document.createElement("div");
        titleAndAudioWrapper.classList.add(
            "flex",
            "items-center",
            "justify-between",
            "w-full"
        );
        titleAndAudioWrapper.appendChild(timelineTitle);
        titleAndAudioWrapper.appendChild(audioButton);

        timelineTitleContainerInner.appendChild(titleAndAudioWrapper);
        timelineTitleContainerInner.appendChild(timelineFrequency);

        timelineTitleContainer.appendChild(timelineTitleContainerInner);
        timelineTitleContainer.appendChild(timelineImage);

        const timelineDetail = document.createElement("div");
        timelineDetail.classList.add("timeline-detail");
        timelineDetail.innerHTML = `<p>${item.detail}</p>`;

        const timelineUsage = document.createElement("p");
        timelineUsage.classList.add("timeline-usage");
        timelineUsage.textContent = `${item.usage}`;

        timelineContent.appendChild(timelineTitleContainer);
        timelineContent.appendChild(timelineDetail);
        timelineContent.appendChild(timelineUsage);
        timelineMarkerContainer.appendChild(timelineMarker);
        timelineItem.appendChild(timelineSpacer);
        timelineItem.appendChild(timelineMarkerContainer);
        timelineItem.appendChild(timelineContent);
        timelineContainer.appendChild(timelineItem);
        if (item.category) {
            item.category.forEach((category) => allCategories.add(category));
        }
        if (item.tags) {
            item.tags.forEach((tag) => allTags.add(tag));
        }
    });
    applyLayoutClasses();
    filterByImportance(currentImportanceLevel);
    populateCategorySelect(allCategories);
    populateTagSelect(allTags);
}
function populateCategorySelect(categories) {
    categorySelect.innerHTML = '<option value="all">All</option>';
    categories.forEach((category) => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}
function populateTagSelect(tags) {
    tagSelect.innerHTML = '<option value="all">All</option>';
    tags.forEach((tag) => {
        const option = document.createElement("option");
        option.value = tag;
        option.textContent = tag;
        tagSelect.appendChild(option);
    });
}
function filterByCategory(category) {
    const timelineItems = timelineContainer.querySelectorAll(".timeline-item");
    timelineItems.forEach((item) => {
        const itemCategories = item.getAttribute("data-category");
        const itemTags = item.getAttribute("data-tags");
        const selectedTag = tagSelect.value;
        if (category === "all" || itemCategories.includes(category)) {
            if (
                selectedTag === "all" ||
                (itemTags && itemTags.includes(selectedTag))
            ) {
                item.classList.remove("hidden");
            } else {
                item.classList.add("hidden");
            }
        } else {
            item.classList.add("hidden");
        }
    });
}
function filterByTag(tag) {
    const timelineItems = timelineContainer.querySelectorAll(".timeline-item");
    timelineItems.forEach((item) => {
        const itemCategories = item.getAttribute("data-category");
        const itemTags = item.getAttribute("data-tags");
        const selectedCategory = categorySelect.value;
        if (tag === "all" || (itemTags && itemTags.includes(tag))) {
            if (
                selectedCategory === "all" ||
                itemCategories.includes(selectedCategory)
            ) {
                item.classList.remove("hidden");
            } else {
                item.classList.add("hidden");
            }
        } else {
            item.classList.add("hidden");
        }
    });
}
function filterByImportance(importanceLevel) {
    currentImportanceLevel = importanceLevel;
    const timelineItems = timelineContainer.querySelectorAll(".timeline-item");
    timelineItems.forEach((item) => {
        const itemImportance = parseInt(item.getAttribute("data-importance"));
        if (itemImportance <= importanceLevel) {
            item.classList.remove("hidden");
        } else {
            item.classList.add("hidden");
        }
    });
}

function switchToImportance(importanceLevel) {
    filterByImportance(importanceLevel);
}

// 1 Add the Table View button to the DOM
const viewButtonsRow = document.querySelector(
    ".flex.justify-center.space-x-4.mb-10"
);

// 2. Add the table container to the DOM (after timeline-container)
if (timelineContainer && !document.getElementById("words-table-container")) {
    const tableDiv = document.createElement("div");
    tableDiv.id = "words-table-container";
    tableDiv.className = "hidden mt-10";
    tableDiv.innerHTML = `
        <table class="min-w-full bg-white border border-gray-300 rounded-lg shadow">
            <thead>
                <tr>
                    <th class="py-2 px-4 border-b">Word</th>
                    <th class="py-2 px-4 border-b">Translation</th>
                    <th class="py-2 px-4 border-b">Category</th>
                    <th class="py-2 px-4 border-b">Usage</th>
                </tr>
            </thead>
            <tbody id="words-table-body">
                <!-- Table rows will be injected by JS -->
            </tbody>
        </table>
    `;
    timelineContainer.parentNode.insertBefore(
        tableDiv,
        timelineContainer.nextSibling
    );
}

// 3. Table View button logic
document
    .getElementById("show-table-btn")
    .addEventListener("click", function () {
        document.getElementById("timeline-container").classList.add("hidden");
        document
            .getElementById("words-table-container")
            .classList.remove("hidden");
        document
            .querySelectorAll(".toggle-button")
            .forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");
        loadWordsTable();
    });

// 4. Restore timeline view when other buttons are clicked
document.querySelector(".vertical-btn").addEventListener("click", function () {
    const timeline = document.getElementById("timeline-container");
    timeline.classList.remove("is-horizontal");
    timeline.classList.add("is-vertical");
    timeline.classList.remove("hidden");
    document.getElementById("words-table-container").classList.add("hidden");
    document
        .querySelectorAll(".toggle-button")
        .forEach((btn) => btn.classList.remove("active"));
    this.classList.add("active");
});

document
    .querySelector(".horizontal-btn")
    .addEventListener("click", function () {
        const timeline = document.getElementById("timeline-container");
        timeline.classList.remove("is-vertical");
        timeline.classList.add("is-horizontal");
        timeline.classList.remove("hidden");
        document
            .getElementById("words-table-container")
            .classList.add("hidden");
        document
            .querySelectorAll(".toggle-button")
            .forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");
    });

// 5. Load and display words in the table
async function loadWordsTable() {
    const tbody = document.getElementById("words-table-body");
    tbody.innerHTML =
        '<tr><td colspan="4" class="text-center py-4">Loading...</td></tr>';

    // Fetch the index.json file
    let index;
    try {
        const res = await fetch("./data/index.json");
        index = await res.json();
    } catch (e) {
        tbody.innerHTML =
            '<tr><td colspan="4" class="text-center py-4 text-red-600">Failed to load index.json</td></tr>';
        return;
    }

    // Fetch all word .md files and parse frontmatter
    const wordPromises = index
        .filter((item) => item.importance === 1)
        .map(async (item) => {
            try {
                const res = await fetch(`./data/importance-1/${item.filename}`);
                const text = await res.text();
                // Parse frontmatter
                const match = text.match(/---([\s\S]*?)---([\s\S]*)/);
                if (!match) return null;
                const frontmatter = match[1];
                const usage = match[2].trim();
                const data = {};
                frontmatter.split("\n").forEach((line) => {
                    const [key, ...rest] = line.split(":");
                    if (key && rest.length) {
                        data[key.trim()] = rest.join(":").trim();
                    }
                });
                data.usage = usage;
                return data;
            } catch {
                return null;
            }
        });

    const words = (await Promise.all(wordPromises)).filter(Boolean);

    // Render table rows
    if (words.length === 0) {
        tbody.innerHTML =
            '<tr><td colspan="4" class="text-center py-4">No words found.</td></tr>';
        return;
    }
    tbody.innerHTML = words
        .map(
            (word) => `
        <tr>
            <td class="py-2 px-4 border-b">${word.title || ""}</td>
            <td class="py-2 px-4 border-b">${word.translation || ""}</td>
            <td class="py-2 px-4 border-b">${word.category || ""}</td>
            <td class="py-2 px-4 border-b">${word.usage || ""}</td>
        </tr>
    `
        )
        .join("");

    setupTablePagination(words);
}

// --- Initial Setup ---
// Set default view (e.g., vertical) and apply initial layout classes
loadTimelineData();
switchToVertical(); // This also calls applyLayoutClasses

function adjustHorizontalCardPositions() {
    const timelineItems = timelineContainer.querySelectorAll(".timeline-item");
    timelineItems.forEach((item, index) => {
        if (index === 0) return; // Skip the first item (no previous item to compare with)

        const content = item.querySelector(".timeline-content");
        const prevItem = timelineItems[index - 1];
        const prevContent = prevItem.querySelector(".timeline-content");

        // Get bounding rectangles
        const contentRect = content.getBoundingClientRect();
        const prevContentRect = prevContent.getBoundingClientRect();

        // Calculate available space above the current content
        const availableSpaceAbove = contentRect.top - prevContentRect.bottom;

        // If there's enough space and the previous item is not below, move the current item up
        if (
            availableSpaceAbove > contentRect.height &&
            !prevItem.classList.contains("item-below")
        ) {
            content.style.top = `-${contentRect.height}px`;
        } else {
            content.style.top = ""; // Reset to default position
        }
    });
}

function adjustVerticalCardPositions() {
    const timelineItems = timelineContainer.querySelectorAll(
        ".timeline-item:not(.hidden)"
    );
    timelineItems.forEach((item, index) => {
        if (index === 0) return; // Skip the first item (no previous item to compare with)

        console.log(timelineItems.length);

        const content = item.querySelector(".timeline-content");
        const prevItem = timelineItems[index - 1];
        const prevContent = prevItem.querySelector(".timeline-content");

        // Get bounding rectangles
        const contentRect = content.getBoundingClientRect();
        const prevContentRect = prevContent.getBoundingClientRect();

        // Calculate available space above the current content
        const availableSpaceAbove = contentRect.top - prevContentRect.bottom;

        console.log(contentRect.height, item);

        // If the previous item is not below, move the current item up
        if (!prevItem.classList.contains("item-right")) {
            item.style.top = `-${contentRect.height - 20}px`;
        } else {
            item.style.top = "0"; // Reset to default position
        }
    });
}

// --- Helper Function to Format Time ---
function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
}

// --- Helper Function to Stop All Audios ---
function stopAllAudios() {
    document
        .querySelectorAll('.audio-button[data-playing="true"]')
        .forEach((btn) => {
            if (btn.audioElement) {
                btn.audioElement.pause();
                btn.audioElement.currentTime = 0; // Reset time
                btn.textContent = "▶️";
                btn.dataset.playing = "false";
            }
        });
}
