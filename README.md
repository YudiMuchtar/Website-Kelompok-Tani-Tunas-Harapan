# Website Kelompok Tani Tunas Harapan

Situs profil 3D interaktif Kelompok Tani **Tunas Harapan** — Lingkungan IV Pargarutan Baru,
Kel. Pasar Pargarutan, Kec. Angkola Timur, Kab. Tapanuli Selatan.

Dirancang untuk memperkenalkan kelompok kepada **Dinas Pertanian, instansi pemerintah, BUMN,
perusahaan swasta (CSR), dan lembaga donor** yang ingin menyalurkan hibah atau bermitra.

## Isi halaman

| Bagian | Isi |
| --- | --- |
| Hero 3D | Lanskap senja Tapanuli Selatan (Three.js): tunas tumbuh, sinar matahari seperti logo, sawah bergoyang, kupu-kupu, serbuk sari |
| Siapa Kami | Manifesto + legalitas, asas, sifat nonpartisan |
| Makna Logo | Logo interaktif yang memperbesar tiap elemen saat digulir |
| Visi & Misi | Visi dan 5 misi (dirumuskan dari AD Pasal 7–8 & Mukaddimah), gulir horizontal |
| Potensi | 36 anggota, ±123 ha lahan milik sendiri, 190 ekor ternak, 7 seksi usaha |
| Tata Kelola | 8 alasan mengapa hibah aman (AD/ART, laporan berkala, pendampingan PPL, dll.) |
| Peluang Kemitraan | 7 program prioritas yang siap didanai |
| Alur Kemitraan | 5 langkah dari kontak hingga pelaporan |
| Struktur | Pembina, pengurus, dan ketua seksi periode 2024 |
| Lokasi & Kontak | Peta + formulir minat kemitraan (WhatsApp / email) |

Data diambil dari Berita Acara Revitalisasi, AD/ART, dan Data Kelompok Tani (2 Juli 2024).
Data pribadi (NIK, No. KK, NIP) **sengaja tidak ditampilkan**.

## Foto ilustrasi (Gamma AI)

Lima foto ilustrasi (lanskap sawah, tangan & tunas, musyawarah petani, hasil panen, ternak & kolam)
dibuat dengan Gamma AI dan dimuat dari `cdn.gamma.app`. Setiap foto diberi label **"Ilustrasi"**
agar tidak disangka dokumentasi asli.

- Sebaiknya unduh foto-foto itu ke `assets/img/` dengan nama `photo-landscape.webp`, `photo-hands.webp`,
  `photo-meeting.webp`, `photo-harvest.webp`, `photo-farm.webp`. Jika CDN gagal dimuat, situs otomatis
  memakai salinan lokal tersebut (atribut `data-local`).
- Idealnya, ganti dengan **foto asli** kegiatan kelompok — calon pemberi hibah akan lebih percaya.

## Sebelum dipublikasikan

Isi kontak resmi di `assets/js/config.js`:

```js
window.TUNAS_CONFIG = {
  whatsapp: '62812xxxxxxx', // nomor WA sekretariat, format internasional tanpa "+"
  email: 'nama@contoh.id',
};
```

Formulir akan otomatis membuka WhatsApp (atau email) dengan pesan yang sudah tersusun.

## Menjalankan secara lokal

Situs statis murni — tanpa proses build. Karena memakai ES module, buka lewat server lokal:

```bash
npx http-server .     # atau: python3 -m http.server 8080
```

lalu buka `http://localhost:8080`.

## Publikasi (GitHub Pages)

Settings → Pages → *Deploy from a branch* → pilih branch dan folder `/ (root)`.

## Teknologi

- [Three.js](https://threejs.org) r160 — adegan 3D hero
- [GSAP](https://gsap.com) + ScrollTrigger — animasi gulir
- [Lenis](https://lenis.darkroom.engineering) — gulir halus
- Font: Fraunces & Plus Jakarta Sans (Google Fonts)

Semua pustaka disimpan lokal di `assets/vendor/` sehingga tidak bergantung pada CDN.
Mendukung `prefers-reduced-motion`, navigasi keyboard, dan tampilan ponsel.
