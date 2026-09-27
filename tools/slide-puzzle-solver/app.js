/**
 * NORTHSTAR Tools - Slide Puzzle Solver (Web Controller)
 * Interactive UI, Canvas Image Slicer, Step-by-Step Playback, and Roblox Guide
 */

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const boardEl = document.getElementById("puzzle-board");
  const colCoordsHeader = document.getElementById("col-coords-header");
  const rowCoordsHeader = document.getElementById("row-coords-header");
  const paletteGridEl = document.getElementById("palette-grid");
  const paletteSearchInput = document.getElementById("palette-search");
  const referenceImgEl = document.getElementById("reference-img-preview");
  const referenceCanvas = document.createElement("canvas");
  const imageUploadInput = document.getElementById("image-upload-input");

  // Status & Guidance Elements
  const statusBannerEl = document.getElementById("status-banner");
  const solveBtn = document.getElementById("solve-btn");
  const scrambleBtn = document.getElementById("scramble-btn");
  const resetBtn = document.getElementById("reset-btn");
  const rotateBtn = document.getElementById("rotate-btn");
  const setBlankBtn = document.getElementById("set-blank-btn");
  const toggleNumbersBtn = document.getElementById("toggle-numbers-btn");

  // Playback Elements
  const playbackPanel = document.getElementById("playback-card");
  const instructionStepNum = document.getElementById("instruction-step-num");
  const instructionMainText = document.getElementById("instruction-main-text");
  const instructionSubText = document.getElementById("instruction-sub-text");
  const stepScrubber = document.getElementById("step-scrubber");
  const scrubLabel = document.getElementById("scrub-label");
  const prevBtn = document.getElementById("prev-btn");
  const playBtn = document.getElementById("play-btn");
  const nextBtn = document.getElementById("next-btn");
  const startBtn = document.getElementById("start-btn");
  const endBtn = document.getElementById("end-btn");
  const speedSelect = document.getElementById("speed-select");
  const stepsListEl = document.getElementById("steps-scroll-list");
  const copyStepsBtn = document.getElementById("copy-steps-btn");

  // App State
  let N = 8; // Default 8x8 for Roblox puzzle
  let blankTileId = 64; // Value representing blank tile (default bottom-right tile)
  let tilesData = []; // Array of { id: 1..N^2, dataUrl, label }
  let currentBoard = []; // Array of length N*N containing tile IDs
  let selectedSlotIndex = null;
  let isSettingBlank = false;
  let showNumbers = true;
  let boardRotation = 0; // 0, 90, 180, 270

  // Solver & Playback State
  let solutionMoves = []; // Array of move objects
  let currentStepIndex = 0;
  let playInterval = null;
  let playSpeedMs = 800;

  // Image Source (Default to Roblox Noob preset)
  let currentImageSrc = "assets/roblox-noob-solved.jpg";
  let activePreset = "roblox";

  /**
   * Initialize Application
   */
  async function init() {
    setupEventListeners();
    await loadPreset(activePreset);
  }

  /**
   * Set up all UI event listeners
   */
  function setupEventListeners() {
    // Grid Size Selectors
    document.querySelectorAll(".size-pill").forEach(pill => {
      pill.addEventListener("click", () => {
        const val = pill.dataset.size;
        document.querySelectorAll(".size-pill").forEach(p => p.classList.remove("active"));
        pill.classList.add("active");

        if (val === "custom") {
          const customVal = parseInt(document.getElementById("custom-n-input").value, 10);
          if (customVal >= 2 && customVal <= 10) {
            setGridSize(customVal);
          }
        } else {
          setGridSize(parseInt(val, 10));
        }
      });
    });

    const customInput = document.getElementById("custom-n-input");
    if (customInput) {
      customInput.addEventListener("change", (e) => {
        const val = parseInt(e.target.value, 10);
        if (val >= 2 && val <= 10) {
          document.querySelectorAll(".size-pill").forEach(p => p.classList.remove("active"));
          document.querySelector(".size-pill[data-size='custom']").classList.add("active");
          setGridSize(val);
        }
      });
    }

    // Preset Buttons
    document.getElementById("preset-roblox")?.addEventListener("click", () => loadPreset("roblox"));
    document.getElementById("preset-numbers")?.addEventListener("click", () => loadPreset("numbers"));

    // File Upload
    document.getElementById("btn-upload-img")?.addEventListener("click", () => {
      imageUploadInput.click();
    });

    imageUploadInput?.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        activePreset = "custom";
        updatePresetButtons();
        currentImageSrc = evt.target.result;
        sliceAndBuildTiles();
      };
      reader.readAsDataURL(file);
    });

    // Board Toolbar Actions
    scrambleBtn?.addEventListener("click", () => scrambleBoard(N * 15));
    resetBtn?.addEventListener("click", () => resetBoardToSolved());
    rotateBtn?.addEventListener("click", () => rotateBoard());
    setBlankBtn?.addEventListener("click", () => toggleBlankMode());
    toggleNumbersBtn?.addEventListener("click", () => toggleNumbersOverlay());
    solveBtn?.addEventListener("click", () => executeSolve());

    // Playback Controls
    prevBtn?.addEventListener("click", () => stepMove(-1));
    nextBtn?.addEventListener("click", () => stepMove(1));
    startBtn?.addEventListener("click", () => jumpToStep(0));
    endBtn?.addEventListener("click", () => jumpToStep(solutionMoves.length));
    playBtn?.addEventListener("click", () => togglePlay());

    stepScrubber?.addEventListener("input", (e) => {
      jumpToStep(parseInt(e.target.value, 10));
    });

    speedSelect?.addEventListener("change", (e) => {
      playSpeedMs = parseInt(e.target.value, 10);
      if (playInterval) {
        pausePlay();
        startPlay();
      }
    });

    copyStepsBtn?.addEventListener("click", () => copyStepsToClipboard());

    // Palette Search
    paletteSearchInput?.addEventListener("input", (e) => {
      renderPalette(e.target.value);
    });

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (solutionMoves.length === 0) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepMove(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepMove(-1);
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Home") {
        e.preventDefault();
        jumpToStep(0);
      } else if (e.key === "End") {
        e.preventDefault();
        jumpToStep(solutionMoves.length);
      }
    });
  }

  /**
   * Set Grid Size N
   */
  async function setGridSize(newN) {
    if (newN === N) return;
    N = newN;
    blankTileId = N * N;
    stopPlay();
    solutionMoves = [];
    currentStepIndex = 0;
    playbackPanel.style.display = "none";
    await sliceAndBuildTiles();
  }

  /**
   * Load Image Presets
   */
  async function loadPreset(presetName) {
    activePreset = presetName;
    updatePresetButtons();
    stopPlay();
    solutionMoves = [];
    currentStepIndex = 0;
    playbackPanel.style.display = "none";

    if (presetName === "roblox") {
      currentImageSrc = "assets/roblox-noob-solved.jpg";
    } else if (presetName === "numbers") {
      currentImageSrc = generateNumbersCanvas(N);
    }
    await sliceAndBuildTiles();
  }

  function updatePresetButtons() {
    document.querySelectorAll(".preset-btn").forEach(btn => btn.classList.remove("active"));
    const activeBtn = document.getElementById("preset-" + activePreset);
    if (activeBtn) activeBtn.classList.add("active");
  }

  /**
   * Slices the current image into N x N square tiles using HTML5 Canvas
   */
  function sliceAndBuildTiles() {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Set reference image preview
        referenceImgEl.src = img.src;

        // Draw image onto square canvas
        const size = 640;
        referenceCanvas.width = size;
        referenceCanvas.height = size;
        const ctx = referenceCanvas.getContext("2d");
        ctx.drawImage(img, 0, 0, size, size);

        tilesData = [];
        const tileSize = size / N;

        // Slice into N x N pieces
        for (let r = 0; r < N; r++) {
          for (let c = 0; c < N; c++) {
            const tileId = r * N + c + 1;
            const tileCanvas = document.createElement("canvas");
            tileCanvas.width = tileSize;
            tileCanvas.height = tileSize;
            const tCtx = tileCanvas.getContext("2d");

            // Extract tile
            tCtx.drawImage(
              referenceCanvas,
              c * tileSize, r * tileSize, tileSize, tileSize,
              0, 0, tileSize, tileSize
            );

            tilesData.push({
              id: tileId,
              dataUrl: tileCanvas.toDataURL("image/png"),
              label: `Tile #${tileId} (Row ${r + 1}, Col ${c + 1})`
            });
          }
        }

        // Initialize board in solved state
        blankTileId = N * N;
        currentBoard = [];
        for (let i = 1; i <= N * N; i++) {
          currentBoard.push(i);
        }

        renderCoordinates();
        renderBoard();
        renderPalette();
        updateSolvabilityBanner();
        resolve();
      };

      img.onerror = () => {
        // Fallback to numbers canvas if image fails to load
        currentImageSrc = generateNumbersCanvas(N);
        img.src = currentImageSrc;
      };

      img.src = currentImageSrc;
    });
  }

  /**
   * Generates a clean gradient numbered image for testing without external assets
   */
  function generateNumbersCanvas(n) {
    const size = 640;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    const tileSize = size / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const id = r * n + c + 1;
        const x = c * tileSize;
        const y = r * tileSize;

        // Gradient background
        const grad = ctx.createLinearGradient(x, y, x + tileSize, y + tileSize);
        const hue = Math.floor((id / (n * n)) * 260 + 160) % 360;
        grad.addColorStop(0, `hsl(${hue}, 65%, 28%)`);
        grad.addColorStop(1, `hsl(${hue}, 75%, 18%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, tileSize, tileSize);

        // Border
        ctx.strokeStyle = "#073642";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, tileSize, tileSize);

        // Text
        ctx.fillStyle = "#eee8d5";
        ctx.font = `bold ${Math.floor(tileSize * 0.35)}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(id.toString(), x + tileSize / 2, y + tileSize / 2);
      }
    }
    return canvas.toDataURL("image/png");
  }

  /**
   * Render Coordinate Headers (Row 1..N and Col 1..N)
   */
  function renderCoordinates() {
    if (!colCoordsHeader || !rowCoordsHeader) return;
    colCoordsHeader.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    rowCoordsHeader.style.gridTemplateRows = `repeat(${N}, 1fr)`;

    colCoordsHeader.innerHTML = "";
    for (let c = 1; c <= N; c++) {
      const el = document.createElement("div");
      el.textContent = c;
      colCoordsHeader.appendChild(el);
    }

    rowCoordsHeader.innerHTML = "";
    for (let r = 1; r <= N; r++) {
      const el = document.createElement("div");
      el.textContent = r;
      rowCoordsHeader.appendChild(el);
    }
  }

  /**
   * Render the Puzzle Board
   */
  function renderBoard() {
    if (!boardEl) return;
    boardEl.style.gridTemplateColumns = `repeat(${N}, 1fr)`;
    boardEl.style.gridTemplateRows = `repeat(${N}, 1fr)`;
    boardEl.innerHTML = "";

    // Determine current next-move tile and target blank for playback
    let nextMoveTileId = null;
    let nextMoveDir = null;
    let targetBlankSlot = null;

    if (solutionMoves.length > 0 && currentStepIndex < solutionMoves.length) {
      const move = solutionMoves[currentStepIndex];
      nextMoveTileId = move.tile;
      nextMoveDir = move.dir;
      targetBlankSlot = move.blankFrom.r * N + move.blankFrom.c;
    }

    for (let idx = 0; idx < N * N; idx++) {
      const tileId = currentBoard[idx];
      const row = Math.floor(idx / N);
      const col = idx % N;

      const tileEl = document.createElement("div");
      tileEl.className = "puzzle-tile";
      tileEl.dataset.slot = idx;
      tileEl.dataset.tile = tileId;

      if (tileId === blankTileId) {
        tileEl.classList.add("is-blank");
        tileEl.title = `Blank space at Row ${row + 1}, Col ${col + 1}`;
      } else {
        const tileInfo = tilesData.find(t => t.id === tileId);
        if (tileInfo) {
          tileEl.style.backgroundImage = `url("${tileInfo.dataUrl}")`;
        }
        tileEl.title = `Tile #${tileId} at Row ${row + 1}, Col ${col + 1}`;

        // Number Badge
        if (showNumbers) {
          const badge = document.createElement("span");
          badge.className = "tile-number-badge";
          badge.textContent = tileId;
          tileEl.appendChild(badge);
        }
      }

      // Selection state
      if (selectedSlotIndex === idx) {
        tileEl.classList.add("is-selected");
      }

      // Next Move Highlighting (Playback mode)
      if (tileId === nextMoveTileId && tileId !== blankTileId) {
        tileEl.classList.add("is-next-move");

        // Direction Arrow Overlay
        const arrowEl = document.createElement("div");
        arrowEl.className = "tile-move-indicator";
        let arrowSymbol = "⬆";
        if (nextMoveDir === "DOWN") arrowSymbol = "⬇";
        else if (nextMoveDir === "LEFT") arrowSymbol = "⬅";
        else if (nextMoveDir === "RIGHT") arrowSymbol = "➡";

        arrowEl.innerHTML = `<span class="tile-move-arrow-icon">${arrowSymbol}</span>`;
        tileEl.appendChild(arrowEl);
      }

      // Target Blank Slot Highlight
      if (idx === targetBlankSlot) {
        tileEl.classList.add("is-target-blank");
      }

      // Drag and Drop
      tileEl.draggable = (solutionMoves.length === 0);
      tileEl.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", idx.toString());
      });
      tileEl.addEventListener("dragover", (e) => e.preventDefault());
      tileEl.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (!isNaN(fromIdx) && fromIdx !== idx) {
          swapBoardSlots(fromIdx, idx);
        }
      });

      // Click Handler
      tileEl.addEventListener("click", () => handleTileClick(idx));

      boardEl.appendChild(tileEl);
    }
  }

  /**
   * Render the Tile Picker Palette
   */
  function renderPalette(filterText = "") {
    if (!paletteGridEl) return;
    paletteGridEl.innerHTML = "";
    const query = filterText.toLowerCase().trim();

    tilesData.forEach(tile => {
      if (query && !tile.id.toString().includes(query)) return;

      const isPlaced = currentBoard.includes(tile.id);
      const isBlank = (tile.id === blankTileId);

      const itemEl = document.createElement("div");
      itemEl.className = "palette-item";
      if (isPlaced) itemEl.classList.add("is-placed");
      if (isBlank) itemEl.classList.add("is-blank-item");

      itemEl.style.backgroundImage = `url("${tile.dataUrl}")`;
      itemEl.title = tile.label + (isPlaced ? " (Placed)" : " (Available)");

      const badge = document.createElement("span");
      badge.className = "palette-badge";
      badge.textContent = isBlank ? "BLANK" : `#${tile.id}`;
      itemEl.appendChild(badge);

      itemEl.addEventListener("click", () => {
        if (selectedSlotIndex !== null) {
          assignTileToSlot(selectedSlotIndex, tile.id);
        }
      });

      paletteGridEl.appendChild(itemEl);
    });
  }

  /**
   * Handle Click on Board Tile
   */
  function handleTileClick(slotIdx) {
    if (solutionMoves.length > 0) {
      // In playback mode, click resets or shows step info
      return;
    }

    if (isSettingBlank) {
      // Designate clicked slot's tile as the blank
      blankTileId = currentBoard[slotIdx];
      isSettingBlank = false;
      setBlankBtn.classList.remove("active");
      renderBoard();
      renderPalette();
      updateSolvabilityBanner();
      return;
    }

    if (selectedSlotIndex === null) {
      // First selection
      selectedSlotIndex = slotIdx;
      renderBoard();
    } else if (selectedSlotIndex === slotIdx) {
      // Deselect
      selectedSlotIndex = null;
      renderBoard();
    } else {
      // Second selection: SWAP the two slots!
      swapBoardSlots(selectedSlotIndex, slotIdx);
      selectedSlotIndex = null;
    }
  }

  /**
   * Swap two board positions
   */
  function swapBoardSlots(idx1, idx2) {
    const temp = currentBoard[idx1];
    currentBoard[idx1] = currentBoard[idx2];
    currentBoard[idx2] = temp;

    // Reset any ongoing solution
    solutionMoves = [];
    playbackPanel.style.display = "none";

    renderBoard();
    renderPalette();
    updateSolvabilityBanner();
  }

  /**
   * Assign a chosen tile from palette to a board slot
   */
  function assignTileToSlot(slotIdx, tileId) {
    // If tileId already exists elsewhere, swap it
    const existingIdx = currentBoard.indexOf(tileId);
    if (existingIdx !== -1) {
      const oldVal = currentBoard[slotIdx];
      currentBoard[slotIdx] = tileId;
      currentBoard[existingIdx] = oldVal;
    } else {
      currentBoard[slotIdx] = tileId;
    }

    selectedSlotIndex = null;
    solutionMoves = [];
    playbackPanel.style.display = "none";

    renderBoard();
    renderPalette();
    updateSolvabilityBanner();
  }

  /**
   * Toggle Blank Positioning Mode
   */
  function toggleBlankMode() {
    isSettingBlank = !isSettingBlank;
    if (isSettingBlank) {
      setBlankBtn.classList.add("active");
      selectedSlotIndex = null;
    } else {
      setBlankBtn.classList.remove("active");
    }
    renderBoard();
  }

  /**
   * Toggle numbers overlay
   */
  function toggleNumbersOverlay() {
    showNumbers = !showNumbers;
    toggleNumbersBtn.classList.toggle("active", showNumbers);
    renderBoard();
  }

  /**
   * Rotate board by 90 degrees clockwise (To match Roblox in-game camera orientation)
   */
  function rotateBoard() {
    const newBoard = new Array(N * N);
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        // (r, c) -> (c, N - 1 - r)
        const oldIdx = r * N + c;
        const newR = c;
        const newC = N - 1 - r;
        const newIdx = newR * N + newC;
        newBoard[newIdx] = currentBoard[oldIdx];
      }
    }
    currentBoard = newBoard;
    boardRotation = (boardRotation + 90) % 360;

    solutionMoves = [];
    playbackPanel.style.display = "none";

    renderBoard();
    updateSolvabilityBanner();
  }

  /**
   * Scramble the board with valid sliding moves
   */
  function scrambleBoard(numSlides = 60) {
    stopPlay();
    solutionMoves = [];
    playbackPanel.style.display = "none";

    const dirs = [
      { r: -1, c: 0 },
      { r: 1, c: 0 },
      { r: 0, c: -1 },
      { r: 0, c: 1 }
    ];

    let lastMove = null;
    for (let i = 0; i < numSlides; i++) {
      const blankIdx = currentBoard.indexOf(blankTileId);
      const br = Math.floor(blankIdx / N);
      const bc = blankIdx % N;

      const validNeighbors = [];
      for (let d = 0; d < 4; d++) {
        const nr = br + dirs[d].r;
        const nc = bc + dirs[d].c;
        if (nr >= 0 && nr < N && nc >= 0 && nc < N) {
          const nIdx = nr * N + nc;
          // Avoid immediately reversing previous move
          if (nIdx !== lastMove) {
            validNeighbors.push(nIdx);
          }
        }
      }

      if (validNeighbors.length === 0) continue;
      const chosenIdx = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
      lastMove = blankIdx;

      // Swap
      currentBoard[blankIdx] = currentBoard[chosenIdx];
      currentBoard[chosenIdx] = blankTileId;
    }

    renderBoard();
    renderPalette();
    updateSolvabilityBanner();
  }

  /**
   * Reset the board back to the pristine solved state
   */
  function resetBoardToSolved() {
    stopPlay();
    solutionMoves = [];
    playbackPanel.style.display = "none";

    currentBoard = [];
    for (let i = 1; i <= N * N; i++) {
      currentBoard.push(i);
    }
    blankTileId = N * N;

    renderBoard();
    renderPalette();
    updateSolvabilityBanner();
  }

  /**
   * Check and update solvability status banner
   */
  function updateSolvabilityBanner() {
    if (!statusBannerEl) return;

    // Check if board contains unique valid tiles
    const tileSet = new Set(currentBoard);
    if (tileSet.size !== N * N) {
      statusBannerEl.className = "status-banner is-incomplete";
      statusBannerEl.innerHTML = `
        <span>⚠️ <strong>Incomplete Setup:</strong> Duplicate or missing tiles detected. Please assign all ${N * N} tiles.</span>
      `;
      solveBtn.disabled = true;
      return;
    }

    // Check if already solved
    let isSolved = true;
    for (let i = 0; i < N * N; i++) {
      if (currentBoard[i] !== i + 1) {
        isSolved = false;
        break;
      }
    }
    if (isSolved) {
      statusBannerEl.className = "status-banner is-solved";
      statusBannerEl.innerHTML = `
        <span>✨ <strong>Puzzle is already solved!</strong> All tiles are in their correct positions.</span>
      `;
      solveBtn.disabled = true;
      return;
    }

    // Map tiles to standard 1..(N*N-1) and blank 0 for parity check
    const mappedBoard = currentBoard.map(t => (t === blankTileId ? 0 : t));
    const solvability = SlidePuzzleSolver.checkSolvability(N, mappedBoard, 0);

    if (solvability.solvable) {
      statusBannerEl.className = "status-banner is-solvable";
      statusBannerEl.innerHTML = `
        <span>✅ <strong>Solvable Board:</strong> Configuration has valid parity (${solvability.inversions} inversions). Ready to solve!</span>
      `;
      solveBtn.disabled = false;
    } else {
      statusBannerEl.className = "status-banner is-unsolvable";
      statusBannerEl.innerHTML = `
        <span>⚠️ <strong>Unsolvable Parity:</strong> This tile arrangement cannot be solved using legal sliding moves.</span>
        <button class="status-action-btn" id="btn-fix-parity">Auto-Fix Parity</button>
      `;
      solveBtn.disabled = true;

      document.getElementById("btn-fix-parity")?.addEventListener("click", () => {
        const fixed = SlidePuzzleSolver.fixParity(N, currentBoard, blankTileId);
        currentBoard = fixed;
        renderBoard();
        updateSolvabilityBanner();
      });
    }
  }

  /**
   * Execute Slide Puzzle Solver
   */
  function executeSolve() {
    stopPlay();
    solveBtn.disabled = true;
    solveBtn.innerHTML = `<span>⏳ Calculating...</span>`;

    // Map board to 1..(N*N-1) with 0 as blank
    // First, let's normalize tile values so that goal is sorted 1..N^2-1, 0
    const mappedBoard = currentBoard.map(t => (t === blankTileId ? 0 : t));

    // Run solver in next tick so UI updates button text
    setTimeout(() => {
      try {
        const startTime = performance.now();
        const solver = new SlidePuzzleSolver.Solver(N, mappedBoard, 0);
        const moves = solver.solve();
        const elapsed = (performance.now() - startTime).toFixed(1);

        solutionMoves = moves;
        currentStepIndex = 0;

        solveBtn.disabled = false;
        solveBtn.innerHTML = `<span>⚡ Solve Puzzle</span>`;

        if (solutionMoves.length === 0) {
          alert("The puzzle is already solved!");
          return;
        }

        // Show playback panel
        playbackPanel.style.display = "block";
        stepScrubber.max = solutionMoves.length;
        stepScrubber.value = 0;
        const totalCountEl = document.getElementById("steps-total-count");
        if (totalCountEl) totalCountEl.textContent = solutionMoves.length;

        // Render steps list
        renderStepsList();
        updateStepDisplay();
        renderBoard();

        // Scroll playback panel into view smoothly
        playbackPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });

      } catch (err) {
        solveBtn.disabled = false;
        solveBtn.innerHTML = `<span>⚡ Solve Puzzle</span>`;
        alert("Solver Error: " + err.message);
      }
    }, 50);
  }

  /**
   * Render the list of all solution steps in the accordion
   */
  function renderStepsList() {
    if (!stepsListEl) return;
    stepsListEl.innerHTML = "";

    let lastPhase = "";
    solutionMoves.forEach((move, idx) => {
      if (move.phase && move.phase !== lastPhase) {
        lastPhase = move.phase;
        const phaseEl = document.createElement("div");
        phaseEl.className = "step-phase-divider";
        phaseEl.textContent = move.phase;
        stepsListEl.appendChild(phaseEl);
      }

      const rowEl = document.createElement("div");
      rowEl.className = "step-row-item";
      rowEl.id = `step-item-${idx}`;

      const fromCoord = `(${move.from.r + 1}, ${move.from.c + 1})`;
      rowEl.innerHTML = `
        <span><strong>#${idx + 1}</strong> Tile #${move.tile} ${move.dirDesc}</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${fromCoord}</span>
      `;

      rowEl.addEventListener("click", () => jumpToStep(idx));
      stepsListEl.appendChild(rowEl);
    });
  }

  /**
   * Update current step display and highlights
   */
  function updateStepDisplay() {
    const totalMoves = solutionMoves.length;
    stepScrubber.value = currentStepIndex;
    scrubLabel.textContent = `${currentStepIndex} / ${totalMoves}`;

    // Highlight active step in scroll list
    document.querySelectorAll(".step-row-item").forEach(item => item.classList.remove("is-current"));
    const activeItem = document.getElementById(`step-item-${currentStepIndex}`);
    if (activeItem) {
      activeItem.classList.add("is-current");
      activeItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    if (currentStepIndex === totalMoves) {
      // Puzzle solved state!
      instructionStepNum.innerHTML = `<span>FINISHED</span> <span>Step ${totalMoves} of ${totalMoves}</span>`;
      instructionMainText.innerHTML = `🎉 <strong>PUZZLE COMPLETED!</strong> Original image is fully restored.`;
      instructionSubText.textContent = "All tiles are now in their solved positions.";
      nextBtn.disabled = true;
      prevBtn.disabled = false;
      return;
    }

    const move = solutionMoves[currentStepIndex];
    const stepNum = currentStepIndex + 1;
    const tileRow = move.from.r + 1;
    const tileCol = move.from.c + 1;

    instructionStepNum.innerHTML = `
      <span>${move.phase || "Step"}</span>
      <span>Move ${stepNum} of ${totalMoves}</span>
    `;

    instructionMainText.innerHTML = `
      👉 Slide <strong>Tile #${move.tile}</strong> <span class="dir-highlight">${move.dir}</span> into the blank
    `;

    instructionSubText.innerHTML = `
      🎮 In Roblox: Stand on Tile <strong>[Row ${tileRow}, Col ${tileCol}]</strong> and press <span class="roblox-key-badge">E</span> to slide ${move.dir}.
    `;

    prevBtn.disabled = (currentStepIndex === 0);
    nextBtn.disabled = (currentStepIndex >= totalMoves);
  }

  /**
   * Step Move forward or backward
   */
  function stepMove(delta) {
    const newIdx = currentStepIndex + delta;
    if (newIdx < 0 || newIdx > solutionMoves.length) return;
    jumpToStep(newIdx);
  }

  /**
   * Jump to a specific step index
   */
  function jumpToStep(stepIdx) {
    if (stepIdx < 0) stepIdx = 0;
    if (stepIdx > solutionMoves.length) stepIdx = solutionMoves.length;

    currentStepIndex = stepIdx;

    if (stepIdx === 0) {
      // Initial board before solving
      const move = solutionMoves[0];
      // Board state before move 0: reverse move 0 from its snapshot or use initialBoard
      currentBoard = getBoardAtStep(0);
    } else {
      const move = solutionMoves[stepIdx - 1];
      // Snapshot stored in move.boardState has tiles mapped (0 for blank)
      currentBoard = move.boardState.map(val => (val === 0 ? blankTileId : val));
    }

    renderBoard();
    updateStepDisplay();
  }

  /**
   * Reconstruct board state at step 0
   */
  function getBoardAtStep(step) {
    if (step === 0) {
      if (solutionMoves.length > 0) {
        // Reverse first move from step 1 snapshot
        const firstMove = solutionMoves[0];
        const copy = firstMove.boardState.slice().map(v => (v === 0 ? blankTileId : v));
        // Reverse first slide: blank moved to blankTo from blankFrom
        const bIdx = firstMove.blankTo.r * N + firstMove.blankTo.c;
        const tIdx = firstMove.blankFrom.r * N + firstMove.blankFrom.c;
        copy[tIdx] = blankTileId;
        copy[bIdx] = firstMove.tile;
        return copy;
      }
      return currentBoard.slice();
    }
    const move = solutionMoves[step - 1];
    return move.boardState.map(v => (v === 0 ? blankTileId : v));
  }

  /**
   * Toggle Play / Pause
   */
  function togglePlay() {
    if (playInterval) {
      pausePlay();
    } else {
      startPlay();
    }
  }

  function startPlay() {
    if (currentStepIndex >= solutionMoves.length) {
      jumpToStep(0);
    }
    playBtn.innerHTML = `<span>⏸ Pause</span>`;
    playBtn.classList.add("active");
    playInterval = setInterval(() => {
      if (currentStepIndex < solutionMoves.length) {
        stepMove(1);
      } else {
        pausePlay();
      }
    }, playSpeedMs);
  }

  function pausePlay() {
    if (playInterval) {
      clearInterval(playInterval);
      playInterval = null;
    }
    playBtn.innerHTML = `<span>▶ Play</span>`;
    playBtn.classList.remove("active");
  }

  function stopPlay() {
    pausePlay();
  }

  /**
   * Copy all steps to clipboard formatted nicely
   */
  function copyStepsToClipboard() {
    if (solutionMoves.length === 0) return;
    const lines = [
      `=== Roblox Slide Puzzle Solution (${N}x${N} - ${solutionMoves.length} Moves) ===`,
      ""
    ];

    solutionMoves.forEach((move, i) => {
      lines.push(`Step ${i + 1}: Slide Tile #${move.tile} ${move.dir} (Stand at [Row ${move.from.r + 1}, Col ${move.from.c + 1}])`);
    });

    const text = lines.join("\n");
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        alert("Solution steps copied to clipboard!");
      });
    } else {
      prompt("Copy solution steps:", text);
    }
  }

  // Start app
  init();
});
