/**
 * Quick Gamma - NORTHSTAR's tools
 * Utilitarian Screenshot Gamma & Overexposure Corrector
 * 100% Client-side HTML5 Canvas Engine
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
  const sharePageBtn = document.getElementById("share-page-btn");

  // Comparison Elements
  const comparisonContainer = document.getElementById("comparison-container");
  const processedCanvas = document.getElementById("processed-canvas");
  const originalCanvas = document.getElementById("original-canvas");
  const beforeOverlay = document.getElementById("before-overlay");
  const sliderDivider = document.getElementById("slider-divider");
  const sliderHandle = sliderDivider.querySelector(".slider-handle");

  // Split control buttons
  const splitBtn25 = document.getElementById("split-btn-25");
  const splitBtn50 = document.getElementById("split-btn-50");
  const splitBtn75 = document.getElementById("split-btn-75");
  const splitBtnToggle = document.getElementById("split-btn-toggle");

  // Metadata Elements
  const metaDims = document.getElementById("meta-dims");
  const metaLum = document.getElementById("meta-lum");

  // Slider Elements
  const sliderGamma = document.getElementById("slider-gamma");
  const valGamma = document.getElementById("val-gamma");

  const sliderExposure = document.getElementById("slider-exposure");
  const valExposure = document.getElementById("val-exposure");

  const sliderShadow = document.getElementById("slider-shadow");
  const valShadow = document.getElementById("val-shadow");

  const sliderContrast = document.getElementById("slider-contrast");
  const valContrast = document.getElementById("val-contrast");

  const sliderSaturation = document.getElementById("slider-saturation");
  const valSaturation = document.getElementById("val-saturation");

  const sliderHist = document.getElementById("slider-hist");
  const valHist = document.getElementById("val-hist");

  // Export Buttons
  const btnDownloadPng = document.getElementById("btn-download-png");
  const btnDownloadJpg = document.getElementById("btn-download-jpg");
  const btnCopyImg = document.getElementById("btn-copy-img");

  // Preset Buttons
  const presetButtons = document.querySelectorAll(".preset-btn");

  // State
  let loadedImage = null;
  let isDraggingSlider = false;
  let currentSplitRatio = 0.5;
  let savedSplitBeforeHold = 0.5;
  let isHoldingCompare = false;
  let renderRaf = null;

  // Preset Definitions
  const PRESETS = {
    deglare: {
      exposure: 85,
      gamma: 1.40,
      shadow: 0,
      contrast: 115,
      saturation: 105,
      hist: 15
    },
    linear: {
      exposure: 100,
      gamma: 1.00,
      shadow: 0,
      contrast: 100,
      saturation: 100,
      hist: 0
    },
    highcontrast: {
      exposure: 95,
      gamma: 1.20,
      shadow: 0,
      contrast: 135,
      saturation: 110,
      hist: 25
    },
    shadowreveal: {
      exposure: 110,
      gamma: 0.65,
      shadow: 40,
      contrast: 110,
      saturation: 105,
      hist: 20
    },
    brighten: {
      exposure: 160,
      gamma: 0.40,
      shadow: 60,
      contrast: 125,
      saturation: 120,
      hist: 40
    }
  };

  // Initialize
  function init() {
    setupEventListeners();
  }

  function setupEventListeners() {
    // File browse & drag-drop
    btnBrowse.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", handleFileSelect);
    btnSample.addEventListener("click", loadSampleImage);
    btnNewImage.addEventListener("click", clearImage);
    btnResetSliders.addEventListener("click", () => applyPresetValues("linear"));

    // Global Paste
    window.addEventListener("paste", handleGlobalPaste);

    // Drag and Drop
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragleave", handleDragLeave);
    window.addEventListener("drop", handleDrop);

    // Preset Buttons
    presetButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const presetKey = btn.dataset.preset;
        if (PRESETS[presetKey]) {
          applyPresetValues(presetKey);
          highlightPresetBtn(presetKey);
        }
      });
    });

    // Sliders
    const sliders = [
      sliderGamma,
      sliderExposure,
      sliderShadow,
      sliderContrast,
      sliderSaturation,
      sliderHist
    ];
    sliders.forEach(slider => {
      slider.addEventListener("input", () => {
        clearActivePresetHighlight();
        scheduleProcessing();
      });
    });

    // Comparison Split Buttons
    splitBtn25.addEventListener("click", () => setSplitPosition(0.25));
    splitBtn50.addEventListener("click", () => setSplitPosition(0.50));
    splitBtn75.addEventListener("click", () => setSplitPosition(0.75));

    // Hold to compare original
    splitBtnToggle.addEventListener("mousedown", startHoldCompare);
    window.addEventListener("mouseup", stopHoldCompare);
    splitBtnToggle.addEventListener("touchstart", (e) => {
      e.preventDefault();
      startHoldCompare();
    }, { passive: false });
    window.addEventListener("touchend", stopHoldCompare);

    // Interactive Slider Divider Dragging
    comparisonContainer.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    // Sync scaling on window resize
    window.addEventListener("resize", syncOverlayCanvasDimensions);

    // Exports
    btnDownloadPng.addEventListener("click", () => exportImage("png"));
    btnDownloadJpg.addEventListener("click", () => exportImage("jpeg"));
    btnCopyImg.addEventListener("click", copyImageToClipboard);

    // Share link
    if (sharePageBtn) {
      sharePageBtn.addEventListener("click", copyPageLink);
    }
  }

  // File Handling
  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      loadImageFromFile(e.target.files[0]);
    }
    // Reset input so same file can be reloaded if needed
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
          showToast("Screenshot loaded from clipboard");
          e.preventDefault();
          return;
        }
      }
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
    dropzonePanel.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    dropzonePanel.classList.remove("drag-over");
  }

  function handleDrop(e) {
    e.preventDefault();
    dropzonePanel.classList.remove("drag-over");
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        loadImageFromFile(file);
        showToast("Screenshot loaded from drop");
      } else {
        showToast("Please drop an image file (PNG, JPG, WebP)");
      }
    }
  }

  function loadImageFromFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        initImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  // Load Overexposed Sample Image
  function loadSampleImage() {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = 1280;
    tempCanvas.height = 720;
    const ctx = tempCanvas.getContext("2d");

    // Overexposed / Blown out sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, 480);
    skyGrad.addColorStop(0, "#ffffff");
    skyGrad.addColorStop(0.3, "#f4f9fd");
    skyGrad.addColorStop(0.7, "#d2e4f2");
    skyGrad.addColorStop(1, "#b5d4eb");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Blinding sun / bloom glare
    const sunGrad = ctx.createRadialGradient(920, 120, 10, 920, 120, 420);
    sunGrad.addColorStop(0, "rgba(255, 255, 255, 1.0)");
    sunGrad.addColorStop(0.4, "rgba(255, 255, 250, 0.85)");
    sunGrad.addColorStop(0.8, "rgba(255, 245, 220, 0.45)");
    sunGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 1280, 720);

    // Overexposed washed-out mountains
    ctx.fillStyle = "#cfd8dc";
    ctx.beginPath();
    ctx.moveTo(0, 480);
    ctx.lineTo(260, 240);
    ctx.lineTo(540, 420);
    ctx.lineTo(840, 190);
    ctx.lineTo(1100, 390);
    ctx.lineTo(1280, 260);
    ctx.lineTo(1280, 720);
    ctx.lineTo(0, 720);
    ctx.fill();

    // Foreground terrain
    ctx.fillStyle = "#b0bec5";
    ctx.beginPath();
    ctx.moveTo(0, 560);
    ctx.lineTo(340, 490);
    ctx.lineTo(760, 580);
    ctx.lineTo(1280, 510);
    ctx.lineTo(1280, 720);
    ctx.lineTo(0, 720);
    ctx.fill();

    // Washed out game UI elements and text (low contrast in glare)
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(40, 40, 420, 140);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(40, 40, 420, 140);

    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, monospace";
    ctx.fillStyle = "#78909c";
    ctx.fillText("SESSION DIAGNOSTICS [HDR CAPTURE: 800 NITS]", 60, 75);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#90a4ae";
    ctx.fillText("MISSION: INFILTRATE HIGH-EXPOSURE VALLEY", 60, 105);
    ctx.fillText("STATUS: ACTIVE // ELEVATION: 4,120M", 60, 130);
    ctx.fillText("NOTICE: GLARE LEVEL CRITICAL (GAMMA > 1.0 RECOMMENDED)", 60, 155);

    // Floating reticle and waypoint
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2;
    ctx.strokeRect(620, 340, 40, 40);
    ctx.beginPath();
    ctx.arc(640, 360, 6, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fill();

    ctx.font = "bold 13px monospace";
    ctx.fillStyle = "#607d8b";
    ctx.fillText("WAYPOINT ALPHA [450M]", 575, 410);

    const img = new Image();
    img.onload = () => {
      initImage(img);
      applyPresetValues("deglare");
      highlightPresetBtn("deglare");
      showToast("Loaded sample overexposed screenshot with Quick De-Glare");
    };
    img.src = tempCanvas.toDataURL("image/png");
  }

  // Initialize Loaded Image
  function initImage(img) {
    loadedImage = img;

    // Toggle panels
    dropzonePanel.classList.add("hidden");
    workbench.classList.remove("hidden");

    const w = img.width;
    const h = img.height;

    originalCanvas.width = w;
    originalCanvas.height = h;
    processedCanvas.width = w;
    processedCanvas.height = h;

    const origCtx = originalCanvas.getContext("2d");
    origCtx.drawImage(img, 0, 0);

    metaDims.textContent = `${w} × ${h} px`;

    // Apply default or current values
    scheduleProcessing();

    // Default to 50% split
    setSplitPosition(0.5);

    // Ensure sync overlay size
    setTimeout(syncOverlayCanvasDimensions, 50);
  }

  function clearImage() {
    loadedImage = null;
    workbench.classList.add("hidden");
    dropzonePanel.classList.remove("hidden");
    metaDims.textContent = "0 × 0 px";
    metaLum.textContent = "-- → --";
    showToast("Ready for new image");
  }

  // Preset Application
  function applyPresetValues(presetKey) {
    const config = PRESETS[presetKey];
    if (!config) return;

    sliderExposure.value = config.exposure;
    sliderGamma.value = config.gamma;
    sliderShadow.value = config.shadow;
    sliderContrast.value = config.contrast;
    sliderSaturation.value = config.saturation;
    sliderHist.value = config.hist;

    highlightPresetBtn(presetKey);
    scheduleProcessing();
  }

  function highlightPresetBtn(presetKey) {
    presetButtons.forEach(btn => {
      if (btn.dataset.preset === presetKey) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  function clearActivePresetHighlight() {
    presetButtons.forEach(btn => btn.classList.remove("active"));
  }

  // Processing Scheduler
  function scheduleProcessing() {
    if (renderRaf) cancelAnimationFrame(renderRaf);
    renderRaf = requestAnimationFrame(processImage);
  }

  // Core Fast Pixel Processing Engine
  function processImage() {
    if (!loadedImage) return;

    const exposureVal = parseFloat(sliderExposure.value);
    const gammaVal = parseFloat(sliderGamma.value);
    const shadowVal = parseFloat(sliderShadow.value);
    const contrastVal = parseFloat(sliderContrast.value);
    const saturationVal = parseFloat(sliderSaturation.value);
    const histVal = parseFloat(sliderHist.value);

    // Update Numerical Display Labels
    valExposure.textContent = `${Math.round(exposureVal)}%`;
    valGamma.textContent = gammaVal.toFixed(2);
    valShadow.textContent = `${Math.round(shadowVal)}%`;
    valContrast.textContent = `${Math.round(contrastVal)}%`;
    valSaturation.textContent = `${Math.round(saturationVal)}%`;
    valHist.textContent = `${Math.round(histVal)}%`;

    const w = loadedImage.width;
    const h = loadedImage.height;

    const origCtx = originalCanvas.getContext("2d");
    const imgData = origCtx.getImageData(0, 0, w, h);
    const data = imgData.data;

    const procCtx = processedCanvas.getContext("2d");
    const outImgData = procCtx.createImageData(w, h);
    const outData = outImgData.data;

    const exposure = exposureVal / 100;
    const gamma = gammaVal;
    const shadowBoost = shadowVal / 100;
    const contrast = contrastVal / 100;
    const saturation = saturationVal / 100;
    const histWeight = histVal / 100;

    const len = data.length;

    // Fast luminance analysis & sampling for dynamic range stretch
    let minL = 255;
    let maxL = 0;
    let totalLumBefore = 0;
    let totalLumAfter = 0;

    const sampleStep = len > 2000000 ? 16 : 4;
    for (let i = 0; i < len; i += sampleStep) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < minL) minL = lum;
      if (lum > maxL) maxL = lum;
    }
    if (maxL <= minL) maxL = minL + 1;

    // 256-value Lookup Tables (LUTs) for instantaneous transforms
    const lutR = new Uint8ClampedArray(256);
    const lutG = new Uint8ClampedArray(256);
    const lutB = new Uint8ClampedArray(256);

    for (let i = 0; i < 256; i++) {
      let v = i / 255.0;

      // 1. Dynamic Histogram stretch
      if (histWeight > 0) {
        let stretched = (i - minL) / (maxL - minL);
        stretched = Math.max(0, Math.min(1, stretched));
        v = v * (1 - histWeight) + stretched * histWeight;
      }

      // 2. Non-linear Shadow Lifter
      if (shadowBoost > 0) {
        const shadowFactor = Math.pow(1.0 - v, 2.0) * shadowBoost;
        v = v + shadowFactor * 0.8;
      }

      // 3. Gamma Correction Curve:
      // For overexposed / super bright screenshots: gamma > 1.0 (e.g. 1.40) pulls down
      // blown-out midtones and restores deep contrast.
      // For underexposed captures: gamma < 1.0 lifts shadows.
      if (gamma > 0 && gamma !== 1.0) {
        v = Math.pow(Math.max(0, v), gamma);
      }

      // 4. Exposure Multiplier
      v = v * exposure;

      // 5. Dynamic Contrast Adjustment around midpoint 0.5
      if (contrast !== 1.0) {
        v = (v - 0.5) * contrast + 0.5;
      }

      const finalVal = Math.max(0, Math.min(255, v * 255.0));
      lutR[i] = finalVal;
      lutG[i] = finalVal;
      lutB[i] = finalVal;
    }

    // Process Pixel Array
    for (let i = 0; i < len; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      let nr = lutR[r];
      let ng = lutG[g];
      let nb = lutB[b];

      // Vibrance / Saturation
      if (saturation !== 1.0) {
        const gray = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        nr = gray + (nr - gray) * saturation;
        ng = gray + (ng - gray) * saturation;
        nb = gray + (nb - gray) * saturation;
      }

      outData[i] = Math.max(0, Math.min(255, nr));
      outData[i + 1] = Math.max(0, Math.min(255, ng));
      outData[i + 2] = Math.max(0, Math.min(255, nb));
      outData[i + 3] = a;

      if (i % 64 === 0) {
        totalLumBefore += (0.299 * r + 0.587 * g + 0.114 * b);
        totalLumAfter += (0.299 * nr + 0.587 * ng + 0.114 * nb);
      }
    }

    procCtx.putImageData(outImgData, 0, 0);

    // Calculate Average Luminance Stats
    const sampleCount = len / 64;
    const avgBefore = Math.round((totalLumBefore / sampleCount) / 255 * 100);
    const avgAfter = Math.round((totalLumAfter / sampleCount) / 255 * 100);
    metaLum.innerHTML = `${avgBefore}% &rarr; <strong>${avgAfter}%</strong>`;

    syncOverlayCanvasDimensions();
  }

  // Synchronize overlay canvas with rendered base canvas
  function syncOverlayCanvasDimensions() {
    if (!loadedImage) return;
    const rect = processedCanvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      originalCanvas.style.width = `${rect.width}px`;
      originalCanvas.style.height = `${rect.height}px`;
    }
  }

  // Split View Slider Controls
  function setSplitPosition(ratio) {
    currentSplitRatio = Math.max(0, Math.min(1, ratio));
    const percentage = currentSplitRatio * 100;
    beforeOverlay.style.width = `${percentage}%`;
    sliderDivider.style.left = `${percentage}%`;

    // Update split button active states
    [splitBtn25, splitBtn50, splitBtn75].forEach(btn => btn.classList.remove("active"));
    if (Math.abs(ratio - 0.25) < 0.02) splitBtn25.classList.add("active");
    else if (Math.abs(ratio - 0.50) < 0.02) splitBtn50.classList.add("active");
    else if (Math.abs(ratio - 0.75) < 0.02) splitBtn75.classList.add("active");

    syncOverlayCanvasDimensions();
  }

  function onPointerDown(e) {
    isDraggingSlider = true;
    updateSplitFromPointer(e);
  }

  function onPointerMove(e) {
    if (!isDraggingSlider) return;
    updateSplitFromPointer(e);
  }

  function onPointerUp() {
    isDraggingSlider = false;
  }

  function updateSplitFromPointer(e) {
    const rect = comparisonContainer.getBoundingClientRect();
    if (rect.width === 0) return;
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const offset = clientX - rect.left;
    const ratio = offset / rect.width;
    setSplitPosition(ratio);
  }

  // Hold to Compare Original Action
  function startHoldCompare() {
    if (!loadedImage || isHoldingCompare) return;
    isHoldingCompare = true;
    savedSplitBeforeHold = currentSplitRatio;
    setSplitPosition(1.0); // Show 100% original
    splitBtnToggle.classList.add("active");
  }

  function stopHoldCompare() {
    if (!isHoldingCompare) return;
    isHoldingCompare = false;
    setSplitPosition(savedSplitBeforeHold);
    splitBtnToggle.classList.remove("active");
  }

  // Export Functions
  function exportImage(format) {
    if (!processedCanvas || !loadedImage) return;
    const mime = format === "jpeg" ? "image/jpeg" : "image/png";
    const ext = format === "jpeg" ? "jpg" : "png";
    const filename = `quick-gamma-${Date.now()}.${ext}`;

    const link = document.createElement("a");
    link.download = filename;
    link.href = processedCanvas.toDataURL(mime, 0.95);
    link.click();
    showToast(`Downloaded ${ext.toUpperCase()}`);
  }

  function copyImageToClipboard() {
    if (!processedCanvas || !loadedImage) return;

    if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
      showToast("Clipboard copy not supported in this browser. Use Download instead.");
      return;
    }

    processedCanvas.toBlob((blob) => {
      if (!blob) {
        showToast("Failed to generate clipboard image");
        return;
      }
      try {
        const item = new ClipboardItem({ "image/png": blob });
        navigator.clipboard.write([item]).then(() => {
          showToast("Image copied to clipboard");
        }).catch(() => {
          showToast("Clipboard write permission denied. Use Download instead.");
        });
      } catch (err) {
        showToast("Clipboard copy not supported. Use Download instead.");
      }
    }, "image/png");
  }

  // Share Page Link
  function copyPageLink() {
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

  // Run on DOM ready
  document.addEventListener("DOMContentLoaded", init);
})();
