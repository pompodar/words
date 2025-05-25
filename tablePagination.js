/**
 * Simple pagination for the words table.
 * Call setupTablePagination after the table is rendered.
 */

const WORDS_PER_PAGE = 4;
let currentPage = 1;
let paginatedWords = [];

/**
 * Render the table body for the current page.
 * @param {Array} words - Array of word objects.
 * Each word may have .audio and .image properties (URLs or relative paths).
 */
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
                        ? `
                        <button class="play-btn bg-yellow-300 hover:bg-yellow-400 rounded-full p-2 shadow" data-audio="./data/audios/${word.title}.mp3" title="Play audio">
                            ▶️
                        </button>
                        <audio src="./data/audios/${word.title}.mp3" class="hidden"></audio>
                        `
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

    // Add play/pause logic for custom buttons
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

/**
 * Render pagination controls below the table.
 * @param {number} totalPages
 */
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

/**
 * Show the current page of words and update controls.
 */
function showCurrentPage() {
    const totalPages = Math.ceil(paginatedWords.length / WORDS_PER_PAGE);
    const start = (currentPage - 1) * WORDS_PER_PAGE;
    const end = start + WORDS_PER_PAGE;
    renderTablePage(paginatedWords.slice(start, end));
    renderPaginationControls(totalPages);
}

/**
 * Setup pagination for the given words array.
 * Call this after loading all words.
 * @param {Array} words
 */
function setupTablePagination(words) {
    paginatedWords = words;
    currentPage = 1;
    showCurrentPage();
}

// Export for use in script.js if using modules
// export { setupTablePagination };
