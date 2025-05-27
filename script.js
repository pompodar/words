// --- Add language filter ---
const categorySelect = document.getElementById("category-select");
const tagSelect = document.getElementById("tag-select");

// Add language select to DOM if not present
let languageSelect = document.getElementById("language-select");
if (!languageSelect) {
    languageSelect = document.createElement("select");
    languageSelect.id = "language-select";
    languageSelect.className = "p-2 rounded border border-gray-300";
    languageSelect.innerHTML = `<option value="all">All Languages</option>`;
    // Insert as first filter
    const filterDiv = document.querySelector(".flex.flex-wrap.gap-4.mb-6");
    filterDiv.insertBefore(languageSelect, filterDiv.firstChild);
}

// --- Load and display words in the table ---
async function loadWordsTable() {
    const tbody = document.getElementById("words-table-body");
    tbody.innerHTML =
        '<tr><td colspan="6" class="text-center py-4">Loading...</td></tr>';

    // Fetch the index.json file
    let index;
    try {
        const res = await fetch("./data/index.json");
        index = await res.json();
    } catch (e) {
        tbody.innerHTML =
            '<tr><td colspan="6" class="text-center py-4 text-red-600">Failed to load index.json</td></tr>';
        return;
    }

    // Fetch all word .md files and parse frontmatter
    const wordPromises = index.map(async (item) => {
        try {
            const res = await fetch(`./data/words/${item.filename}`);
            const text = await res.text();
            // Parse frontmatter
            const match = text.match(/---([\s\S]*?)---([\s\S]*)/);
            if (!match) return null;
            const frontmatter = match[1];
            const data = {};
            frontmatter.split("\n").forEach((line) => {
                const [key, ...rest] = line.split(":");
                if (key && rest.length) {
                    data[key.trim()] = rest.join(":").trim();
                }
            });
            return data;
        } catch {
            return null;
        }
    });

    const words = (await Promise.all(wordPromises)).filter(Boolean);

    // Populate filter dropdowns
    populateLanguageSelect(words);
    populateCategorySelect(words);
    populateTagSelect(words);

    // Save all words for filtering
    window.allWords = words;

    applyFilters();
}

// --- Filtering logic ---
const searchInput = document.getElementById("search-input");

// Update applyFilters to include search
function applyFilters() {
    const language = languageSelect.value;
    const category = categorySelect.value;
    const tag = tagSelect.value;
    const search = searchInput.value.trim().toLowerCase();

    let filtered = window.allWords || [];

    if (language !== "all") {
        filtered = filtered.filter(
            (w) => w.language && w.language === language
        );
    }
    if (category !== "all") {
        filtered = filtered.filter(
            (w) => w.category && w.category.includes(category)
        );
    }
    if (tag !== "all") {
        filtered = filtered.filter((w) => w.tags && w.tags.includes(tag));
    }
    if (search) {
        filtered = filtered.filter(
            (w) =>
                (w.title && w.title.toLowerCase().includes(search)) ||
                (w.translation &&
                    w.translation.toLowerCase().includes(search)) ||
                (w.usage && w.usage.toLowerCase().includes(search)) ||
                (w.category && w.category.toLowerCase().includes(search)) ||
                (w.language && w.language.toLowerCase().includes(search))
        );
    }

    setupTablePagination(filtered);
}

// Add event listener for search
searchInput.addEventListener("input", applyFilters);

// --- Populate filter dropdowns ---
function populateLanguageSelect(words) {
    const languages = new Set();
    words.forEach((w) => {
        if (w.language) {
            languages.add(w.language.trim());
        }
    });
    languageSelect.innerHTML = '<option value="all">All Languages</option>';
    languages.forEach((l) => {
        if (l) languageSelect.innerHTML += `<option value="${l}">${l}</option>`;
    });
}

function populateCategorySelect(words) {
    const categories = new Set();
    words.forEach((w) => {
        if (w.category) {
            w.category.split(",").forEach((c) => categories.add(c.trim()));
        }
    });
    categorySelect.innerHTML = '<option value="all">All Categories</option>';
    categories.forEach((c) => {
        if (c) categorySelect.innerHTML += `<option value="${c}">${c}</option>`;
    });
}

function populateTagSelect(words) {
    const tags = new Set();
    words.forEach((w) => {
        if (w.tags) {
            w.tags.split(",").forEach((t) => tags.add(t.trim()));
        }
    });
    tagSelect.innerHTML = '<option value="all">All Tags</option>';
    tags.forEach((t) => {
        if (t) tagSelect.innerHTML += `<option value="${t}">${t}</option>`;
    });
}

// --- Table pagination and rendering (from tablePagination.js) ---
const WORDS_PER_PAGE = 4;
let currentPage = 1;
let paginatedWords = [];

// Add "other translations" to your columns array
const columns = [
    { key: "title", label: "Word", visible: true },
    { key: "translation", label: "Translation", visible: true },
    { key: "other translations", label: "Other Translation", visible: false }, // hidden by default
    { key: "category", label: "Category", visible: false }, // hidden by default
    { key: "usage", label: "Usage", visible: true },
    { key: "audio", label: "Audio", visible: true },
    { key: "image", label: "Image", visible: true },
];

