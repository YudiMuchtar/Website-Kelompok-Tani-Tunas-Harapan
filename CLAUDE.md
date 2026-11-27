# CLAUDE.md

Website Kelompok Tani Tunas Harapan.

Skill animasi terpasang di `.claude/skills/` (sumber tercatat di `.claude/skills-lock.json`).

## Animation Skill Routing

Muat hanya skill yang sesuai konteks agar context window hemat dan skill tidak saling bentrok.
Jika sebuah tugas menyentuh lebih dari satu stack, pilih **satu stack utama** berdasarkan output akhirnya.

### 1. Aplikasi Web / SaaS (React, Next.js, shadcn/ui)
- **Prioritas utama — `emilkowalski/skills`**: micro-interaction, kurva easing, gestur, dan audit performa.
  Skill: `animate`, `gestures`, `choreograph`, `animation-performance`, `review-animations`,
  `improve-animations`, `find-animation-opportunities`, `remove-animations`, `emil-design-eng`, `apple-design`.
- **`imskyleen/animate-ui`** (`animate-ui`): saat menganimasikan komponen shadcn/ui, Radix, Base UI,
  React Aria, atau mengubah ikon SVG menjadi animated icon.
- **`pbakaus/impeccable`** (`impeccable`): arah estetika anti-AI-slop, efek shader/spring.
  Perintah: `/impeccable animate`, `/impeccable overdrive`, `/impeccable audit`.
- Jangan muat GSAP/Remotion di stack ini kecuali diminta eksplisit.

### 2. Landing Page & Scroll-Driven Storytelling
- **Prioritas utama — `greensock/gsap-skills`**: `gsap-scrolltrigger`, `gsap-timeline`, `gsap-plugins`
  (`Flip`, `SplitText`, `MorphSVG`), plus `gsap-core`, `gsap-react`, `gsap-frameworks`, `gsap-performance`, `gsap-utils`.
- **Padukan dengan `LottieFiles/motion-design-skill`** (`motion-design`): koreografi, tabel timing/easing, prinsip motion director.
- Untuk halaman HTML/vanilla JS (seperti website ini), gunakan `gsap-core` + `gsap-scrolltrigger`, bukan `gsap-react`.

### 3. Video Promo, Explainer, & Motion Graphics
- **`remotion-best-practices`**: aktifkan **hanya** saat membuat atau merender proyek video berbasis Remotion.

### Aturan konflik
- Easing/durasi UI aplikasi → ikuti `emilkowalski/skills`; easing landing/scroll → ikuti `motion-design` + GSAP.
- Selalu hormati `prefers-reduced-motion` (lihat `gsap-core` → `gsap.matchMedia()` atau `animate`).
- Satu library animasi per halaman bila memungkinkan (Motion **atau** GSAP, jangan dicampur tanpa alasan).
