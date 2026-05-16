const MIN_COLS = 1;
const MAX_COLS = 9;
const MIN_ROWS = 1;
const MAX_ROWS = 20;
const DEFAULT_COLS = 3;
const DOWNLOAD_DELAY = 400;
const DEFAULT_QUALITY = "lossless";

const EXPORT_PRESETS = {
  instagram: {
    label: "Standar",
    maxSize: 1080,
    mime: "image/jpeg",
    quality: 0.95,
    extension: "jpg",
    helper: "Hasil ringan untuk upload cepat. Cocok untuk konten sederhana.",
  },
  high: {
    label: "Tajam",
    maxSize: 2160,
    mime: "image/jpeg",
    quality: 0.98,
    extension: "jpg",
    helper: "Pilihan rekomendasi. Lebih tajam, ukuran file tetap masuk akal.",
  },
  lossless: {
    label: "Maksimal",
    maxSize: null,
    mime: "image/png",
    quality: null,
    extension: "png",
    helper: "Kualitas paling bersih. File bisa sangat besar.",
  },
};

const state = {
  cols: DEFAULT_COLS,
  rows: null,
  quality: DEFAULT_QUALITY,
  cropOffsetX: 0,
  cropOffsetY: 0,
  cropZoom: 1,
  image: null,
  imageUrl: "",
  fileName: "",
  tiles: [],
  previewUrls: [],
  downloading: false,
  selectedOrder: null,
  uploadedOrders: new Set(),
};

