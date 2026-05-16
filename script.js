const MIN_COLS = 1;
const MAX_COLS = 9;
const MIN_ROWS = 1;
const MAX_ROWS = 20;
const DEFAULT_COLS = 3;
const DOWNLOAD_DELAY = 400;

const state = {
  cols: DEFAULT_COLS,
  rows: null,
  image: null,
  imageUrl: "",
  fileName: "",
  tiles: [],
  previewUrls: [],
  downloading: false,
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
  orderInfo: document.getElementById("orderInfo"),
  previewSection: document.getElementById("previewSection"),
  previewGrid: document.getElementById("previewGrid"),
  orderSection: document.getElementById("orderSection"),
  orderList: document.getElementById("orderList"),
  progressSection: document.getElementById("progressSection"),
  progressText: document.getElementById("progressText"),
  progressFill: document.getElementById("progressFill"),
  actionsSection: document.getElementById("actionsSection"),
  downloadAll: document.getElementById("downloadAll"),
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
  setVisible(els.previewSection, true);
  setVisible(els.orderSection, true);
  setVisible(els.actionsSection, true);
}

function updateControls() {
  const total = state.cols * state.rows;
  els.colsValue.textContent = state.cols;
  els.rowsValue.textContent = state.rows;
  els.colsHelper.textContent = `${state.cols} kolom`;
  els.rowsHelper.textContent = `${state.rows} baris · ${total} foto`;
  els.totalInfo.textContent = `${state.cols} kolom × ${state.rows} baris = ${total} foto`;
  els.downloadAll.textContent = `Download Semua (${total} foto)`;

  els.colsMinus.disabled = state.cols <= MIN_COLS || state.downloading;
  els.colsPlus.disabled = state.cols >= MAX_COLS || state.downloading;
  els.rowsMinus.disabled = state.rows <= MIN_ROWS || state.downloading;
  els.rowsPlus.disabled = state.rows >= MAX_ROWS || state.downloading;
  els.downloadAll.disabled = state.downloading || state.tiles.length === 0;
}

function autoRowsForImage(img, cols) {
  return clamp(Math.round((img.naturalHeight / img.naturalWidth) * cols), MIN_ROWS, MAX_ROWS);
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
    cropX = (imgW - cropW) / 2;
  } else {
    cropH = imgW / targetRatio;
    cropY = (imgH - cropH) / 2;
  }

  const tileSize = Math.max(1, Math.floor(Math.min(cropW / cols, cropH / rows)));
  const tiles = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = tileSize;
      canvas.height = tileSize;

      const ctx = canvas.getContext("2d", { alpha: false });
      ctx.drawImage(
        imgElement,
        cropX + col * (cropW / cols),
        cropY + row * (cropH / rows),
        cropW / cols,
        cropH / rows,
        0,
        0,
        tileSize,
        tileSize
      );

      tiles.push({
        canvas,
        row,
        col,
        uploadOrder: (rows - row) * cols - col,
      });
    }
  }

  return tiles;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvas gagal dibuat."));
      }
    }, "image/png");
  });
}

async function makePreviewUrl(canvas) {
  const blob = await canvasToBlob(canvas);
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
  await renderPreview();
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

    const img = document.createElement("img");
    img.src = previewUrl;
    img.alt = `Tile upload ke-${tile.uploadOrder}`;

    const badge = document.createElement("span");
    badge.className = "tile-badge";
    badge.textContent = tile.uploadOrder;

    const button = document.createElement("button");
    button.className = "tile-download";
    button.type = "button";
    button.textContent = "⬇";
    button.setAttribute("aria-label", `Download tile upload ke-${tile.uploadOrder}`);
    button.addEventListener("click", () => downloadTile(tile));

    tileEl.append(img, badge, button);
    fragment.appendChild(tileEl);
  }

  els.previewGrid.appendChild(fragment);
}

async function renderOrderList() {
  els.orderList.innerHTML = "";
  const total = state.tiles.length;
  const sorted = [...state.tiles].sort((a, b) => a.uploadOrder - b.uploadOrder);
  const fragment = document.createDocumentFragment();

  sorted.forEach((tile, index) => {
    const item = document.createElement("article");
    item.className = "order-item";

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
    line.textContent = `Upload ke-${tile.uploadOrder} · Baris ${tile.row + 1}, Kolom ${tile.col + 1}`;
    text.appendChild(line);

    if (index === 0 || index === total - 1) {
      const label = document.createElement("span");
      label.className = "order-label";
      label.textContent = index === 0 ? "📌 Upload pertama" : "🏁 Upload terakhir";
      text.appendChild(label);
    }

    item.append(badge, thumb, text);
    fragment.appendChild(item);
  });

  els.orderList.appendChild(fragment);
}

async function downloadCanvas(canvas, filename) {
  const blob = await canvasToBlob(canvas);
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
  return `ig_upload_${padOrder(tile.uploadOrder, state.tiles.length)}.png`;
}

async function downloadTile(tile) {
  if (!tile || state.downloading) {
    return;
  }

  await downloadCanvas(tile.canvas, filenameForTile(tile));
}

function setProgress(done, total, complete = false) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  els.progressText.textContent = complete
    ? "Download selesai."
    : `Mendownload ${done} dari ${total}...`;
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
      setProgress(index + 1, sorted.length);

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
  state.image = null;
  state.imageUrl = "";
  state.fileName = "";
  state.tiles = [];
  state.downloading = false;

  els.fileInput.value = "";
  els.fileName.textContent = "-";
  els.imageResolution.textContent = "Resolusi: -";
  els.previewGrid.innerHTML = "";
  els.orderList.innerHTML = "";
  els.progressFill.style.width = "0%";
  els.progressText.textContent = "Mendownload 0 dari 0...";
  setError("");

  setVisible(els.uploadSection, true);
  setVisible(els.workspace, false);
  setVisible(els.imageInfo, false);
  setVisible(els.controlsSection, false);
  setVisible(els.orderInfo, false);
  setVisible(els.previewSection, false);
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
  els.downloadAll.addEventListener("click", downloadAllTiles);
  els.resetButton.addEventListener("click", resetState);
}

bindEvents();
resetState();
