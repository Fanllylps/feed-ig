# DESIGN.md — IG Grid Splitter

> Konteks desain ini dibuat untuk membantu AI (Codex) memahami visi, UI/UX, dan behavior aplikasi secara menyeluruh sebelum menulis kode.

---

## 🎯 Tujuan Aplikasi

Membantu pengguna memotong 1 gambar besar menjadi beberapa tile yang bisa diupload ke Instagram secara berurutan, sehingga tampilan feed Instagram terlihat sambung/seamless antar postingan.

---

## 👤 Target Pengguna

Kreator konten Instagram yang ingin membuat feed grid nyambung (seamless grid), seperti poster event, infografis, atau mural visual yang tersebar di beberapa postingan.

---

## 🗂️ Struktur File

```
Downloads/
├── index.html       ← file utama aplikasi (satu file, no build tools)
└── DESIGN.md        ← dokumen ini (referensi desain untuk Codex)
```

Buka `index.html` langsung di browser. Tidak perlu server, tidak perlu install apapun.

---

## 🖼️ Alur Penggunaan (User Flow)

```
1. Buka index.html di browser
2. Upload 1 gambar (tap/klik zona upload, atau drag & drop)
3. Atur jumlah kolom (default: 3 sesuai grid IG) dan baris
4. Lihat preview grid — gambar terpotong sesuai setting
5. Cek daftar urutan upload (angka 1 = upload pertama = tile kanan bawah)
6. Download semua tile → upload ke IG sesuai urutan angka
```

---

## 📐 UI Layout (Mobile-first)

```
┌─────────────────────────────┐
│  [Header] IG Grid Splitter  │
│  subtitle: feed nyambung    │
├─────────────────────────────┤
│                             │
│   [Drop Zone / Upload]      │
│   🖼️ Tap untuk upload       │
│                             │
├─────────────────────────────┤  ← muncul setelah upload
│  Kolom  [−] 3 [+]           │
│  Baris  [−] 3 [+]  (9 foto) │
├─────────────────────────────┤
│  ℹ️ Info: angka = urutan    │
│  upload ke IG               │
├─────────────────────────────┤
│  [Preview Grid]             │
│  ┌───┬───┬───┐              │
│  │ 9 │ 8 │ 7 │  ← baris 1  │
│  ├───┼───┼───┤              │
│  │ 6 │ 5 │ 4 │  ← baris 2  │
│  ├───┼───┼───┤              │
│  │ 3 │ 2 │ 1 │  ← baris 3  │
│  └───┴───┴───┘              │
│  (badge angka di tiap tile) │
├─────────────────────────────┤
│  [Urutan Upload]            │
│  #1 [thumb] Baris 3, Kol 3  │
│  #2 [thumb] Baris 3, Kol 2  │
│  ...                        │
├─────────────────────────────┤
│  [Download Semua (9 foto)]  │
│  [↺ Ganti Gambar]           │
└─────────────────────────────┘
```

---

## 🎨 Design System

### Color Palette
```
Background utama : #0d0d0f  (hitam gelap)
Background card  : #131210  (gelap sedikit lebih terang)
Border           : #222018  (subtle border)
Aksen utama      : #d4a843  (emas/amber)
Aksen terang     : #f5d07a  (emas muda)
Aksen gelap      : #c8922a  (emas tua)
Teks utama       : #f0ead6  (krem terang)
Teks sekunder    : #7a7060  (abu cokelat)
Info background  : #1a1508  (gelap amber)
Info border      : #3a2e10  (amber redup)
Info teks        : #b09050  (emas redup)
```

### Typography
```
Font judul  : 'DM Serif Display' (Google Fonts) — serif elegan
Font body   : 'DM Sans' (Google Fonts) — sans-serif bersih
```
Import via: `https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap`

### Border Radius
```
Card / section  : 14–16px
Tombol          : 12px
Badge           : 6px
Stepper wrapper : 30px (pill)
```

### Spacing
```
Padding horizontal  : 16px
Gap antar section   : 20–24px
Gap grid tiles      : 2px
```

---

## 🧩 Komponen UI

### 1. Drop Zone
- Border dashed `#3a3428`, radius 16px
- Background `#131210`
- Icon 🖼️ di tengah
- Teks: **"Tap untuk upload gambar"** (bold, amber) + sub "atau drag & drop di sini"
- State `dragging`: border berubah ke `#d4a843`, background `#1a1710`
- Klik → trigger `<input type="file" accept="image/*">`

### 2. Stepper Controls
```
[Label kiri]           [Stepper kanan]
Kolom                  [−]  3  [+]
3 kolom                (pill shape, dark bg)

Baris                  [−]  3  [+]
3 baris · 9 foto
```
- Tombol `−` dan `+`: lingkaran 32px, background `#2a2620`, teks amber
- Nilai tengah: font DM Serif Display, 1.4rem, warna amber
- Disabled state saat min/max tercapai

