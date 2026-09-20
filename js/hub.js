/**
 * NORTHSTAR's tools - Hub Directory & Registry
 * Adding a tool is as easy as adding an entry to the TOOLS array below!
 */

const TOOLS = [
  {
    id: "hunt-20-pizza-place-trophy",
    title: "Hunt: 20 Pizza Place Trophy Brute Forcer",
    description: "Calculates all 24 emoji permutations for the 20-trophy code in Work at a Pizza Place and walks you through testing them randomly until you find the working code.",
    path: "tools/hunt-20-pizza-place-trophy/",
    tag: "Roblox Hunt",
    date: "2024"
  }
];

// Render tools on page load
document.addEventListener("DOMContentLoaded", () => {
  const toolsListEl = document.getElementById("tools-list");
  const searchInput = document.getElementById("search-input");
  const toolCountEl = document.getElementById("tools-count");

  function renderTools(filterText = "") {
    if (!toolsListEl) return;

    const query = filterText.toLowerCase().trim();
    const filtered = TOOLS.filter(tool => 
      tool.title.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query) ||
      (tool.tag && tool.tag.toLowerCase().includes(query))
    );

    if (toolCountEl) {
      toolCountEl.textContent = `${filtered.length} tool${filtered.length === 1 ? '' : 's'}`;
    }

    if (filtered.length === 0) {
      toolsListEl.innerHTML = `
        <div class="empty-state">
          No tools found matching "${escapeHtml(filterText)}"
        </div>
      `;
      return;
    }

    toolsListEl.innerHTML = filtered.map(tool => {
      // Calculate full shareable URL
      const fullUrl = new URL(tool.path, window.location.href).href;
      return `
        <article class="tool-card">
          <div class="tool-card-top">
            <h2 class="tool-title">
              <a href="${tool.path}">${escapeHtml(tool.title)}</a>
            </h2>
            ${tool.tag ? `<span class="tool-badge">${escapeHtml(tool.tag)}</span>` : ''}
          </div>
          <p class="tool-desc">${escapeHtml(tool.description)}</p>
          <div class="tool-card-footer">
            <div class="tool-action-links">
              <a href="${tool.path}" class="tool-link-btn">Open Tool &rarr;</a>
              <button class="tool-copy-btn" onclick="copyToolLink('${fullUrl}')" title="Copy shareable link">
                Copy Link
              </button>
            </div>
            <span class="tool-date">${escapeHtml(tool.date || '')}</span>
          </div>
        </article>
      `;
    }).join("");
  }

  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderTools(e.target.value);
    });
  }

  renderTools();
});

// Utility to copy tool link to clipboard
function copyToolLink(url) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(url).then(() => {
      showToast("Link copied to clipboard");
    }).catch(() => {
      fallbackCopy(url);
    });
  } else {
    fallbackCopy(url);
  }
}

function fallbackCopy(text) {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  try {
    document.execCommand("copy");
    showToast("Link copied to clipboard");
  } catch (err) {
    showToast("Failed to copy link");
  }
  document.body.removeChild(textArea);
}

// Toast notification helper
function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  
  if (window.toastTimeout) {
    clearTimeout(window.toastTimeout);
  }
  
  window.toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

// Simple HTML escaping
function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