const els = {
  guideToggle: document.getElementById("guideToggle"),
  guidePanel: document.getElementById("guidePanel"),
  uploadSection: document.getElementById("uploadSection"),
  workspace: document.getElementById("workspace"),
  fileInput: document.getElementById("fileInput"),
  dropZone: document.getElementById("dropZone"),
  errorMessage: document.getElementById("errorMessage"),
  imageInfo: document.getElementById("imageInfo"),
  fileName: document.getElementById("fileName"),
  imageResolution: document.getElementById("imageResolution"),
  controlsSection: document.getElementById("controlsSection"),
  colsMinus: document.getElementById("colsMinus"),
  colsPlus: document.getElementById("colsPlus"),
  rowsMinus: document.getElementById("rowsMinus"),
  rowsPlus: document.getElementById("rowsPlus"),
  colsValue: document.getElementById("colsValue"),
  rowsValue: document.getElementById("rowsValue"),
  colsHelper: document.getElementById("colsHelper"),
  rowsHelper: document.getElementById("rowsHelper"),
  totalInfo: document.getElementById("totalInfo"),
  qualityHelper: document.getElementById("qualityHelper"),
  qualityOptions: document.querySelectorAll(".quality-option"),
  presetOptions: document.querySelectorAll(".preset-options button"),
  cropActions: document.querySelectorAll("[data-crop-action]"),
  orderInfo: document.getElementById("orderInfo"),
  uploadGuideText: document.getElementById("uploadGuideText"),
  firstUploadSection: document.getElementById("firstUploadSection"),
  firstUploadPreview: document.getElementById("firstUploadPreview"),
  previewSection: document.getElementById("previewSection"),
  previewGrid: document.getElementById("previewGrid"),
  feedSection: document.getElementById("feedSection"),
  feedPreview: document.getElementById("feedPreview"),
  orderSection: document.getElementById("orderSection"),
  orderList: document.getElementById("orderList"),
  progressSection: document.getElementById("progressSection"),
  progressText: document.getElementById("progressText"),
  progressFill: document.getElementById("progressFill"),
  actionsSection: document.getElementById("actionsSection"),
  downloadAll: document.getElementById("downloadAll"),
  downloadFirst: document.getElementById("downloadFirst"),
  downloadNote: document.getElementById("downloadNote"),
  resetButton: document.getElementById("resetButton"),
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function padOrder(order, total) {
  return String(order).padStart(String(total).length < 2 ? 2 : String(total).length, "0");
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function setError(message) {
  els.errorMessage.textContent = message || "";
}

function setVisible(element, isVisible) {
  element.classList.toggle("hidden", !isVisible);
}

function revokePreviewUrls() {
  state.previewUrls.forEach((url) => URL.revokeObjectURL(url));
  state.previewUrls = [];
}

function showAppSections() {
  setVisible(els.uploadSection, false);
  setVisible(els.workspace, true);
  setVisible(els.imageInfo, true);
  setVisible(els.controlsSection, true);
  setVisible(els.orderInfo, true);
  setVisible(els.firstUploadSection, true);
  setVisible(els.previewSection, true);
  setVisible(els.feedSection, true);
  setVisible(els.orderSection, true);
  setVisible(els.actionsSection, true);
}

function updateControls() {
  const total = state.cols * state.rows;
  const preset = EXPORT_PRESETS[state.quality];
  const firstFile = `ig_upload_${padOrder(1, total)}.${preset.extension}`;
  const lastFile = `ig_upload_${padOrder(total, total)}.${preset.extension}`;
  els.colsValue.textContent = state.cols;
  els.rowsValue.textContent = state.rows;
  els.colsHelper.textContent = `${state.cols} kolom`;
  els.rowsHelper.textContent = `${state.rows} baris · ${total} foto`;
  els.totalInfo.textContent = `${state.cols} kolom × ${state.rows} baris = ${total} foto`;
  els.qualityHelper.textContent = preset.helper;
  els.uploadGuideText.textContent = `Setelah download selesai, buka Instagram dan upload dari file paling atas di galeri: ${firstFile}. Lanjutkan ke nomor berikutnya sampai ${lastFile}.`;
  els.downloadAll.textContent = `Download ${total} File untuk IG (${preset.label})`;
  els.downloadNote.textContent = `App akan menyimpan file dengan urutan khusus agar ${firstFile} muncul paling atas di galeri Instagram.`;

  els.qualityOptions.forEach((button) => {
    const isActive = button.dataset.quality === state.quality;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.disabled = state.downloading;
  });

  els.colsMinus.disabled = state.cols <= MIN_COLS || state.downloading;
  els.colsPlus.disabled = state.cols >= MAX_COLS || state.downloading;
  els.rowsMinus.disabled = state.rows <= MIN_ROWS || state.downloading;
  els.rowsPlus.disabled = state.rows >= MAX_ROWS || state.downloading;
  els.downloadAll.disabled = state.downloading || state.tiles.length === 0;
  els.downloadFirst.disabled = state.downloading || state.tiles.length === 0;
}

function autoRowsForImage(img, cols) {
  return clamp(Math.round((img.naturalHeight / img.naturalWidth) * cols), MIN_ROWS, MAX_ROWS);
}

function getExportTileSize(sourceTileSize) {
  const preset = EXPORT_PRESETS[state.quality];
  const maxSize = preset.maxSize || sourceTileSize;
  return Math.max(1, Math.floor(Math.min(sourceTileSize, maxSize)));
}

function resetCropAdjustments() {
  state.cropOffsetX = 0;
  state.cropOffsetY = 0;
  state.cropZoom = 1;
}

function clampCropAdjustments() {
  state.cropZoom = clamp(state.cropZoom, 1, 1.8);
  state.cropOffsetX = clamp(state.cropOffsetX, -0.5, 0.5);
  state.cropOffsetY = clamp(state.cropOffsetY, -0.5, 0.5);
}

function generateTiles(imgElement, cols, rows) {
  const imgW = imgElement.naturalWidth;
  const imgH = imgElement.naturalHeight;
  const targetRatio = cols / rows;
  const imgRatio = imgW / imgH;

  let cropW = imgW;
  let cropH = imgH;
  let cropX = 0;
  let cropY = 0;

  if (imgRatio > targetRatio) {
    cropW = imgH * targetRatio;
  } else {
    cropH = imgW / targetRatio;
  }

  cropW /= state.cropZoom;
  cropH /= state.cropZoom;
  cropX = (imgW - cropW) / 2 + state.cropOffsetX * (imgW - cropW);
  cropY = (imgH - cropH) / 2 + state.cropOffsetY * (imgH - cropH);
  cropX = clamp(cropX, 0, imgW - cropW);
  cropY = clamp(cropY, 0, imgH - cropH);

  const sourceTileSize = Math.max(1, Math.floor(Math.min(cropW / cols, cropH / rows)));
  const outputTileSize = getExportTileSize(sourceTileSize);
  const tiles = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = outputTileSize;
      canvas.height = outputTileSize;

      const ctx = canvas.getContext("2d");
      if (EXPORT_PRESETS[state.quality].mime === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, outputTileSize, outputTileSize);
      }
      ctx.drawImage(
        imgElement,
        cropX + col * (cropW / cols),
        cropY + row * (cropH / rows),
        cropW / cols,
        cropH / rows,
        0,
        0,
        outputTileSize,
        outputTileSize
      );

      tiles.push({
        canvas,
        row,
        col,
        uploadOrder: (rows - row) * cols - col,
        outputSize: outputTileSize,
      });
    }
  }

  return tiles;
}

