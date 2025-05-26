// --- Keep only filter, table, and pagination logic ---

const categorySelect = document.getElementById("category-select");
const tagSelect = document.getElementById("tag-select");

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

    // Populate filter dropdowns
    populateCategorySelect(words);
    populateTagSelect(words);

    // Save all words for filtering
    window.allWords = words;

    applyFilters();
}

// --- Filtering logic ---
function applyFilters() {
    const category = categorySelect.value;
    const tag = tagSelect.value;

    let filtered = window.allWords || [];

    if (category !== "all") {
        filtered = filtered.filter(
            (w) => w.category && w.category.includes(category)
        );
    }
    if (tag !== "all") {
        filtered = filtered.filter((w) => w.tags && w.tags.includes(tag));
    }

    setupTablePagination(filtered);
}

// --- Populate filter dropdowns ---
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

function renderTablePage(words) {
    const tbody = document.getElementById("words-table-body");
    if (!tbody) return;
    tbody.innerHTML = words
        .map(
            (word, idx) => `
        <tr class="transition hover:bg-yellow-100 ${
            idx % 2 === 0 ? "bg-white" : "bg-yellow-50"
        }">
            <td class="py-3 px-4 border-b font-serif text-lg text-indigo-800">${
                word.title || ""
            }</td>
            <td class="py-3 px-4 border-b text-gray-700">${
                word.translation || ""
            }</td>
            <td class="py-3 px-4 border-b text-gray-500 italic">${
                word.category || ""
            }</td>
            <td class="py-3 px-4 border-b text-gray-600">${
                word.usage || ""
            }</td>
            <td class="py-3 px-4 border-b text-center">
                ${
                    word.title
                        ? `<button class="play-btn bg-yellow-300 hover:bg-yellow-400 rounded-full p-2 shadow" data-audio="./data/audios/${word.title}.mp3" title="Play audio">▶️</button>
                        <audio src="./data/audios/${word.title}.mp3" class="hidden"></audio>`
                        : ""
                }
            </td>
            <td class="py-3 px-4 border-b text-center">
                ${
                    word.title
                        ? `<img src="./data/images/${word.title}.png" alt="image" class="mx-auto rounded shadow border border-gray-200" style="max-width:60px;max-height:60px;object-fit:contain;">`
                        : ""
                }
            </td>
        </tr>
    `
        )
        .join("");

    // Play/pause logic for custom buttons
    tbody.querySelectorAll(".play-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
            // Pause all other audios
            tbody.querySelectorAll("audio").forEach((a) => a.pause());
            // Get the next sibling audio element
            const audio = this.nextElementSibling;
            if (audio.paused) {
                audio.classList.remove("hidden");
                audio.play();
                this.textContent = "⏸️";
            } else {
                audio.pause();
                this.textContent = "▶️";
            }
            // When audio ends, reset button
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
categorySelect.addEventListener("change", applyFilters);
tagSelect.addEventListener("change", applyFilters);

// --- Initial load ---
document.addEventListener("DOMContentLoaded", () => {
    loadWordsTable();
});
