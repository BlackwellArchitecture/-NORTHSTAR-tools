/**
 * NORTHSTAR's tools - Yt-dlp Made Easy
 * Easy, auto-sanitized CLI generator for yt-dlp across Terminal, CMD, PowerShell, and Fish.
 */

document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------------------------------
  // DOM Elements
  // ----------------------------------------------------
  const commandCodeEl = document.getElementById("command-code");
  const copyCmdBtn = document.getElementById("copy-cmd-btn");
  const copyBtnText = document.getElementById("copy-btn-text");
  const toggleMultilineBtn = document.getElementById("toggle-multiline-btn");
  const resetAllBtn = document.getElementById("reset-all-btn");
  const shellTabs = document.querySelectorAll(".shell-tab");
  const sanitizationStatusEl = document.getElementById("sanitization-status");
  const statusIndicatorEl = sanitizationStatusEl ? sanitizationStatusEl.querySelector(".status-indicator") : null;
  const statusTextEl = document.getElementById("status-text");
  const sanitizationAlertEl = document.getElementById("sanitization-alert");
  const sanitizationAlertMsg = document.getElementById("sanitization-alert-msg");
  
  // URL & tracking elements
  const videoUrlInput = document.getElementById("video-url-input");
  const pasteUrlBtn = document.getElementById("paste-url-btn");
  const clearUrlBtn = document.getElementById("clear-url-btn");
  const cleanTrackingCheckbox = document.getElementById("clean-tracking-checkbox");
  const urlFeedbackEl = document.getElementById("url-feedback");
  const presetPills = document.querySelectorAll(".preset-pill");

  // Basic settings elements
  const downloadModeSelect = document.getElementById("download-mode-select");
  const resolutionSelect = document.getElementById("resolution-select");
  const containerSelect = document.getElementById("container-select");
  const groupVideoResolution = document.getElementById("group-video-resolution");
  const groupVideoContainer = document.getElementById("group-video-container");
  const groupAudioSettings = document.getElementById("group-audio-settings");
  const audioFormatSelect = document.getElementById("audio-format-select");
  const audioQualitySelect = document.getElementById("audio-quality-select");
  const outputTemplatePreset = document.getElementById("output-template-preset");
  const customTemplateGroup = document.getElementById("custom-template-group");
  const customTemplateInput = document.getElementById("custom-template-input");
  const outputFolderInput = document.getElementById("output-folder-input");
  const varTags = document.querySelectorAll(".var-tag");

  // Media options elements
  const embedSubsCheckbox = document.getElementById("embed-subs-checkbox");
  const autoSubsCheckbox = document.getElementById("auto-subs-checkbox");
  const subtitleConfigRow = document.getElementById("subtitle-config-row");
  const subLangInput = document.getElementById("sub-lang-input");
  const subFormatSelect = document.getElementById("sub-format-select");
  const embedThumbnailCheckbox = document.getElementById("embed-thumbnail-checkbox");
  const embedMetadataCheckbox = document.getElementById("embed-metadata-checkbox");
  const noPlaylistCheckbox = document.getElementById("no-playlist-checkbox");
  const playlistConfigRow = document.getElementById("playlist-config-row");
  const playlistStartInput = document.getElementById("playlist-start-input");
  const playlistEndInput = document.getElementById("playlist-end-input");
  const playlistItemsInput = document.getElementById("playlist-items-input");
  const writeDescriptionCheckbox = document.getElementById("write-description-checkbox");

  // Technical options elements
  const techAccordionBtn = document.getElementById("tech-accordion-btn");
  const techAccordionArrow = document.getElementById("tech-accordion-arrow");
  const techAccordionContent = document.getElementById("tech-accordion-content");
  const sponsorblockSelect = document.getElementById("sponsorblock-select");
  const downloadSectionInput = document.getElementById("download-section-input");
  const concurrentFragmentsSelect = document.getElementById("concurrent-fragments-select");
  const rateLimitInput = document.getElementById("rate-limit-input");
  const externalDownloaderSelect = document.getElementById("external-downloader-select");
  const videoCodecSelect = document.getElementById("video-codec-select");
  const geoBypassSelect = document.getElementById("geo-bypass-select");
  const cookiesBrowserSelect = document.getElementById("cookies-browser-select");
  const cookiesFileGroup = document.getElementById("cookies-file-group");
  const cookiesFileInput = document.getElementById("cookies-file-input");
  const proxyInput = document.getElementById("proxy-input");
  const liveFromStartCheckbox = document.getElementById("live-from-start-checkbox");
  const continueCheckbox = document.getElementById("continue-checkbox");
  const customArgsInput = document.getElementById("custom-args-input");

  // Breakdown & Install elements
  const breakdownTbody = document.getElementById("breakdown-tbody");
  const sharePageBtn = document.getElementById("share-page-btn");
  const installCopyBtns = document.querySelectorAll(".install-copy-btn");

  // ----------------------------------------------------
  // App State
  // ----------------------------------------------------
  let activeShell = "bash"; // 'bash' | 'cmd' | 'powershell' | 'fish'
  let isMultiline = false;
  let activePreset = "best-video";

  // ----------------------------------------------------
  // Auto-Sanitization Engine
  // ----------------------------------------------------
  const Sanitizer = {
    /**
     * Sanitizes and cleans a YouTube / media URL.
     * Strips dangerous shell injection tokens, newlines, and optionally tracking parameters.
     */
    cleanUrl(rawUrl, removeTracking = true) {
      if (!rawUrl) return { url: "", sanitized: false, notes: [] };

      const notes = [];
      let cleaned = rawUrl.trim();

      // Check for dangerous control chars or newlines
      if (/[\r\n\0]/.test(cleaned)) {
        cleaned = cleaned.replace(/[\r\n\0]+/g, "");
        notes.push("Removed line breaks/control characters from URL");
      }

      // Strip unquoted shell command delimiters from URL input
      if (/[;&|`$<>]/.test(cleaned)) {
        cleaned = cleaned.replace(/[;&|`$<>]+/g, "");
        notes.push("Removed shell delimiters/symbols from URL");
      }

      // Check for tracking parameters
      if (removeTracking && (cleaned.includes("http://") || cleaned.includes("https://"))) {
        try {
          // If user pasted without protocol, help URL parser
          const parseable = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
          const urlObj = new URL(parseable);
          const trackingParams = ["si", "feature", "pp", "fbclid", "igshid", "gclid", "ref"];
          let strippedAny = false;

          trackingParams.forEach(param => {
            if (urlObj.searchParams.has(param)) {
              urlObj.searchParams.delete(param);
              strippedAny = true;
            }
          });

          if (strippedAny) {
            cleaned = urlObj.toString();
            notes.push("Stripped tracking parameters (si, feature, etc.)");
          }
        } catch {
          // Fallback regex tracking removal if URL parsing fails
          const beforeRegex = cleaned;
          cleaned = cleaned
            .replace(/([?&])(si|feature|pp|fbclid|igshid)=[^&]*/gi, "$1")
            .replace(/[?&]$/, "")
            .replace(/\?&/, "?");
          if (beforeRegex !== cleaned) {
            notes.push("Stripped tracking parameters via regex");
          }
        }
      }

      return {
        url: cleaned,
        sanitized: notes.length > 0,
        notes
      };
    },

    /**
     * Safely quotes and escapes an argument value for the target shell.
     */
    escapeForShell(val, shell) {
      if (val === undefined || val === null) return "";
      const str = String(val);

      // Check if value needs quoting (contains spaces or special shell characters)
      const needsQuotes = /[ \t"'`$&|;<>*?()~[\]!%#^]/.test(str) || str === "";
      if (!needsQuotes) {
        return str;
      }

      switch (shell) {
        case "cmd":
          // Windows CMD does NOT recognize single quotes as arguments!
          // Wrap in double quotes, escape double quotes as \" or ""
          return `"${str.replace(/"/g, '""')}"`;

        case "powershell":
          // PowerShell literal strings in single quotes prevent variable expansion ($) and command parsing (&)
          return `'${str.replace(/'/g, "''")}'`;

        case "fish":
          // Fish shell single quotes
          return `'${str.replace(/'/g, "\\'")}'`;

        case "termux":
        case "bash":
        default:
          // POSIX Bash / Zsh / sh / Termux: single quotes are the safest literal container
          // Replace each ' with '\''
          return `'${str.replace(/'/g, "'\\''")}'`;
      }
    },

    /**
     * Sanitizes a path or filename template.
     */
    cleanPath(pathStr) {
      if (!pathStr) return "";
      // Strip control chars and unescaped quotes that break CLI syntax
      return pathStr.replace(/[\r\n\0]+/g, "").trim();
    },

    /**
     * Sanitizes raw custom arguments.
     */
    cleanCustomArgs(argsStr) {
      if (!argsStr) return { args: "", sanitized: false, notes: [] };
      const notes = [];
      let cleaned = argsStr.replace(/[\r\n\0]+/g, " ").trim();

      // Check for obvious shell breakout attempts (e.g. `; rm -rf`, `&&`, `||`)
      if (/(&&|\|\||;|>|<|`|\$\()/.test(cleaned)) {
        notes.push("Warning: Filtered shell chaining tokens from custom arguments");
        cleaned = cleaned.replace(/(&&|\|\||;|>|<|`|\$\([^)]*\))/g, "");
      }

      return {
        args: cleaned,
        sanitized: notes.length > 0,
        notes
      };
    }
  };

  // ----------------------------------------------------
  // Command Builder Logic
  // ----------------------------------------------------
  function generateCommand() {
    const rawUrl = videoUrlInput.value.trim();
    const shouldCleanTracking = cleanTrackingCheckbox.checked;
    const urlResult = Sanitizer.cleanUrl(rawUrl, shouldCleanTracking);
    const sanitizedUrl = urlResult.url;

    // Track all sanitization events for reporting
    let totalSanitizedNotes = [...urlResult.notes];

    // Validate URL for UI feedback
    validateUrlDisplay(sanitizedUrl);

    // Build list of CLI arguments: { flag, val, desc }
    const args = [];
    const breakdown = [];

    // Base executable
    breakdown.push({
      flag: "yt-dlp",
      desc: "The core command-line media downloader tool."
    });

    const mode = downloadModeSelect.value;
    const res = resolutionSelect.value;
    const container = containerSelect.value;
    const codec = videoCodecSelect.value;

    // 1. Format Selection (-f) & Media Containers
    if (mode === "both") {
      // Build format selector
      let formatSelector = "";

      if (codec === "h264") {
        if (res === "best") {
          formatSelector = "bestvideo[vcodec^=avc1]+bestaudio/best[vcodec^=avc1]/best";
        } else {
          formatSelector = `bestvideo[vcodec^=avc1][height<=?${res}]+bestaudio/best[vcodec^=avc1][height<=?${res}]/best`;
        }
        breakdown.push({
          flag: "-f",
          desc: `Selects highest quality H.264/AVC video up to ${res === 'best' ? 'max' : res + 'p'} for maximum device and video editor compatibility.`
        });
      } else if (codec === "av1") {
        if (res === "best") {
          formatSelector = "bestvideo[vcodec^=av01]+bestaudio/best";
        } else {
          formatSelector = `bestvideo[vcodec^=av01][height<=?${res}]+bestaudio/best`;
        }
        breakdown.push({
          flag: "-f",
          desc: `Prioritizes cutting-edge AV1 video codec streams up to ${res === 'best' ? 'max' : res + 'p'}.`
        });
      } else if (codec === "vp9") {
        if (res === "best") {
          formatSelector = "bestvideo[vcodec^=vp9]+bestaudio/best";
        } else {
          formatSelector = `bestvideo[vcodec^=vp9][height<=?${res}]+bestaudio/best`;
        }
        breakdown.push({
          flag: "-f",
          desc: `Prioritizes VP9 video streams up to ${res === 'best' ? 'max' : res + 'p'}.`
        });
      } else {
        // Auto / Default quality
        if (res !== "best") {
          formatSelector = `bestvideo*[height<=?${res}]+bestaudio/best[height<=?${res}]`;
          breakdown.push({
            flag: "-f",
            desc: `Downloads best video stream capped at ${res}p resolution, plus best available audio track.`
          });
        }
      }

      if (formatSelector) {
        args.push({ flag: "-f", val: formatSelector });
      }

      // Container merging
      if (container !== "auto") {
        args.push({ flag: "--merge-output-format", val: container });
        breakdown.push({
          flag: "--merge-output-format",
          desc: `Merges the downloaded separate video and audio streams into an ${container.toUpperCase()} container file using FFmpeg.`
        });
      }
    } else if (mode === "audio") {
      // Audio extraction mode
      args.push({ flag: "-x", val: null });
      breakdown.push({
        flag: "-x / --extract-audio",
        desc: "Extracts audio from video and discards video stream."
      });

      const audioFmt = audioFormatSelect.value;
      if (audioFmt !== "best") {
        args.push({ flag: "--audio-format", val: audioFmt });
        breakdown.push({
          flag: "--audio-format",
          desc: `Converts extracted audio track to ${audioFmt.toUpperCase()} format.`
        });
      }

      const audioQual = audioQualitySelect.value;
      if (audioQual !== "best") {
        args.push({ flag: "--audio-quality", val: audioQual });
        breakdown.push({
          flag: "--audio-quality",
          desc: `Sets audio conversion quality/bitrate to ${audioQual}.`
        });
      }
    } else if (mode === "video-only") {
      // Video only (mute)
      if (res !== "best") {
        args.push({ flag: "-f", val: `bestvideo*[height<=?${res}]` });
      } else {
        args.push({ flag: "-f", val: "bestvideo*" });
      }
      breakdown.push({
        flag: "-f bestvideo*",
        desc: "Downloads video stream only (no audio track)."
      });

      if (container !== "auto") {
        args.push({ flag: "--merge-output-format", val: container });
      }
    }

    // 2. Output Path & Filename Template (-o)
    let templatePattern = "%(title)s [%(id)s].%(ext)s";
    const preset = outputTemplatePreset.value;

    if (preset === "title-only") {
      templatePattern = "%(title)s.%(ext)s";
    } else if (preset === "channel-title") {
      templatePattern = "%(uploader)s - %(title)s.%(ext)s";
    } else if (preset === "date-title") {
      templatePattern = "%(upload_date>%Y-%m-%d)s - %(title)s.%(ext)s";
    } else if (preset === "playlist-indexed") {
      templatePattern = "%(playlist_index)02d - %(title)s.%(ext)s";
    } else if (preset === "custom") {
      const customVal = customTemplateInput.value.trim();
      if (customVal) {
        templatePattern = Sanitizer.cleanPath(customVal);
      }
    }

    const folderVal = outputFolderInput.value.trim();
    let fullOutputTemplate = templatePattern;

    if (folderVal) {
      const cleanFolder = Sanitizer.cleanPath(folderVal).replace(/[\\/]+$/, "");
      fullOutputTemplate = `${cleanFolder}/${templatePattern}`;
    }

    // Only add -o if custom folder or non-default template
    if (preset !== "title-id" || folderVal) {
      args.push({ flag: "-o", val: fullOutputTemplate });
      breakdown.push({
        flag: "-o",
        desc: `Custom output template: saves as ${fullOutputTemplate}.`
      });
    }

    // 3. Subtitles
    if (embedSubsCheckbox.checked) {
      args.push({ flag: "--embed-subs", val: null });
      breakdown.push({
        flag: "--embed-subs",
        desc: "Multiplexes subtitles into the video file container."
      });

      if (autoSubsCheckbox.checked) {
        args.push({ flag: "--write-auto-subs", val: null });
        breakdown.push({
          flag: "--write-auto-subs",
          desc: "Downloads YouTube's automatic machine-generated captions if human subs are absent."
        });
      }

      const subLangs = subLangInput.value.trim();
      if (subLangs) {
        args.push({ flag: "--sub-langs", val: subLangs });
        breakdown.push({
          flag: "--sub-langs",
          desc: `Fetches subtitles matching language code pattern '${subLangs}'.`
        });
      }

      const subFmt = subFormatSelect.value;
      if (subFmt !== "best") {
        args.push({ flag: "--convert-subs", val: subFmt });
        breakdown.push({
          flag: "--convert-subs",
          desc: `Converts downloaded subtitle files into ${subFmt.toUpperCase()} format.`
        });
      }
    } else if (autoSubsCheckbox.checked) {
      args.push({ flag: "--write-auto-subs", val: null });
      breakdown.push({
        flag: "--write-auto-subs",
        desc: "Downloads YouTube's automatic machine-generated captions."
      });
    }

    // 4. Metadata & Thumbnails
    if (embedMetadataCheckbox.checked) {
      args.push({ flag: "--embed-metadata", val: null });
      breakdown.push({
        flag: "--embed-metadata",
        desc: "Writes video title, channel, date, description, and chapter markers into media container tags."
      });
    }

    if (embedThumbnailCheckbox.checked) {
      args.push({ flag: "--embed-thumbnail", val: null });
      breakdown.push({
        flag: "--embed-thumbnail",
        desc: "Embeds YouTube video thumbnail into the audio/video file as cover artwork."
      });
    }

    if (writeDescriptionCheckbox.checked) {
      args.push({ flag: "--write-description", val: null });
      breakdown.push({
        flag: "--write-description",
        desc: "Saves video description to a separate text file."
      });
    }

    // 5. Playlist Handling
    if (noPlaylistCheckbox.checked) {
      args.push({ flag: "--no-playlist", val: null });
      breakdown.push({
        flag: "--no-playlist",
        desc: "Downloads only the single video even if the link is part of a playlist."
      });
    } else {
      // Playlist enabled
      const pStart = playlistStartInput.value.trim();
      const pEnd = playlistEndInput.value.trim();
      const pItems = playlistItemsInput.value.trim();

      if (pItems) {
        args.push({ flag: "--playlist-items", val: pItems });
        breakdown.push({
          flag: "--playlist-items",
          desc: `Downloads only playlist indices matching: ${pItems}.`
        });
      } else {
        if (pStart) {
          args.push({ flag: "--playlist-start", val: pStart });
          breakdown.push({
            flag: "--playlist-start",
            desc: `Begins playlist download at item #${pStart}.`
          });
        }
        if (pEnd) {
          args.push({ flag: "--playlist-end", val: pEnd });
          breakdown.push({
            flag: "--playlist-end",
            desc: `Stops playlist download after item #${pEnd}.`
          });
        }
      }
    }

    // 6. SponsorBlock & Clips
    const sponsorChoice = sponsorblockSelect.value;
    if (sponsorChoice === "remove-sponsor") {
      args.push({ flag: "--sponsorblock-remove", val: "sponsor" });
      breakdown.push({
        flag: "--sponsorblock-remove sponsor",
        desc: "Cuts out sponsor segments automatically using SponsorBlock."
      });
    } else if (sponsorChoice === "remove-all") {
      args.push({ flag: "--sponsorblock-remove", val: "sponsor,intro,outro,selfpromo,preview" });
      breakdown.push({
        flag: "--sponsorblock-remove",
        desc: "Removes sponsors, intros, outros, self-promotion, and preview clips."
      });
    } else if (sponsorChoice === "mark-chapters") {
      args.push({ flag: "--sponsorblock-mark", val: "all" });
      breakdown.push({
        flag: "--sponsorblock-mark all",
        desc: "Creates chapter markers for sponsored segments instead of cutting video."
      });
    }

    const downloadSection = downloadSectionInput.value.trim();
    if (downloadSection) {
      const cleanSection = Sanitizer.cleanPath(downloadSection);
      args.push({ flag: "--download-sections", val: cleanSection });
      breakdown.push({
        flag: "--download-sections",
        desc: `Downloads only the time range: ${cleanSection}.`
      });
    }

    // 7. Performance & Speed
    const concurrentFrag = concurrentFragmentsSelect.value;
    if (concurrentFrag && concurrentFrag !== "1") {
      args.push({ flag: "--concurrent-fragments", val: concurrentFrag });
      breakdown.push({
        flag: "--concurrent-fragments",
        desc: `Downloads ${concurrentFrag} stream chunks concurrently for faster speeds.`
      });
    }

    const rateLimit = rateLimitInput.value.trim();
    if (rateLimit) {
      const cleanRate = Sanitizer.cleanPath(rateLimit);
      args.push({ flag: "--limit-rate", val: cleanRate });
      breakdown.push({
        flag: "--limit-rate",
        desc: `Caps download rate to ${cleanRate}.`
      });
    }

    const extDownloader = externalDownloaderSelect.value;
    if (extDownloader === "aria2c") {
      args.push({ flag: "--downloader", val: "aria2c" });
      args.push({ flag: "--downloader-args", val: "aria2c:-x 16 -s 16 -k 1M" });
      breakdown.push({
        flag: "--downloader aria2c",
        desc: "Accelerates downloads with aria2c multi-connection engine (16 threads)."
      });
    }

    const geoBypass = geoBypassSelect.value;
    if (geoBypass !== "none") {
      args.push({ flag: "--geo-bypass-country", val: geoBypass });
      breakdown.push({
        flag: "--geo-bypass-country",
        desc: `Simulates requests from country code '${geoBypass}'.`
      });
    }

    // 8. Cookies & Authentication
    const cookieSource = cookiesBrowserSelect.value;
    if (cookieSource === "custom-file") {
      const cookieFile = cookiesFileInput.value.trim();
      if (cookieFile) {
        const cleanFile = Sanitizer.cleanPath(cookieFile);
        args.push({ flag: "--cookies", val: cleanFile });
        breakdown.push({
          flag: "--cookies",
          desc: `Loads Netscape formatted cookie file from: ${cleanFile}.`
        });
      }
    } else if (cookieSource !== "none") {
      args.push({ flag: "--cookies-from-browser", val: cookieSource });
      breakdown.push({
        flag: "--cookies-from-browser",
        desc: `Extracts session cookies from ${cookieSource} to bypass age-gates & bot blocks.`
      });
    }

    const proxyVal = proxyInput.value.trim();
    if (proxyVal) {
      const cleanProxy = Sanitizer.cleanPath(proxyVal);
      args.push({ flag: "--proxy", val: cleanProxy });
      breakdown.push({
        flag: "--proxy",
        desc: `Routes network connections through proxy: ${cleanProxy}.`
      });
    }

    // 9. Livestream & Resume Flags
    if (liveFromStartCheckbox.checked) {
      args.push({ flag: "--live-from-start", val: null });
      breakdown.push({
        flag: "--live-from-start",
        desc: "Downloads an ongoing live stream from its beginning."
      });
    }

    if (continueCheckbox.checked) {
      args.push({ flag: "-c", val: null });
      breakdown.push({
        flag: "-c / --continue",
        desc: "Resumes partially downloaded files instead of restarting from 0%."
      });
    }

    // 10. Custom Extra Arguments (with auto-sanitization)
    const customArgsVal = customArgsInput.value.trim();
    if (customArgsVal) {
      const customResult = Sanitizer.cleanCustomArgs(customArgsVal);
      if (customResult.notes.length > 0) {
        totalSanitizedNotes.push(...customResult.notes);
      }
      if (customResult.args) {
        args.push({ flag: customResult.args, val: null, isRaw: true });
        breakdown.push({
          flag: customResult.args,
          desc: "Custom user-supplied argument(s)."
        });
      }
    }

    // 11. Format final command for the active shell
    const formattedCommand = assembleShellCommand(args, sanitizedUrl, activeShell, isMultiline);

    // Update command preview DOM
    renderCommandDisplay(formattedCommand, args, sanitizedUrl);

    // Update sanitization status indicator
    renderSanitizationState(totalSanitizedNotes);

    // Update breakdown table
    renderBreakdownTable(breakdown);
  }

  /**
   * Assembles the CLI tokens into the final shell command string.
   */
  function assembleShellCommand(argsList, url, shell, multiline) {
    const tokens = ["yt-dlp"];

    argsList.forEach(item => {
      if (item.isRaw) {
        tokens.push(item.flag);
      } else if (item.val === null || item.val === undefined) {
        tokens.push(item.flag);
      } else {
        const escapedVal = Sanitizer.escapeForShell(item.val, shell);
        tokens.push(`${item.flag} ${escapedVal}`);
      }
    });

    // Add target URL (always safely quoted to prevent shell breakage with & ? = etc.)
    if (url) {
      let escapedUrl = "";
      if (shell === "cmd") {
        escapedUrl = `"${url.replace(/"/g, '""')}"`;
      } else if (shell === "powershell") {
        escapedUrl = `'${url.replace(/'/g, "''")}'`;
      } else if (shell === "fish") {
        escapedUrl = `'${url.replace(/'/g, "\\'")}'`;
      } else {
        // bash / zsh / termux
        escapedUrl = `'${url.replace(/'/g, "'\\''")}'`;
      }
      tokens.push(escapedUrl);
    }

    if (!multiline) {
      return tokens.join(" ");
    }

    // Multiline continuation delimiters:
    // Bash / Fish / Termux: \
    // Windows CMD: ^
    // PowerShell: `
    let continuation = " \\";
    if (shell === "cmd") continuation = " ^";
    if (shell === "powershell") continuation = " `";

    return tokens.join(`${continuation}\n  `);
  }

  /**
   * Renders syntax-highlighted command output in the pre/code block.
   */
  function renderCommandDisplay(cmdString, argsList, url) {
    // Escape HTML entities to prevent any injection into DOM
    commandCodeEl.textContent = cmdString;
  }

  /**
   * Renders the sanitization badge & alert notice.
   */
  function renderSanitizationState(notes) {
    if (notes.length > 0) {
      if (statusIndicatorEl) {
        statusIndicatorEl.className = "status-indicator sanitized";
      }
      if (statusTextEl) {
        statusTextEl.textContent = `Auto-Sanitized (${notes.length})`;
      }
      if (sanitizationAlertEl && sanitizationAlertMsg) {
        sanitizationAlertEl.style.display = "flex";
        sanitizationAlertMsg.textContent = `Auto-sanitized: ${notes.join("; ")}.`;
      }
    } else {
      if (statusIndicatorEl) {
        statusIndicatorEl.className = "status-indicator clean";
      }
      if (statusTextEl) {
        statusTextEl.textContent = "Clean & Safe";
      }
      if (sanitizationAlertEl) {
        sanitizationAlertEl.style.display = "none";
      }
    }
  }

  /**
   * Validates the URL input and updates UI hint.
   */
  function validateUrlDisplay(url) {
    if (!url) {
      urlFeedbackEl.textContent = "No URL entered (yt-dlp will prompt or require target)";
      urlFeedbackEl.className = "field-feedback warning";
      return;
    }

    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
    const isPlaylist = /[?&]list=/i.test(url);

    if (isYouTube) {
      if (isPlaylist) {
        urlFeedbackEl.textContent = "YouTube Playlist detected";
        urlFeedbackEl.className = "field-feedback";
      } else {
        urlFeedbackEl.textContent = "Valid YouTube URL detected";
        urlFeedbackEl.className = "field-feedback";
      }
    } else if (/^https?:\/\//i.test(url)) {
      urlFeedbackEl.textContent = "Valid media URL (yt-dlp supports 1000+ sites)";
      urlFeedbackEl.className = "field-feedback";
    } else {
      urlFeedbackEl.textContent = "Custom target / text";
      urlFeedbackEl.className = "field-feedback warning";
    }
  }

  /**
   * Populates the argument breakdown table.
   */
  function renderBreakdownTable(items) {
    if (!breakdownTbody) return;

    if (items.length === 0) {
      breakdownTbody.innerHTML = `<tr><td colspan="2" style="color: var(--text-muted); text-align: center;">No flags active.</td></tr>`;
      return;
    }

    breakdownTbody.innerHTML = items.map(item => {
      return `
        <tr>
          <td><code>${escapeHtml(item.flag)}</code></td>
          <td>${escapeHtml(item.desc)}</td>
        </tr>
      `;
    }).join("");
  }

  // ----------------------------------------------------
  // Preset Handlers
  // ----------------------------------------------------
  function applyPreset(presetKey) {
    activePreset = presetKey;

    presetPills.forEach(pill => {
      if (pill.dataset.preset === presetKey) {
        pill.classList.add("active");
      } else {
        pill.classList.remove("active");
      }
    });

    switch (presetKey) {
      case "best-video":
        downloadModeSelect.value = "both";
        resolutionSelect.value = "best";
        containerSelect.value = "mp4";
        videoCodecSelect.value = "auto";
        embedMetadataCheckbox.checked = true;
        embedSubsCheckbox.checked = false;
        embedThumbnailCheckbox.checked = false;
        noPlaylistCheckbox.checked = true;
        break;

      case "1080p-mp4":
        downloadModeSelect.value = "both";
        resolutionSelect.value = "1080";
        containerSelect.value = "mp4";
        videoCodecSelect.value = "h264";
        embedMetadataCheckbox.checked = true;
        embedSubsCheckbox.checked = false;
        embedThumbnailCheckbox.checked = false;
        noPlaylistCheckbox.checked = true;
        break;

      case "720p-compact":
        downloadModeSelect.value = "both";
        resolutionSelect.value = "720";
        containerSelect.value = "mp4";
        videoCodecSelect.value = "auto";
        embedMetadataCheckbox.checked = true;
        embedSubsCheckbox.checked = false;
        embedThumbnailCheckbox.checked = false;
        noPlaylistCheckbox.checked = true;
        break;

      case "audio-mp3":
        downloadModeSelect.value = "audio";
        audioFormatSelect.value = "mp3";
        audioQualitySelect.value = "0";
        embedMetadataCheckbox.checked = true;
        embedThumbnailCheckbox.checked = true;
        embedSubsCheckbox.checked = false;
        noPlaylistCheckbox.checked = true;
        break;

      case "audio-m4a":
        downloadModeSelect.value = "audio";
        audioFormatSelect.value = "m4a";
        audioQualitySelect.value = "0";
        embedMetadataCheckbox.checked = true;
        embedThumbnailCheckbox.checked = true;
        embedSubsCheckbox.checked = false;
        noPlaylistCheckbox.checked = true;
        break;

      case "archive-full":
        downloadModeSelect.value = "both";
        resolutionSelect.value = "best";
        containerSelect.value = "mkv";
        embedMetadataCheckbox.checked = true;
        embedSubsCheckbox.checked = true;
        autoSubsCheckbox.checked = true;
        embedThumbnailCheckbox.checked = true;
        writeDescriptionCheckbox.checked = true;
        noPlaylistCheckbox.checked = false;
        break;
    }

    updateConditionalVisibility();
    generateCommand();
  }

  // ----------------------------------------------------
  // Dynamic UI Visibility Updates
  // ----------------------------------------------------
  function updateConditionalVisibility() {
    const mode = downloadModeSelect.value;

    if (mode === "audio") {
      groupVideoResolution.style.display = "none";
      groupVideoContainer.style.display = "none";
      groupAudioSettings.style.display = "grid";
    } else if (mode === "video-only") {
      groupVideoResolution.style.display = "block";
      groupVideoContainer.style.display = "block";
      groupAudioSettings.style.display = "none";
    } else {
      groupVideoResolution.style.display = "block";
      groupVideoContainer.style.display = "block";
      groupAudioSettings.style.display = "none";
    }

    // Custom filename template box
    if (outputTemplatePreset.value === "custom") {
      customTemplateGroup.style.display = "block";
    } else {
      customTemplateGroup.style.display = "none";
    }

    // Subtitle extra options
    if (embedSubsCheckbox.checked) {
      subtitleConfigRow.style.display = "grid";
    } else {
      subtitleConfigRow.style.display = "none";
    }

    // Playlist extra options
    if (!noPlaylistCheckbox.checked) {
      playlistConfigRow.style.display = "grid";
    } else {
      playlistConfigRow.style.display = "none";
    }

    // Cookies file input
    if (cookiesBrowserSelect.value === "custom-file") {
      cookiesFileGroup.style.display = "block";
    } else {
      cookiesFileGroup.style.display = "none";
    }
  }

  // ----------------------------------------------------
  // Event Listeners
  // ----------------------------------------------------

  // Shell switch tabs
  shellTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      shellTabs.forEach(t => {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      activeShell = tab.dataset.shell;
      generateCommand();
    });
  });

  // Multiline toggle
  toggleMultilineBtn.addEventListener("click", () => {
    isMultiline = !isMultiline;
    toggleMultilineBtn.textContent = `Multiline: ${isMultiline ? 'On' : 'Off'}`;
    generateCommand();
  });

  // Reset to defaults
  resetAllBtn.addEventListener("click", () => {
    applyPreset("best-video");
    outputTemplatePreset.value = "title-id";
    outputFolderInput.value = "";
    customArgsInput.value = "";
    rateLimitInput.value = "";
    sponsorblockSelect.value = "none";
    downloadSectionInput.value = "";
    concurrentFragmentsSelect.value = "4";
    externalDownloaderSelect.value = "none";
    geoBypassSelect.value = "none";
    cookiesBrowserSelect.value = "none";
    proxyInput.value = "";
    liveFromStartCheckbox.checked = false;
    continueCheckbox.checked = true;
    updateConditionalVisibility();
    generateCommand();
    showToast("Reset options to default");
  });

  // Preset pill clicks
  presetPills.forEach(pill => {
    pill.addEventListener("click", () => {
      applyPreset(pill.dataset.preset);
    });
  });

  // URL input events
  videoUrlInput.addEventListener("input", () => {
    // If user changes settings manually, deselect active preset pill
    generateCommand();
  });

  cleanTrackingCheckbox.addEventListener("change", () => {
    generateCommand();
  });

  // Paste from clipboard
  pasteUrlBtn.addEventListener("click", async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          videoUrlInput.value = text.trim();
          generateCommand();
          showToast("URL pasted from clipboard");
        }
      } else {
        videoUrlInput.focus();
        showToast("Use Ctrl+V / Cmd+V to paste");
      }
    } catch {
      videoUrlInput.focus();
      showToast("Clipboard access denied or unavailable");
    }
  });

  // Clear URL
  clearUrlBtn.addEventListener("click", () => {
    videoUrlInput.value = "";
    videoUrlInput.focus();
    generateCommand();
  });

  // Mode and form changes
  const autoRegenElements = [
    downloadModeSelect,
    resolutionSelect,
    containerSelect,
    audioFormatSelect,
    audioQualitySelect,
    outputTemplatePreset,
    customTemplateInput,
    outputFolderInput,
    embedSubsCheckbox,
    autoSubsCheckbox,
    subLangInput,
    subFormatSelect,
    embedThumbnailCheckbox,
    embedMetadataCheckbox,
    noPlaylistCheckbox,
    playlistStartInput,
    playlistEndInput,
    playlistItemsInput,
    writeDescriptionCheckbox,
    sponsorblockSelect,
    downloadSectionInput,
    concurrentFragmentsSelect,
    rateLimitInput,
    externalDownloaderSelect,
    videoCodecSelect,
    geoBypassSelect,
    cookiesBrowserSelect,
    cookiesFileInput,
    proxyInput,
    liveFromStartCheckbox,
    continueCheckbox,
    customArgsInput
  ];

  autoRegenElements.forEach(el => {
    if (!el) return;
    const evt = el.tagName === "SELECT" || el.type === "checkbox" ? "change" : "input";
    el.addEventListener(evt, () => {
      updateConditionalVisibility();
      generateCommand();
    });
  });

  // Custom template tag pills
  varTags.forEach(tag => {
    tag.addEventListener("click", () => {
      const variable = tag.dataset.var;
      customTemplateInput.value += variable;
      generateCommand();
    });
  });

  // Accordion toggle for Technical panel
  techAccordionBtn.addEventListener("click", () => {
    const isExpanded = techAccordionBtn.getAttribute("aria-expanded") === "true";
    techAccordionBtn.setAttribute("aria-expanded", String(!isExpanded));
    if (isExpanded) {
      techAccordionContent.style.display = "none";
      techAccordionArrow.textContent = "+";
    } else {
      techAccordionContent.style.display = "block";
      techAccordionArrow.textContent = "\u2212"; // minus
    }
  });

  // Copy command to clipboard
  copyCmdBtn.addEventListener("click", () => {
    const cmdText = commandCodeEl.textContent;
    copyToClipboard(cmdText, "Command copied to clipboard!");
    
    // Visual button bounce
    copyBtnText.textContent = "Copied!";
    setTimeout(() => {
      copyBtnText.textContent = "Copy Command";
    }, 1800);
  });

  // Install command copy buttons
  installCopyBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const code = btn.dataset.copy;
      copyToClipboard(code, "Install command copied to clipboard!");
    });
  });

  // Top bar Share page button
  if (sharePageBtn) {
    sharePageBtn.addEventListener("click", () => {
      copyToClipboard(window.location.href, "Tool link copied to clipboard!");
    });
  }

  // ----------------------------------------------------
  // Utility Functions
  // ----------------------------------------------------
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
    } catch {
      showToast("Failed to copy automatically");
    }
    document.body.removeChild(textArea);
  }

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

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ----------------------------------------------------
  // Initial Run
  // ----------------------------------------------------
  updateConditionalVisibility();
  generateCommand();
});