function canvasToBlob(canvas, mime = "image/png", quality = null) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas gagal dibuat."));
      }
    }, mime, quality);
  });
}

async function makePreviewUrl(canvas) {
  const blob = await canvasToBlob(canvas, "image/png");
  const url = URL.createObjectURL(blob);
  state.previewUrls.push(url);
  return url;
}

async function rebuildTiles() {
  if (!state.image) {
    return;
  }

  revokePreviewUrls();
  state.tiles = generateTiles(state.image, state.cols, state.rows);
  state.selectedOrder = 1;
  state.uploadedOrders = new Set();
  await renderPreview();
  renderFirstUploadPreview();
  renderFeedPreview();
  await renderOrderList();
  updateControls();
}

async function renderPreview() {
  els.previewGrid.innerHTML = "";
  els.previewGrid.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;

  const fragment = document.createDocumentFragment();

  for (const tile of state.tiles) {
    const previewUrl = await makePreviewUrl(tile.canvas);
    tile.previewUrl = previewUrl;

    const tileEl = document.createElement("article");
    tileEl.className = "tile";
    tileEl.dataset.order = String(tile.uploadOrder);
    if (tile.uploadOrder === state.selectedOrder) {
      tileEl.classList.add("selected");
    }

    const img = document.createElement("img");
    img.src = previewUrl;
    img.alt = `Tile upload ke-${tile.uploadOrder}`;

    const badge = document.createElement("span");
    badge.className = "tile-badge";
    badge.textContent = tile.uploadOrder;

    const button = document.createElement("button");
    button.className = "tile-download";
    button.type = "button";
    button.textContent = "↓";
    button.setAttribute("aria-label", `Download tile upload ke-${tile.uploadOrder}`);
    button.addEventListener("click", () => downloadTile(tile));

    tileEl.append(img, badge, button);
    fragment.appendChild(tileEl);
  }

  els.previewGrid.appendChild(fragment);
}

function renderFirstUploadPreview() {
  els.firstUploadPreview.innerHTML = "";
  const firstTile = state.tiles.find((tile) => tile.uploadOrder === 1);
  if (!firstTile) {
    return;
  }

  const img = document.createElement("img");
  img.src = firstTile.previewUrl;
  img.alt = "Preview file pertama yang harus diupload";

  const text = document.createElement("div");
  const title = document.createElement("p");
  title.textContent = filenameForTile(firstTile);

  const note = document.createElement("span");
  note.textContent = `Upload pertama. Posisi feed: Baris ${firstTile.row + 1}, Kolom ${firstTile.col + 1}.`;

  text.append(title, note);
  els.firstUploadPreview.append(img, text);
}