// Create custom dropdown with checkboxes
function createColumnDropdown() {
    const dropdown = document.getElementById("column-dropdown");
    dropdown.innerHTML = columns
        .map(
            (col) => `
        <label class="flex items-center px-3 py-2 hover:bg-yellow-50 cursor-pointer">
            <input type="checkbox" class="column-checkbox mr-2" value="${
                col.key
            }"${col.visible ? " checked" : ""}>
            ${col.label}
        </label>
    `
        )
        .join("");
}
createColumnDropdown();

// Toggle dropdown visibility
const dropdownBtn = document.getElementById("column-dropdown-btn");
const dropdown = document.getElementById("column-dropdown");
dropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("hidden");
});
// Hide dropdown when clicking outside
document.addEventListener("click", () => dropdown.classList.add("hidden"));

// Helper to get selected columns
function getSelectedColumns() {
    return Array.from(
        document.querySelectorAll(".column-checkbox:checked")
    ).map((cb) => cb.value);
}

// Update table header and rows based on selected columns
function renderTablePage(words) {
    const selectedCols = getSelectedColumns();
    const thead = document.querySelector("#words-table-container thead tr");
    const tbody = document.getElementById("words-table-body");
    if (!thead || !tbody) return;

    // Render header
    thead.innerHTML = columns
        .filter((col) => selectedCols.includes(col.key))
        .map(
            (col) =>
                `<th class="py-3 px-4 border-b font-bold text-indigo-900">${col.label}</th>`
        )
        .join("");

    // Render rows
    tbody.innerHTML = words
        .map(
            (word, idx) =>
                `<tr class="transition hover:bg-yellow-100 ${
                    idx % 2 === 0 ? "bg-white" : "bg-yellow-50"
                }">` +
                columns
                    .filter((col) => selectedCols.includes(col.key))
                    .map((col) => {
                        if (col.key === "audio") {
                            return `<td class="py-3 px-4 border-b text-center">${
                                word.title
                                    ? `<button class="play-btn h-10 bg-yellow-300 hover:bg-yellow-400 rounded-full p-2 shadow" data-audio="./data/audios/${word.title}.mp3" title="Play audio">▶️</button>
                                    <audio src="./data/audios/${word.title}.mp3" class="hidden"></audio>`
                                    : ""
                            }</td>`;
                        }
                        if (col.key === "image") {
                            return `<td class="py-3 px-4 border-b text-center">${
                                word.title
                                    ? `<img src="./data/images/${word.title}.png" alt="image" class="mx-auto h-12 w-12 rounded-[50%] shadow border border-gray-200 hover:scale-[2] duration-300" style="max-width:60px;max-height:60px;object-fit:contain;">`
                                    : ""
                            }</td>`;
                        }
                        if (col.key === "usage") {
                            return `<td class="py-3 px-4 border-b">${
                                word.usage || ""
                            }</td>`;
                        }
                        if (col.key === "other translations") {
                            return `<td class="py-3 px-4 border-b">${
                                word["other translations"] || ""
                            }</td>`;
                        }
                        return `<td class="py-3 px-4 border-b">${
                            word[col.key] || ""
                        }</td>`;
                    })
                    .join("") +
                `</tr>`
        )
        .join("");

    // Play/pause logic for custom buttons
    tbody.querySelectorAll(".play-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
            tbody.querySelectorAll("audio").forEach((a) => a.pause());
            const audio = this.nextElementSibling;
            if (audio.paused) {
                audio.classList.remove("hidden");
                audio.play();
                this.textContent = "⏸️";
            } else {
                audio.pause();
                this.textContent = "▶️";
            }
            audio.onended = () => {
                this.textContent = "▶️";
            };
        });
    });
}

function renderPaginationControls(totalPages) {
    let container = document.getElementById("table-pagination");
    if (!container) {
        container = document.createElement("div");
        container.id = "table-pagination";
        container.className = "flex justify-center mt-4 space-x-2";
        document.getElementById("words-table-container").appendChild(container);
    }
    container.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.className = `px-3 py-1 rounded ${
            i === currentPage ? "bg-yellow-300 font-bold" : "bg-gray-200"
        }`;
        btn.addEventListener("click", () => {
            currentPage = i;
            showCurrentPage();
        });
        container.appendChild(btn);
    }
}

function showCurrentPage() {
    const totalPages = Math.ceil(paginatedWords.length / WORDS_PER_PAGE);
    const start = (currentPage - 1) * WORDS_PER_PAGE;
    const end = start + WORDS_PER_PAGE;
    renderTablePage(paginatedWords.slice(start, end));
    renderPaginationControls(totalPages);
}

function setupTablePagination(words) {
    paginatedWords = words;
    currentPage = 1;
    showCurrentPage();
}

// --- Event listeners for filters ---
languageSelect.addEventListener("change", applyFilters);
categorySelect.addEventListener("change", applyFilters);
tagSelect.addEventListener("change", applyFilters);
dropdown.addEventListener("change", () => showCurrentPage());

// --- Initial load ---
document.addEventListener("DOMContentLoaded", () => {
    loadWordsTable();
});
