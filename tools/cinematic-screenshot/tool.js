/**
 * Cinematic Screenshot - NORTHSTAR's tools
 * High-performance 100% Client-side HTML5 Canvas Cinema Stills Generator
 */

(function () {
  "use strict";

  // Elements
  const dropzonePanel = document.getElementById("dropzone-panel");
  const workbench = document.getElementById("workbench");
  const fileInput = document.getElementById("file-input");
  const btnBrowse = document.getElementById("btn-browse");
  const btnSample = document.getElementById("btn-sample");
  const btnNewImage = document.getElementById("btn-new-image");
  const btnResetSliders = document.getElementById("btn-reset-sliders");
  const btnCompare = document.getElementById("btn-compare");
  const sharePageBtn = document.getElementById("share-page-btn");

  // Canvases & Viewport
  const mainCanvas = document.getElementById("main-canvas");
  const compareCanvas = document.getElementById("compare-canvas");
  const compareBadge = document.getElementById("compare-badge");
  const metaDims = document.getElementById("meta-dims");
  const metaAspect = document.getElementById("meta-aspect");

  // Filter Presets Strip Container
  const filterStripContainer = document.getElementById("filter-strip-container");

  // Movie Bars Controls
  const toggleBars = document.getElementById("toggle-bars");
  const sliderBars = document.getElementById("slider-bars");
  const valBars = document.getElementById("val-bars");
  const aspectBtns = document.querySelectorAll(".aspect-btn");
  const barThicknessContainer = document.getElementById("bar-thickness-container");

  // Adjustment Sliders
  const sliderVignette = document.getElementById("slider-vignette");
  const valVignette = document.getElementById("val-vignette");

  const sliderGrain = document.getElementById("slider-grain");
  const valGrain = document.getElementById("val-grain");

  const sliderWarmth = document.getElementById("slider-warmth");
  const valWarmth = document.getElementById("val-warmth");

  const sliderContrast = document.getElementById("slider-contrast");
  const valContrast = document.getElementById("val-contrast");

  const sliderExposure = document.getElementById("slider-exposure");
  const valExposure = document.getElementById("val-exposure");

  const sliderSaturation = document.getElementById("slider-saturation");
  const valSaturation = document.getElementById("val-saturation");

  // Export Buttons
  const btnDownloadPng = document.getElementById("btn-download-png");
  const btnDownloadJpg = document.getElementById("btn-download-jpg");
  const btnCopyImg = document.getElementById("btn-copy-img");

  // App State
  let loadedImage = null;
  let activeFilterIndex = 0;
  let renderScheduled = false;
  let grainPattern = null;
  let isComparing = false;

  // Filter Presets Definition
  // Displayed purely as visual tiles without names or text labels as requested
  const FILTER_PRESETS = [
    {
      // 0: Natural / Clean original
      css: { contrast: 1.0, saturate: 1.0, brightness: 1.0, sepia: 0, grayscale: 0, hueRotate: 0 },
      tint: null
    },
    {
      // 1: Warm Golden Cinema (Instagram Juno / Valencia feel)
      css: { contrast: 1.12, saturate: 1.15, brightness: 1.02, sepia: 0.1, grayscale: 0, hueRotate: 0 },
      tint: { color: "rgba(255, 170, 50, 0.22)", blend: "soft-light" }
    },
    {
      // 2: Hollywood Teal & Orange Blockbuster
      css: { contrast: 1.22, saturate: 1.18, brightness: 1.0, sepia: 0.05, grayscale: 0, hueRotate: -5 },
      tint: { type: "teal-orange", blend: "soft-light" }
    },
    {
      // 3: Moody Film Noir (Monochrome Cinema / Moon)
      css: { contrast: 1.38, saturate: 0, brightness: 1.04, sepia: 0, grayscale: 1.0, hueRotate: 0 },
      tint: null
    },
    {
      // 4: 35mm Vintage Analog Film (Faded matte blacks, Gingham / 1977)
      css: { contrast: 0.96, saturate: 0.88, brightness: 1.06, sepia: 0.2, grayscale: 0, hueRotate: 0 },
      tint: { color: "rgba(255, 235, 205, 0.18)", blend: "soft-light" }
    },
    {
      // 5: Neo-Tokyo / Cyber Cold Sci-Fi
      css: { contrast: 1.25, saturate: 1.25, brightness: 0.98, sepia: 0, grayscale: 0, hueRotate: -15 },
      tint: { color: "rgba(0, 180, 216, 0.25)", blend: "soft-light" }
    },
    {
      // 6: Clarendon High-Contrast Drama
      css: { contrast: 1.32, saturate: 1.22, brightness: 1.02, sepia: 0, grayscale: 0, hueRotate: 0 },
      tint: { color: "rgba(0, 60, 120, 0.15)", blend: "soft-light" }
    },
    {
      // 7: Golden Hour Sunset Glow
      css: { contrast: 1.15, saturate: 1.35, brightness: 1.05, sepia: 0.15, grayscale: 0, hueRotate: 0 },
      tint: { color: "rgba(251, 133, 0, 0.28)", blend: "soft-light" }
    },
    {
      // 8: Bleach Bypass / Fincher Gritty Action
      css: { contrast: 1.45, saturate: 0.5, brightness: 0.98, sepia: 0, grayscale: 0, hueRotate: 0 },
      tint: { color: "rgba(100, 116, 139, 0.25)", blend: "overlay" }
    },
    {
      // 9: Pastel Indie Soft Dream
      css: { contrast: 0.92, saturate: 1.1, brightness: 1.1, sepia: 0.05, grayscale: 0, hueRotate: 0 },
      tint: { color: "rgba(255, 205, 210, 0.22)", blend: "soft-light" }
    },
    {
      // 10: Emerald Matrix Shadow Cast
      css: { contrast: 1.2, saturate: 0.85, brightness: 1.0, sepia: 0.08, grayscale: 0, hueRotate: 20 },
      tint: { color: "rgba(20, 80, 50, 0.3)", blend: "soft-light" }
    },
    {
      // 11: Classic Sepia Film
      css: { contrast: 1.18, saturate: 0.85, brightness: 1.02, sepia: 0.7, grayscale: 0, hueRotate: 0 },
      tint: { color: "rgba(120, 70, 20, 0.15)", blend: "soft-light" }
    }
  ];

  // Initialize
  function init() {
    initGrainPattern();
    buildFilterPresetTiles();
    setupEventListeners();
  }

  // Pre-generate cached 256x256 monochrome film grain texture
  // Tiling an off-screen noise pattern is ~100x faster than per-pixel random loops
  function initGrainPattern() {
    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = 256;
    grainCanvas.height = 256;
    const gCtx = grainCanvas.getContext("2d");
    const imgData = gCtx.createImageData(256, 256);
    const data = imgData.data;

    for (let i = 0; i < data.length; i += 4) {
      const val = (Math.random() * 255) | 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }

    gCtx.putImageData(imgData, 0, 0);

    const dummyCanvas = document.createElement("canvas");
    const dCtx = dummyCanvas.getContext("2d");
    grainPattern = dCtx.createPattern(grainCanvas, "repeat");
  }

  // Build Filter Presets Strip without any text labels
  function buildFilterPresetTiles() {
    if (!filterStripContainer) return;
    filterStripContainer.innerHTML = "";

    FILTER_PRESETS.forEach((preset, index) => {
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = `filter-tile ${index === 0 ? "active" : ""}`;
      tile.setAttribute("role", "radio");
      tile.setAttribute("aria-checked", index === 0 ? "true" : "false");
      tile.dataset.index = index;

      const miniCanvas = document.createElement("canvas");
      miniCanvas.width = 74;
      miniCanvas.height = 74;
      tile.appendChild(miniCanvas);

      tile.addEventListener("click", () => {
        selectFilterPreset(index);
      });

      filterStripContainer.appendChild(tile);
    });
  }

  // Update Thumbnail Previews on all filter tiles
  function updateFilterThumbnails() {
    if (!loadedImage) return;

    // Downscale source image once to 74x74 offscreen buffer
    const thumbBuffer = document.createElement("canvas");
    thumbBuffer.width = 74;
    thumbBuffer.height = 74;
    const bCtx = thumbBuffer.getContext("2d");

    // Center crop to square
    const minDim = Math.min(loadedImage.width, loadedImage.height);
    const sx = (loadedImage.width - minDim) / 2;
    const sy = (loadedImage.height - minDim) / 2;
    bCtx.drawImage(loadedImage, sx, sy, minDim, minDim, 0, 0, 74, 74);

    const tiles = filterStripContainer.querySelectorAll(".filter-tile");
    tiles.forEach((tile, index) => {
      const canvas = tile.querySelector("canvas");
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const preset = FILTER_PRESETS[index];

      ctx.clearRect(0, 0, 74, 74);
      ctx.save();

      // Apply preset CSS filter
      ctx.filter = buildCssFilterString(preset.css, 1, 0, 1);
      ctx.drawImage(thumbBuffer, 0, 0, 74, 74);
      ctx.restore();

      // Apply preset tint overlay
      if (preset.tint) {
        applyPresetTint(ctx, preset.tint, 74, 74);
      }

      // Draw subtle mini cinema bars on thumbnail for aesthetic feel
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, 74, 8);
      ctx.fillRect(0, 66, 74, 8);
    });
  }

  // Select Filter Preset
  function selectFilterPreset(index) {
    activeFilterIndex = index;
    const tiles = filterStripContainer.querySelectorAll(".filter-tile");
    tiles.forEach((tile, idx) => {
      const isActive = idx === index;
      tile.classList.toggle("active", isActive);
      tile.setAttribute("aria-checked", isActive ? "true" : "false");
    });
    scheduleRender();
  }

  // Event Listeners
  function setupEventListeners() {
    // Browse & drag-drop
    btnBrowse.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFileSelect);
    btnSample.addEventListener("click", loadSamplePicture);
    btnNewImage.addEventListener("click", clearImage);

    // Global Paste
    window.addEventListener("paste", handleGlobalPaste);

    // Global Drag & Drop
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    // Sliders input
    const sliders = [
      sliderBars,
      sliderVignette,
      sliderGrain,
      sliderWarmth,
      sliderContrast,
      sliderExposure,
      sliderSaturation
    ];

    sliders.forEach(slider => {
      slider.addEventListener("input", () => {
        updateSliderValuesUI();
        if (slider === sliderBars) {
          clearAspectBtnsActive();
          const customBtn = document.querySelector('.aspect-btn[data-ratio="custom"]');
          if (customBtn) customBtn.classList.add("active");
        }
        scheduleRender();
      });
    });

    // Movie Bars Toggle
    toggleBars.addEventListener("change", () => {
      barThicknessContainer.style.opacity = toggleBars.checked ? "1" : "0.4";
      barThicknessContainer.style.pointerEvents = toggleBars.checked ? "auto" : "none";
      scheduleRender();
    });

    // Aspect Ratio Buttons
    aspectBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const ratioAttr = btn.dataset.ratio;
        clearAspectBtnsActive();
        btn.classList.add("active");

        if (ratioAttr === "custom") {
          // Keep current slider value
        } else {
          const ratioVal = parseFloat(ratioAttr);
          applyAspectRatioBars(ratioVal);
        }
        scheduleRender();
      });
    });

    // Reset Sliders
    btnResetSliders.addEventListener("click", resetAdjustments);

    // Compare button (Hold to Compare)
    btnCompare.addEventListener("mousedown", startCompare);
    window.addEventListener("mouseup", stopCompare);
    btnCompare.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startCompare();
    }, { passive: false });
    window.addEventListener("touchend", stopCompare);

    // Exports
    btnDownloadPng.addEventListener("click", () => exportImage("png"));
    btnDownloadJpg.addEventListener("click", () => exportImage("jpeg"));
    btnCopyImg.addEventListener("click", copyImageToClipboard);

    // Share tool link
    if (sharePageBtn) {
      sharePageBtn.addEventListener("click", copyToolLink);
    }
  }

  // Calculate Bar Thickness for Specified Aspect Ratio
  function applyAspectRatioBars(targetRatio) {
    if (!loadedImage) return;
    const w = loadedImage.width;
    const h = loadedImage.height;
    const currentRatio = w / h;

    if (currentRatio < targetRatio) {
      // Image is taller than target cinematic widescreen: add letterbox bars
      const targetHeight = w / targetRatio;
      const totalBarHeight = h - targetHeight;
      const singleBarPercent = ((totalBarHeight / 2) / h) * 100;
      const clampedPercent = Math.min(25, Math.max(0, singleBarPercent));
      sliderBars.value = clampedPercent.toFixed(1);
    } else {
      // Image is already wider or equal: 0% bars
      sliderBars.value = "0";
    }

    if (!toggleBars.checked) {
      toggleBars.checked = true;
      barThicknessContainer.style.opacity = "1";
      barThicknessContainer.style.pointerEvents = "auto";
    }

    updateSliderValuesUI();
  }

  function clearAspectBtnsActive() {
    aspectBtns.forEach(b => b.classList.remove("active"));
  }

  // Update Slider Value Readouts
  function updateSliderValuesUI() {
    valBars.textContent = `${sliderBars.value}%`;
    valVignette.textContent = `${sliderVignette.value}%`;
    valGrain.textContent = `${sliderGrain.value}%`;
    valWarmth.textContent = `${sliderWarmth.value > 0 ? "+" : ""}${sliderWarmth.value}`;
    valContrast.textContent = `${sliderContrast.value}%`;
    valExposure.textContent = `${sliderExposure.value > 0 ? "+" : ""}${sliderExposure.value}%`;
    valSaturation.textContent = `${sliderSaturation.value}%`;
  }

  // Reset Sliders to default baseline
  function resetAdjustments() {
    sliderBars.value = "12.5";
    sliderVignette.value = "40";
    sliderGrain.value = "20";
    sliderWarmth.value = "0";
    sliderContrast.value = "115";
    sliderExposure.value = "0";
    sliderSaturation.value = "110";
    toggleBars.checked = true;
    barThicknessContainer.style.opacity = "1";
    barThicknessContainer.style.pointerEvents = "auto";

    clearAspectBtnsActive();
    const defaultAspectBtn = document.querySelector('.aspect-btn[data-ratio="2.39"]');
    if (defaultAspectBtn) defaultAspectBtn.classList.add("active");

    updateSliderValuesUI();
    scheduleRender();
  }

  // File Handling
  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      loadImageFromFile(e.target.files[0]);
    }
    e.target.value = "";
  }

  function handleGlobalPaste(e) {
    const clipboardData = e.clipboardData || window.clipboardData;
    if (!clipboardData || !clipboardData.items) return;

    for (let i = 0; i < clipboardData.items.length; i++) {
      const item = clipboardData.items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          loadImageFromFile(file);
          showToast("Picture loaded from clipboard");
          e.preventDefault();
          return;
        }
      }
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzonePanel.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzonePanel.classList.remove("drag-over");
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    dropzonePanel.classList.remove("drag-over");

    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        loadImageFromFile(file);
      } else {
        showToast("Please drop an image file.");
      }
    }
  }

  function loadImageFromFile(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const img = new Image();
      img.onload = function () {
        setupLoadedImage(img);
        showToast("Image loaded successfully");
      };
      img.onerror = function () {
        showToast("Failed to parse image");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Procedural Sample Cinematic Landscape
  function loadSamplePicture() {
    const sCanvas = document.createElement("canvas");
    sCanvas.width = 1920;
    sCanvas.height = 1080;
    const ctx = sCanvas.getContext("2d");

    // Atmospheric Dusk Sky Gradient
    const sky = ctx.createLinearGradient(0, 0, 0, 750);
    sky.addColorStop(0, "#0b0c16");
    sky.addColorStop(0.3, "#191c33");
    sky.addColorStop(0.65, "#3b233a");
    sky.addColorStop(0.85, "#803c40");
    sky.addColorStop(1, "#c86d48");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 1920, 1080);

    // Distant Stars & Twilight Dots
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    for (let i = 0; i < 90; i++) {
      const sx = (Math.sin(i * 99) * 0.5 + 0.5) * 1920;
      const sy = (Math.cos(i * 47) * 0.5 + 0.5) * 350;
      const sr = (i % 3 === 0) ? 1.5 : 1;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Glowing Twilight Sun / Horizon Glow
    const sunGlow = ctx.createRadialGradient(960, 680, 20, 960, 680, 380);
    sunGlow.addColorStop(0, "rgba(255, 185, 100, 0.9)");
    sunGlow.addColorStop(0.4, "rgba(235, 110, 75, 0.5)");
    sunGlow.addColorStop(1, "rgba(200, 70, 70, 0)");
    ctx.fillStyle = sunGlow;
    ctx.beginPath();
    ctx.arc(960, 680, 380, 0, Math.PI * 2);
    ctx.fill();

    // Distant Mountain Ridge Silhouettes
    ctx.fillStyle = "#1d1527";
    ctx.beginPath();
    ctx.moveTo(0, 710);
    ctx.lineTo(260, 560);
    ctx.lineTo(550, 640);
    ctx.lineTo(820, 520);
    ctx.lineTo(1150, 610);
    ctx.lineTo(1450, 500);
    ctx.lineTo(1720, 630);
    ctx.lineTo(1920, 570);
    ctx.lineTo(1920, 1080);
    ctx.lineTo(0, 1080);
    ctx.fill();

    // Midground Mountain Silhouettes
    ctx.fillStyle = "#120e1a";
    ctx.beginPath();
    ctx.moveTo(0, 760);
    ctx.lineTo(380, 640);
    ctx.lineTo(720, 720);
    ctx.lineTo(1050, 620);
    ctx.lineTo(1400, 730);
    ctx.lineTo(1700, 640);
    ctx.lineTo(1920, 710);
    ctx.lineTo(1920, 1080);
    ctx.lineTo(0, 1080);
    ctx.fill();

    // Foreground Dark Highway & Ground
    ctx.fillStyle = "#09080e";
    ctx.beginPath();
    ctx.moveTo(0, 840);
    ctx.lineTo(1920, 840);
    ctx.lineTo(1920, 1080);
    ctx.lineTo(0, 1080);
    ctx.fill();

    // Winding Perspective Road
    ctx.fillStyle = "#181822";
    ctx.beginPath();
    ctx.moveTo(960, 840);
    ctx.lineTo(975, 840);
    ctx.lineTo(1450, 1080);
    ctx.lineTo(500, 1080);
    ctx.closePath();
    ctx.fill();

    // Road Center Line (Golden Dash)
    ctx.strokeStyle = "rgba(255, 195, 80, 0.65)";
    ctx.lineWidth = 4;
    ctx.setLineDash([24, 18]);
    ctx.beginPath();
    ctx.moveTo(968, 840);
    ctx.lineTo(975, 1080);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing Streetlights & Taillight Streaks
    // Cyan / Amber atmospheric streetlights
    const lightPoles = [
      { x: 800, y: 845, r: 8, col: "rgba(0, 230, 255, 0.85)" },
      { x: 670, y: 890, r: 16, col: "rgba(0, 230, 255, 0.8)" },
      { x: 500, y: 960, r: 24, col: "rgba(0, 230, 255, 0.85)" },
      { x: 1130, y: 845, r: 8, col: "rgba(255, 180, 50, 0.85)" },
      { x: 1250, y: 890, r: 16, col: "rgba(255, 180, 50, 0.8)" },
      { x: 1420, y: 960, r: 24, col: "rgba(255, 180, 50, 0.85)" }
    ];

    lightPoles.forEach(p => {
      const rad = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.r * 2);
      rad.addColorStop(0, p.col);
      rad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = rad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Red car taillight streak
    ctx.strokeStyle = "rgba(255, 45, 65, 0.8)";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(964, 842);
    ctx.quadraticCurveTo(950, 930, 880, 1080);
    ctx.stroke();

    // Cyan headlight streak
    ctx.strokeStyle = "rgba(200, 245, 255, 0.9)";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(972, 842);
    ctx.quadraticCurveTo(990, 930, 1070, 1080);
    ctx.stroke();

    const img = new Image();
    img.onload = function () {
      setupLoadedImage(img);
      showToast("Sample cinematic picture loaded");
    };
    img.src = sCanvas.toDataURL("image/png");
  }

  // Setup Image when Loaded
  function setupLoadedImage(img) {
    loadedImage = img;

    // Set canvas dimensions
    mainCanvas.width = img.width;
    mainCanvas.height = img.height;
    compareCanvas.width = img.width;
    compareCanvas.height = img.height;

    // Draw raw comparison canvas
    const cCtx = compareCanvas.getContext("2d");
    cCtx.drawImage(img, 0, 0);

    // Update metadata info
    metaDims.textContent = `${img.width} \u00D7 ${img.height} px`;
    const aspect = (img.width / img.height).toFixed(2);
    metaAspect.textContent = `${aspect}:1`;

    // Calculate initial 2.39:1 movie bars
    applyAspectRatioBars(2.39);

    // Switch UI panels
    dropzonePanel.classList.add("hidden");
    workbench.classList.remove("hidden");

    // Generate thumbnails on filter strip
    updateFilterThumbnails();

    // Trigger full render
    scheduleRender();
  }

  // Clear Image and return to Dropzone
  function clearImage() {
    loadedImage = null;
    workbench.classList.add("hidden");
    dropzonePanel.classList.remove("hidden");
  }

  // Hold to Compare
  function startCompare() {
    if (!loadedImage) return;
    isComparing = true;
    compareCanvas.classList.remove("hidden");
    compareBadge.classList.remove("hidden");
    btnCompare.classList.add("active");
  }

  function stopCompare() {
    if (!isComparing) return;
    isComparing = false;
    compareCanvas.classList.add("hidden");
    compareBadge.classList.add("hidden");
    btnCompare.classList.remove("active");
  }

  // Build CSS Filter String from preset and user adjustments
  function buildCssFilterString(presetCss, exposureVal, warmthVal, userContrast, userSaturation) {
    // Exposure compensation
    const expFactor = 1 + (exposureVal / 100);
    const totalBrightness = (presetCss.brightness * expFactor).toFixed(3);

    // Contrast
    const contFactor = userContrast / 100;
    const totalContrast = (presetCss.contrast * contFactor).toFixed(3);

    // Saturation
    const satFactor = userSaturation / 100;
    const totalSaturate = (presetCss.saturate * satFactor).toFixed(3);

    let filterStr = `brightness(${totalBrightness}) contrast(${totalContrast}) saturate(${totalSaturate})`;

    if (presetCss.sepia > 0) {
      filterStr += ` sepia(${presetCss.sepia})`;
    }
    if (presetCss.grayscale > 0) {
      filterStr += ` grayscale(${presetCss.grayscale})`;
    }
    if (presetCss.hueRotate !== 0) {
      filterStr += ` hue-rotate(${presetCss.hueRotate}deg)`;
    }

    return filterStr;
  }

  // Apply Preset Color Grading Overlay
  function applyPresetTint(ctx, tint, w, h) {
    if (!tint) return;
    ctx.save();
    ctx.globalCompositeOperation = tint.blend || "soft-light";

    if (tint.type === "teal-orange") {
      // Split vertical/radial Hollywood Blockbuster color grade
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "rgba(0, 95, 115, 0.35)");   // Deep Teal shadow tone
      grad.addColorStop(0.5, "rgba(10, 147, 150, 0.15)");
      grad.addColorStop(1, "rgba(247, 127, 0, 0.3)");   // Warm Golden highlights
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    } else if (tint.color) {
      ctx.fillStyle = tint.color;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }

  // Apply Warmth / Temperature Adjustment (-100 to +100)
  function applyWarmth(ctx, warmth, w, h) {
    if (warmth === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";

    const opacity = (Math.abs(warmth) / 100) * 0.38;
    if (warmth > 0) {
      // Warm amber / orange golden hour tone
      ctx.fillStyle = `rgba(255, 145, 0, ${opacity.toFixed(3)})`;
    } else {
      // Cool cobalt / cyan cinematic blue tone
      ctx.fillStyle = `rgba(0, 140, 255, ${opacity.toFixed(3)})`;
    }
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Apply Lens Vignette
  function applyVignette(ctx, vignettePercent, w, h) {
    if (vignettePercent <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";

    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.sqrt(cx * cx + cy * cy);
    const intensity = (vignettePercent / 100);

    const grad = ctx.createRadialGradient(cx, cy, maxR * 0.4, cx, cy, maxR);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(0.65, `rgba(0, 0, 0, ${(intensity * 0.35).toFixed(3)})`);
    grad.addColorStop(0.9, `rgba(0, 0, 0, ${(intensity * 0.75).toFixed(3)})`);
    grad.addColorStop(1, `rgba(0, 0, 0, ${intensity.toFixed(3)})`);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Apply 35mm Film Grain using Cached Pattern
  function applyGrain(ctx, grainPercent, w, h) {
    if (grainPercent <= 0 || !grainPattern) return;
    ctx.save();
    ctx.globalAlpha = (grainPercent / 100) * 0.28;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = grainPattern;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }

  // Draw Movie Letterbox Bars
  function applyMovieBars(ctx, isEnabled, thicknessPercent, w, h) {
    if (!isEnabled || thicknessPercent <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "#000000";

    const barHeight = Math.round(h * (thicknessPercent / 100));
    // Top Bar
    ctx.fillRect(0, 0, w, barHeight);
    // Bottom Bar
    ctx.fillRect(0, h - barHeight, w, barHeight);

    ctx.restore();
  }

  // Main Render Pipeline
  function render() {
    if (!loadedImage || !mainCanvas) return;
    const ctx = mainCanvas.getContext("2d");
    const w = loadedImage.width;
    const h = loadedImage.height;

    // Read current controls
    const preset = FILTER_PRESETS[activeFilterIndex] || FILTER_PRESETS[0];
    const exposureVal = parseFloat(sliderExposure.value);
    const warmthVal = parseFloat(sliderWarmth.value);
    const contrastVal = parseFloat(sliderContrast.value);
    const saturationVal = parseFloat(sliderSaturation.value);
    const vignetteVal = parseFloat(sliderVignette.value);
    const grainVal = parseFloat(sliderGrain.value);
    const barsEnabled = toggleBars.checked;
    const barThicknessVal = parseFloat(sliderBars.value);

    // 1. Draw base image with CSS filter
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.filter = buildCssFilterString(preset.css, exposureVal, warmthVal, contrastVal, saturationVal);
    ctx.drawImage(loadedImage, 0, 0, w, h);
    ctx.restore();

    // 2. Preset color grading overlay
    if (preset.tint) {
      applyPresetTint(ctx, preset.tint, w, h);
    }

    // 3. User color temperature / warmth
    applyWarmth(ctx, warmthVal, w, h);

    // 4. Lens optical vignette
    applyVignette(ctx, vignetteVal, w, h);

    // 5. Authentic 35mm film grain
    applyGrain(ctx, grainVal, w, h);

    // 6. Crisp movie letterbox bars
    applyMovieBars(ctx, barsEnabled, barThicknessVal, w, h);
  }

  // Debounced Render Loop via requestAnimationFrame
  function scheduleRender() {
    if (renderScheduled) return;
    renderScheduled = true;
    requestAnimationFrame(() => {
      render();
      renderScheduled = false;
    });
  }

  // Export Functions
  function exportImage(format) {
    if (!loadedImage || !mainCanvas) return;
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const ext = format === "jpeg" ? "jpg" : "png";
    const filename = `cinematic-screenshot-${Date.now()}.${ext}`;

    const link = document.createElement("a");
    link.download = filename;
    link.href = mainCanvas.toDataURL(mime, 0.95);
    link.click();
    showToast(`Downloaded ${ext.toUpperCase()}`);
  }

  function copyImageToClipboard() {
    if (!loadedImage || !mainCanvas) return;

    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      showToast("Clipboard copy not supported in this browser. Use Download instead.");
      return;
    }

    mainCanvas.toBlob((blob) => {
      if (!blob) {
        showToast("Failed to generate clipboard image");
        return;
      }
      try {
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]).then(() => {
          showToast("Cinematic image copied to clipboard");
        }).catch(() => {
          showToast("Clipboard write permission denied. Use Download instead.");
        });
      } catch (err) {
        showToast("Clipboard copy not supported. Use Download instead.");
      }
    }, "image/png");
  }

  // Copy Tool Link
  function copyToolLink() {
    const url = window.location.href;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => {
        showToast("Tool link copied to clipboard");
      }).catch(() => {
        fallbackCopyText(url);
      });
    } else {
      fallbackCopyText(url);
    }
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      document.execCommand("copy");
      showToast("Tool link copied to clipboard");
    } catch (e) {
      showToast("Failed to copy link");
    }
    document.body.removeChild(textarea);
  }

  // Toast Notification
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
    }, 2400);
  }

  // Initialize on DOM ready
  document.addEventListener("DOMContentLoaded", init);
})();