function renderFeedPreview() {
  els.feedPreview.innerHTML = "";
  els.feedPreview.style.gridTemplateColumns = `repeat(${state.cols}, 1fr)`;

  const fragment = document.createDocumentFragment();

  state.tiles.forEach((tile) => {
    const item = document.createElement("div");
    item.className = "feed-tile";

    const img = document.createElement("img");
    img.src = tile.previewUrl;
    img.alt = `Simulasi feed baris ${tile.row + 1}, kolom ${tile.col + 1}`;

    item.appendChild(img);
    fragment.appendChild(item);
  });

  els.feedPreview.appendChild(fragment);
}

async function renderOrderList() {
  els.orderList.innerHTML = "";
  const total = state.tiles.length;
  const sorted = [...state.tiles].sort((a, b) => b.uploadOrder - a.uploadOrder);
  const fragment = document.createDocumentFragment();

  sorted.forEach((tile, index) => {
    const item = document.createElement("button");
    item.className = "order-item";
    item.type = "button";
    item.dataset.order = String(tile.uploadOrder);
    item.setAttribute("aria-label", `Lihat preview upload ke-${tile.uploadOrder}`);
    if (state.uploadedOrders.has(tile.uploadOrder)) {
      item.classList.add("done");
    }
    if (tile.uploadOrder === state.selectedOrder) {
      item.classList.add("selected");
      item.setAttribute("aria-current", "true");
    }
    item.addEventListener("click", () => selectTile(tile.uploadOrder));

    const badge = document.createElement("span");
    badge.className = "order-badge";
    badge.textContent = tile.uploadOrder;

    const thumb = document.createElement("img");
    thumb.className = "order-thumb";
    thumb.src = tile.previewUrl;
    thumb.alt = `Thumbnail upload ke-${tile.uploadOrder}`;

    const text = document.createElement("div");
    text.className = "order-text";

    const line = document.createElement("p");
    line.textContent = `Upload ke-${tile.uploadOrder}`;
    text.appendChild(line);

    const meta = document.createElement("span");
    meta.className = "order-meta";
    meta.textContent = `File: ${filenameForTile(tile)}`;
    text.appendChild(meta);

    const position = document.createElement("span");
    position.className = "order-meta";
    position.textContent = `Posisi grid: Baris ${tile.row + 1}, Kolom ${tile.col + 1}`;
    text.appendChild(position);

    if (index === 0 || index === total - 1) {
      const label = document.createElement("span");
      label.className = "order-label";
      label.textContent = index === 0 ? "Mulai dari file ini" : "Upload paling akhir";
      text.appendChild(label);
    }

    const action = document.createElement("span");
    action.className = "order-action";
    action.textContent = "Lihat tile";

    const check = document.createElement("span");
    check.className = "order-check";
    check.textContent = state.uploadedOrders.has(tile.uploadOrder) ? "Sudah" : "Belum";
    check.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleUploaded(tile.uploadOrder);
    });

    item.append(badge, thumb, text, action, check);
    fragment.appendChild(item);
  });

  els.orderList.appendChild(fragment);
}

function toggleUploaded(uploadOrder) {
  if (state.uploadedOrders.has(uploadOrder)) {
    state.uploadedOrders.delete(uploadOrder);
  } else {
    state.uploadedOrders.add(uploadOrder);
  }

  renderOrderList();
}

function selectTile(uploadOrder) {
  state.selectedOrder = uploadOrder;

  els.previewGrid.querySelectorAll(".tile").forEach((tileEl) => {
    tileEl.classList.toggle("selected", Number(tileEl.dataset.order) === uploadOrder);
  });

  els.orderList.querySelectorAll(".order-item").forEach((item) => {
    const isSelected = Number(item.dataset.order) === uploadOrder;
    item.classList.toggle("selected", isSelected);
    if (isSelected) {
      item.setAttribute("aria-current", "true");
    } else {
      item.removeAttribute("aria-current");
    }
  });
}