### 3. Info Bar
- Background `#1a1508`, border `#3a2e10`
- Icon ℹ️ + teks penjelasan urutan upload
- Font size kecil (0.78rem), warna `#b09050`

### 4. Preview Grid
- CSS Grid: `grid-template-columns: repeat(${cols}, 1fr)`, gap 2px
- Tiap tile: `aspect-ratio: 1`, `overflow: hidden`
- Badge urutan upload: pojok kiri bawah, `rgba(0,0,0,0.75)` blur, teks amber
- Tombol download ⬇: pojok kanan atas, muncul saat hover tile (opacity 0 → 1)

### 5. Daftar Urutan Upload
- List vertikal, tiap item: angka bulat amber + thumbnail 32px + info teks
- Item pertama: label "📌 pertama", item terakhir: "🏁 terakhir"

### 6. Tombol Aksi
```
Primary  : gradient amber (#c8922a → #d4a843), teks hitam, full-width
Secondary: transparan, border abu, teks abu → hover border lebih terang
```

---

## ⚙️ Logika Teknis (Canvas API)

### Cara memotong gambar:
```javascript
const tileW = img.naturalWidth / cols;
const tileH = img.naturalHeight / rows;

for (let row = 0; row < rows; row++) {
  for (let col = 0; col < cols; col++) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(tileW);
    canvas.height = Math.floor(tileH);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, col * tileW, row * tileH, tileW, tileH,
                       0, 0, canvas.width, canvas.height);
    // simpan sebagai dataURL
    const dataUrl = canvas.toDataURL("image/png");
  }
}
```

### Logika urutan upload:
```
Grid Instagram: kolom 3, foto terbaru di KIRI ATAS
Urutan upload : tile kanan-bawah DULU (jadi foto tertua)
               tile kiri-atas TERAKHIR (jadi foto terbaru = teratas)

Rumus uploadOrder = (rows - row) * cols - col
→ row=0, col=0 (kiri atas) → order = rows * cols (terakhir)
→ row=rows-1, col=cols-1 (kanan bawah) → order = 1 (pertama)
```

### Download semua:
```javascript
// Sort berdasarkan uploadOrder (1 = pertama didownload = pertama diupload)
const sorted = tiles.sort((a, b) => a.uploadOrder - b.uploadOrder);
sorted.forEach((tile, i) => {
  setTimeout(() => {
    const a = document.createElement("a");
    a.href = tile.dataUrl;
    a.download = `ig_upload_${String(tile.uploadOrder).padStart(2, "0")}.png`;
    a.click();
  }, i * 400); // jeda 400ms agar browser tidak block
});
```

---

## 📱 Cara Pakai (in-app guide)

Tampilkan section "Cara Pakai" yang bisa di-toggle (collapsed by default) dengan konten:

```
📖 Cara Pakai

1️⃣  Upload gambar besar yang ingin kamu jadikan feed IG nyambung
2️⃣  Atur jumlah kolom (IG pakai 3 kolom) dan baris sesuai kebutuhan
3️⃣  Cek preview — pastikan gambar terpotong sesuai keinginan
4️⃣  Perhatikan angka di tiap tile — itu urutan upload ke Instagram
5️⃣  Klik "Download Semua" → file akan ter-download satu per satu
6️⃣  Upload ke Instagram mulai dari file nomor 01, 02, 03, dst
7️⃣  Setelah semua terupload, feed Instagram kamu akan terlihat nyambung!

⚠️  Tips:
- Gunakan gambar resolusi tinggi agar hasil tile tidak pecah
- Jangan skip urutan upload, harus berurutan dari 01 ke akhir
- Preview di app belum tentu 100% sama dengan tampilan IG karena
  IG memberi jarak antar foto — tapi gambarnya tetap nyambung
```

---

## ✅ Checklist Fitur

- [ ] Upload gambar (klik + drag & drop)
- [ ] Auto-hitung baris dari rasio gambar saat upload
- [ ] Stepper kolom (1–9) dan baris (1–20)
- [ ] Preview grid real-time saat ubah kolom/baris
- [ ] Badge urutan upload di tiap tile
- [ ] Tombol download per tile (hover)
- [ ] Daftar urutan upload dengan thumbnail
- [ ] Tombol Download Semua (dengan jeda 400ms)
- [ ] Nama file: `ig_upload_01.png` dst
- [ ] Section "Cara Pakai" (collapsible)
- [ ] Tombol reset/ganti gambar
- [ ] Responsive mobile
- [ ] Semua dalam 1 file `index.html`
- [ ] Tidak ada dependency eksternal kecuali Google Fonts
