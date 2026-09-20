/**
 * Hunt: 20 Pizza Place Trophy Brute Forcer
 * NORTHSTAR's tools
 */

(function () {
  "use strict";

  // State
  let allCombinations = [];
  let untriedCombinations = [];
  let triedCombinations = [];
  let currentCandidate = null;
  let attemptNumber = 0;
  let isSolved = false;

  // DOM Elements
  const emojiInput = document.getElementById("emoji-input");
  const startBtn = document.getElementById("start-btn");
  const clearInputBtn = document.getElementById("clear-input-btn");
  const inputHint = document.getElementById("input-hint");

  const setupPanel = document.getElementById("setup-panel");
  const activePanel = document.getElementById("active-panel");

  const currentComboEl = document.getElementById("current-combo-display");
  const attemptCounterEl = document.getElementById("attempt-counter");
  const remainingCountEl = document.getElementById("stat-remaining");
  const triedCountEl = document.getElementById("stat-tried");
  const totalCountEl = document.getElementById("stat-total");

  const failedBtn = document.getElementById("failed-btn");
  const successBtn = document.getElementById("success-btn");
  const copyCandidateBtn = document.getElementById("copy-candidate-btn");
  const restartBtn = document.getElementById("restart-btn");

  const solvedBanner = document.getElementById("solved-banner");
  const solvedSummaryText = document.getElementById("solved-summary-text");
  const solvedAgainBtn = document.getElementById("solved-again-btn");

  const exhaustedBanner = document.getElementById("exhausted-banner");
  const exhaustedRestartBtn = document.getElementById("exhausted-restart-btn");

  const historyListEl = document.getElementById("history-list");
  const sharePageBtn = document.getElementById("share-page-btn");

  // Segment text into grapheme clusters (emojis)
  function extractGraphemes(text) {
    if (!text) return [];
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
      return Array.from(segmenter.segment(text))
        .map(s => s.segment)
        .filter(s => s.trim().length > 0);
    }
    // Fallback using Unicode-aware regex
    const matches = text.match(/\p{Extended_Pictographic}|[\uD800-\uDBFF][\uDC00-\uDFFF]|[\s\S]/gu) || [];
    return matches.filter(s => s.trim().length > 0);
  }

  // Generate all permutations of an array of items (4! = 24)
  function getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    const perms = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const subPerms = getPermutations(remaining);
      for (const p of subPerms) {
        perms.push([current, ...p]);
      }
    }
    return perms;
  }

  // Update input status
  function updateInputValidation() {
    const chars = extractGraphemes(emojiInput.value);
    if (chars.length === 0) {
      inputHint.textContent = "Enter exactly 4 emojis from your trophy.";
      inputHint.className = "input-status-hint";
      startBtn.disabled = true;
    } else if (chars.length < 4) {
      inputHint.textContent = `${chars.length}/4 emojis entered. Add ${4 - chars.length} more.`;
      inputHint.className = "input-status-hint";
      startBtn.disabled = true;
    } else if (chars.length === 4) {
      // Check for duplicates
      const unique = new Set(chars);
      if (unique.size < 4) {
        inputHint.textContent = "Note: Trophy codes typically use 4 distinct emojis.";
      } else {
        inputHint.textContent = "Ready! Click Start Brute Force below.";
      }
      inputHint.className = "input-status-hint";
      startBtn.disabled = false;
    } else {
      inputHint.textContent = `Too many emojis (${chars.length}/4). Please remove ${chars.length - 4}.`;
      inputHint.className = "input-status-hint error";
      startBtn.disabled = true;
    }
  }

  // Start Brute Force Session
  function startBruteForce() {
    const chars = extractGraphemes(emojiInput.value).slice(0, 4);
    if (chars.length !== 4) return;

    // Generate all 24 permutations
    const rawPerms = getPermutations(chars);
    // Deduplicate strings in case user had duplicates
    const stringPerms = Array.from(new Set(rawPerms.map(p => p.join(""))));

    allCombinations = [...stringPerms];
    untriedCombinations = [...stringPerms];
    triedCombinations = [];
    attemptNumber = 0;
    isSolved = false;

    // Update URL query param for sharing exact trophy code
    const url = new URL(window.location.href);
    url.searchParams.set("code", chars.join(""));
    window.history.replaceState({}, "", url.toString());

    // Switch panels
    setupPanel.style.display = "none";
    activePanel.style.display = "block";
    solvedBanner.style.display = "none";
    exhaustedBanner.style.display = "none";
    failedBtn.style.display = "inline-flex";
    successBtn.style.display = "inline-flex";

    totalCountEl.textContent = allCombinations.length;
    renderHistory();
    pickNextCandidate();
  }

  // Pick next candidate randomly from untried pool
  function pickNextCandidate() {
    if (untriedCombinations.length === 0) {
      showExhausted();
      return;
    }

    attemptNumber++;
    const randomIndex = Math.floor(Math.random() * untriedCombinations.length);
    currentCandidate = untriedCombinations.splice(randomIndex, 1)[0];

    // Update UI
    currentComboEl.textContent = currentCandidate;
    attemptCounterEl.textContent = `Attempt ${attemptNumber} of ${allCombinations.length}`;
    remainingCountEl.textContent = untriedCombinations.length;
    triedCountEl.textContent = triedCombinations.length;
  }

  // Handle "Didn't work"
  function handleFailed() {
    if (!currentCandidate || isSolved) return;

    triedCombinations.push(currentCandidate);
    renderHistory();

    if (untriedCombinations.length > 0) {
      pickNextCandidate();
    } else {
      showExhausted();
    }
  }

  // Handle "This worked!"
  function handleSuccess() {
    if (!currentCandidate || isSolved) return;

    isSolved = true;
    failedBtn.style.display = "none";
    successBtn.style.display = "none";

    solvedSummaryText.textContent = `Working code: ${currentCandidate} (Found in ${attemptNumber} attempt${attemptNumber === 1 ? '' : 's'}!)`;
    solvedBanner.style.display = "block";

    renderHistory(currentCandidate);
  }

  // Handle all combinations exhausted
  function showExhausted() {
    failedBtn.style.display = "none";
    successBtn.style.display = "none";
    exhaustedBanner.style.display = "block";
    currentComboEl.textContent = "None left";
    remainingCountEl.textContent = "0";
    triedCountEl.textContent = triedCombinations.length;
  }

  // Render history log
  function renderHistory(winningCombo = null) {
    if (!historyListEl) return;

    if (triedCombinations.length === 0 && !winningCombo) {
      historyListEl.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; padding: 4px;">No combinations tested yet.</span>';
      return;
    }

    let html = "";
    triedCombinations.forEach(combo => {
      html += `<span class="history-item">${escapeHtml(combo)}</span>`;
    });

    if (winningCombo) {
      html += `<span class="history-item success">${escapeHtml(winningCombo)} (SOLVED)</span>`;
    }

    historyListEl.innerHTML = html;
  }

  // Reset to initial setup
  function resetAll() {
    activePanel.style.display = "none";
    setupPanel.style.display = "block";
    solvedBanner.style.display = "none";
    exhaustedBanner.style.display = "none";
    currentCandidate = null;
    isSolved = false;
    allCombinations = [];
    untriedCombinations = [];
    triedCombinations = [];
    updateInputValidation();
  }

  // Copy candidate to clipboard
  function copyCurrentCandidate() {
    if (!currentCandidate) return;
    copyToClipboard(currentCandidate, "Combination copied to clipboard");
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

  function copyToClipboard(text, successMsg = "Copied to clipboard") {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
      }).catch(() => {
        fallbackCopy(text, successMsg);
      });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand("copy");
      showToast(successMsg);
    } catch (err) {
      showToast("Failed to copy");
    }
    document.body.removeChild(textArea);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Event Listeners
  emojiInput.addEventListener("input", updateInputValidation);

  clearInputBtn.addEventListener("click", () => {
    emojiInput.value = "";
    emojiInput.focus();
    updateInputValidation();
  });

  startBtn.addEventListener("click", startBruteForce);
  failedBtn.addEventListener("click", handleFailed);
  successBtn.addEventListener("click", handleSuccess);
  copyCandidateBtn.addEventListener("click", copyCurrentCandidate);
  restartBtn.addEventListener("click", resetAll);
  solvedAgainBtn.addEventListener("click", resetAll);
  exhaustedRestartBtn.addEventListener("click", resetAll);

  if (sharePageBtn) {
    sharePageBtn.addEventListener("click", () => {
      copyToClipboard(window.location.href, "Tool link copied to clipboard");
    });
  }

  // Load from URL query if available
  const urlParams = new URLSearchParams(window.location.search);
  const codeParam = urlParams.get("code");
  if (codeParam) {
    emojiInput.value = codeParam;
    updateInputValidation();
  } else {
    updateInputValidation();
  }
})();