async function downloadCanvas(canvas, filename) {
  const preset = EXPORT_PRESETS[state.quality];
  const blob = await canvasToBlob(canvas, preset.mime, preset.quality);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function filenameForTile(tile) {
  const preset = EXPORT_PRESETS[state.quality];
  return `ig_upload_${padOrder(tile.uploadOrder, state.tiles.length)}.${preset.extension}`;
}

async function downloadTile(tile) {
  if (!tile || state.downloading) {
    return;
  }

  await downloadCanvas(tile.canvas, filenameForTile(tile));
}

async function downloadFirstTile() {
  if (state.downloading || state.tiles.length === 0) {
    return;
  }

  const firstTile = state.tiles.find((tile) => tile.uploadOrder === 1);
  if (firstTile) {
    await downloadCanvas(firstTile.canvas, filenameForTile(firstTile));
  }
}

function setProgress(done, total, complete = false, filename = "") {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  els.progressText.textContent = complete
    ? "Download selesai. Buka Instagram, pilih file paling atas, lalu lanjut ke bawah."
    : `Menyimpan ${done} dari ${total}${filename ? `: ${filename}` : ""}...`;
  els.progressFill.style.width = `${percent}%`;
}

async function downloadAllTiles() {
  if (state.downloading || state.tiles.length === 0) {
    return;
  }

  state.downloading = true;
  setVisible(els.progressSection, true);
  setProgress(0, state.tiles.length);
  updateControls();

  const sorted = [...state.tiles].sort((a, b) => a.uploadOrder - b.uploadOrder);

  try {
    for (let index = 0; index < sorted.length; index += 1) {
      const tile = sorted[index];
      await downloadCanvas(tile.canvas, filenameForTile(tile));
      setProgress(index + 1, sorted.length, false, filenameForTile(tile));

      if (index < sorted.length - 1) {
        await delay(DOWNLOAD_DELAY);
      }
    }

    setProgress(sorted.length, sorted.length, true);
  } catch (error) {
    els.progressText.textContent = "Download gagal. Coba ulangi.";
  } finally {
    state.downloading = false;
    updateControls();
  }
}

function resetState() {
  revokePreviewUrls();

  if (state.imageUrl) {
    URL.revokeObjectURL(state.imageUrl);
  }

  state.cols = DEFAULT_COLS;
  state.rows = null;
  state.quality = DEFAULT_QUALITY;
  resetCropAdjustments();
  state.image = null;
  state.imageUrl = "";
  state.fileName = "";
  state.tiles = [];
  state.downloading = false;
  state.selectedOrder = null;
  state.uploadedOrders = new Set();

  els.fileInput.value = "";
  els.fileName.textContent = "-";
  els.imageResolution.textContent = "Resolusi: -";
  els.previewGrid.innerHTML = "";
  els.feedPreview.innerHTML = "";
  els.firstUploadPreview.innerHTML = "";
  els.orderList.innerHTML = "";
  els.progressFill.style.width = "0%";
  els.progressText.textContent = "Mendownload 0 dari 0...";
  setError("");

  setVisible(els.uploadSection, true);
  setVisible(els.workspace, false);
  setVisible(els.imageInfo, false);
  setVisible(els.controlsSection, false);
  setVisible(els.orderInfo, false);
  setVisible(els.firstUploadSection, false);
  setVisible(els.previewSection, false);
  setVisible(els.feedSection, false);
  setVisible(els.orderSection, false);
  setVisible(els.progressSection, false);
  setVisible(els.actionsSection, false);
}

async function loadImageFile(file) {
  setError("");

  if (!file || !file.type.startsWith("image/")) {
    setError("File harus berupa gambar.");
    return;
  }

  if (state.imageUrl) {
    URL.revokeObjectURL(state.imageUrl);
  }

  const img = new Image();
  const objectUrl = URL.createObjectURL(file);

  img.onload = async () => {
    state.image = img;
    state.imageUrl = objectUrl;
    state.fileName = file.name;
    state.cols = DEFAULT_COLS;
    state.rows = autoRowsForImage(img, state.cols);
    resetCropAdjustments();

    els.fileName.textContent = state.fileName;
    els.imageResolution.textContent = `Resolusi: ${img.naturalWidth} × ${img.naturalHeight} px`;

    showAppSections();
    await rebuildTiles();
  };

  img.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    setError("Gambar gagal dimuat. Coba pilih gambar lain.");
  };

  img.src = objectUrl;
}

function changeCols(delta) {
  if (!state.image || state.downloading) {
    return;
  }

  state.cols = clamp(state.cols + delta, MIN_COLS, MAX_COLS);
  state.rows = autoRowsForImage(state.image, state.cols);
  rebuildTiles();
}

function changeRows(delta) {
  if (!state.image || state.downloading) {
    return;
  }

  state.rows = clamp(state.rows + delta, MIN_ROWS, MAX_ROWS);
  rebuildTiles();
}

function applyGridPreset(cols, rows) {
  if (!state.image || state.downloading) {
    return;
  }

  state.cols = clamp(cols, MIN_COLS, MAX_COLS);
  state.rows = clamp(rows, MIN_ROWS, MAX_ROWS);
  resetCropAdjustments();
  rebuildTiles();
}

function adjustCrop(action) {
  if (!state.image || state.downloading) {
    return;
  }

  const moveStep = 0.08;
  const zoomStep = 0.08;

  if (action === "up") {
    state.cropOffsetY -= moveStep;
  } else if (action === "down") {
    state.cropOffsetY += moveStep;
  } else if (action === "left") {
    state.cropOffsetX -= moveStep;
  } else if (action === "right") {
    state.cropOffsetX += moveStep;
  } else if (action === "zoomIn") {
    state.cropZoom += zoomStep;
  } else if (action === "zoomOut") {
    state.cropZoom -= zoomStep;
  } else if (action === "reset") {
    resetCropAdjustments();
  }

  clampCropAdjustments();
  rebuildTiles();
}

function changeQuality(quality) {
  if (!EXPORT_PRESETS[quality] || state.downloading || state.quality === quality) {
    return;
  }

  state.quality = quality;
  rebuildTiles();
}

function handleDrop(event) {
  event.preventDefault();
  els.dropZone.classList.remove("dragging");
  const file = event.dataTransfer.files && event.dataTransfer.files[0];
  loadImageFile(file);
}

function bindEvents() {
  els.guideToggle.addEventListener("click", () => {
    const isOpen = els.guideToggle.getAttribute("aria-expanded") === "true";
    els.guideToggle.setAttribute("aria-expanded", String(!isOpen));
    els.guidePanel.classList.toggle("open", !isOpen);
  });

  els.dropZone.addEventListener("click", () => els.fileInput.click());
  els.fileInput.addEventListener("change", (event) => {
    loadImageFile(event.target.files[0]);
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragging");
    });
  });

  ["dragleave", "dragend"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, () => {
      els.dropZone.classList.remove("dragging");
    });
  });

  els.dropZone.addEventListener("drop", handleDrop);

  els.colsMinus.addEventListener("click", () => changeCols(-1));
  els.colsPlus.addEventListener("click", () => changeCols(1));
  els.rowsMinus.addEventListener("click", () => changeRows(-1));
  els.rowsPlus.addEventListener("click", () => changeRows(1));
  els.presetOptions.forEach((button) => {
    button.addEventListener("click", () => {
      applyGridPreset(Number(button.dataset.cols), Number(button.dataset.rows));
    });
  });
  els.cropActions.forEach((button) => {
    button.addEventListener("click", () => adjustCrop(button.dataset.cropAction));
  });
  els.qualityOptions.forEach((button) => {
    button.addEventListener("click", () => changeQuality(button.dataset.quality));
  });
  els.downloadAll.addEventListener("click", downloadAllTiles);
  els.downloadFirst.addEventListener("click", downloadFirstTile);
  els.resetButton.addEventListener("click", resetState);
}

bindEvents();
resetState();
