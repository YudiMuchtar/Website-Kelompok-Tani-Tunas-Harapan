/* Tunas Harapan — interaksi & animasi gulir */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';

  // Foto dari CDN; jika gagal dimuat, pakai salinan lokal (assets/img)
  $$('img[data-local]').forEach((img) => {
    img.addEventListener('error', function swap() {
      img.removeEventListener('error', swap);
      img.addEventListener('error', () => img.classList.add('is-missing'), { once: true });
      img.src = img.dataset.local;
    });
  });

  if (!hasGsap) {
    // Tanpa GSAP: tampilkan semua konten apa adanya
    document.documentElement.classList.remove('js');
    document.body.classList.remove('is-loading');
    $('#loader')?.classList.add('is-done');
    return;
  }

  const { gsap, ScrollTrigger } = window;
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Gulir halus ---------- */
  let lenis = null;
  if (!reduced && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: -20 });
    else document.querySelector(target)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  };
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2 || !document.querySelector(id)) return;
      e.preventDefault();
      closeMenu();
      scrollTo(id);
    });
  });

  /* ---------- Preloader ---------- */
  const loader = $('#loader');
  const prog = $('.loader__prog');
  const pctEl = $('#loaderPct');
  const counter = { v: 0 };
  let pageLoaded = document.readyState === 'complete';
  window.addEventListener('load', () => { pageLoaded = true; });
  const dots = $('.loader__dots');
  let d = 0;
  const dotTimer = setInterval(() => { d = (d + 1) % 4; if (dots) dots.textContent = '.'.repeat(d); }, 350);

  gsap.to(counter, {
    v: 82, duration: reduced ? 0.2 : 1.4, ease: 'power2.out',
    onUpdate: paint,
    onComplete: function waitLoad() {
      const started = performance.now();
      const check = () => {
        if (pageLoaded || performance.now() - started > 3500) {
          gsap.to(counter, { v: 100, duration: 0.45, ease: 'power1.inOut', onUpdate: paint, onComplete: finish });
        } else requestAnimationFrame(check);
      };
      check();
    },
  });
  function paint() {
    const v = Math.round(counter.v);
    if (pctEl) pctEl.textContent = v + '%';
    if (prog) prog.style.strokeDashoffset = 339.3 * (1 - v / 100);
  }
  function finish() {
    clearInterval(dotTimer);
    loader.classList.add('is-done');
    document.body.classList.remove('is-loading');
    lenis?.start();
    intro();
  }

  /* ---------- Intro hero ---------- */
  function startHero() { window.__hero?.start(); }
  window.addEventListener('hero:ready', () => { if (document.body.dataset.intro) startHero(); });

  function intro() {
    document.body.dataset.intro = '1';
    startHero();
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero__title .line > span', { y: 0, duration: 1.4, stagger: 0.12 }, 0.15)
      .to('.hero .reveal-up', { opacity: 1, y: 0, duration: 1.2, stagger: 0.12 }, 0.45)
      .add(() => nav.classList.add('is-ready'), 0.3);
    $$('.hero__stats [data-count]').forEach((el) => countUp(el, 2.2, 0.9));
  }

  /* ---------- Penghitung angka ---------- */
  function countUp(el, dur = 2, delay = 0) {
    const end = +el.dataset.count;
    const pre = el.dataset.prefix || '';
    const o = { v: 0 };
    gsap.to(o, {
      v: end, duration: reduced ? 0.01 : dur, delay, ease: 'power3.out',
      onUpdate: () => { el.textContent = pre + Math.round(o.v).toLocaleString('id-ID'); },
    });
  }
  $$('[data-count]').forEach((el) => {
    if (el.closest('.hero')) return;
    ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => countUp(el) });
  });

  /* ---------- Hero: parallax saat digulir ---------- */
  ScrollTrigger.create({
    trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (self) => window.__hero?.setProgress(self.progress),
  });
  gsap.to('.hero__content', { yPercent: -18, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: '70% top', scrub: true } });
  gsap.to('.hero__stats', { y: 60, opacity: 0, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: '80% top', scrub: true } });

  /* ---------- Navigasi ---------- */
  const nav = $('#nav');
  const toggle = $('#navToggle');
  let lastY = 0;
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle('is-scrolled', y > window.innerHeight * 0.6);
    const hide = y > lastY && y > window.innerHeight && !nav.classList.contains('is-open');
    nav.classList.toggle('is-hidden', hide);
    lastY = y;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    gsap.set('#progressBar', { scaleX: max > 0 ? y / max : 0 });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  function closeMenu() { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', () => {
    const open = !nav.classList.contains('is-open');
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  $$('.nav__links a[href^="#"]:not(.btn)').forEach((a) => {
    const sec = document.querySelector(a.getAttribute('href'));
    if (!sec) return;
    ScrollTrigger.create({
      trigger: sec, start: 'top 50%', end: 'bottom 50%',
      onToggle: (s) => a.classList.toggle('is-active', s.isActive),
    });
  });

  /* ---------- Kursor & tombol magnetik ---------- */
  if (finePointer && !reduced) {
    const cur = $('.cursor');
    const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
    const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    $$('a, button, summary, .tilt, .seksi__card').forEach((el) => {
      el.addEventListener('pointerenter', () => cur.classList.add('is-hover'));
      el.addEventListener('pointerleave', () => cur.classList.remove('is-hover'));
    });
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        el.style.setProperty('--mx', mx + 'px');
        el.style.setProperty('--my', my + 'px');
        gsap.to(el, { x: (mx - r.width / 2) * 0.25, y: (my - r.height / 2) * 0.35, duration: 0.5, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, .4)' }));
    });

    /* Kartu miring 3D */
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty('--ry', (px - 0.5) * 10 + 'deg');
        el.style.setProperty('--rx', (0.5 - py) * 8 + 'deg');
        el.style.setProperty('--gx', px * 100 + '%');
        el.style.setProperty('--gy', py * 100 + '%');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- Manifesto: kata demi kata ---------- */
  $$('.split-words').forEach((p) => {
    const words = p.textContent.trim().split(/\s+/);
    p.innerHTML = words.map((w) => `<span class="w">${w}</span>`).join(' ');
    if (reduced) return;
    gsap.to(p.querySelectorAll('.w'), {
      opacity: 1, stagger: 0.08, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
    });
  });

  /* ---------- Kemunculan umum ---------- */
  const batchIn = (sel, vars = {}) => {
    const els = $$(sel);
    if (!els.length || reduced) return;
    gsap.set(els, { opacity: 0, y: 50, ...vars.from });
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, rotateX: 0, scale: 1, duration: 1.1, stagger: 0.09, ease: 'expo.out', overwrite: true }),
    });
  };
  batchIn('.section-head, .logo-story__text > .eyebrow, .logo-story__text > .h2');
  batchIn('.about-card');
  batchIn('.bento__item', { from: { y: 60, scale: 0.96 } });
  batchIn('.seksi__card', { from: { y: 70, rotateX: -25 } });
  batchIn('.tcard');
  batchIn('.prog');
  batchIn('.person');
  batchIn('.lokasi__grid > *');
  batchIn('.cta__left > *, .form');
  batchIn('.h3.center');

  /* ---------- Visi: matahari bersinar ---------- */
  const raysG = $('.vision__sun .rays');
  if (raysG) {
    const NS = 'http://www.w3.org/2000/svg';
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const l = document.createElementNS(NS, 'line');
      const r1 = 44, r2 = i % 2 ? 80 : 98;
      l.setAttribute('x1', 100 + Math.cos(a) * r1); l.setAttribute('y1', 100 + Math.sin(a) * r1);
      l.setAttribute('x2', 100 + Math.cos(a) * r2); l.setAttribute('y2', 100 + Math.sin(a) * r2);
      raysG.appendChild(l);
    }
  }
  if (!reduced) {
    gsap.from('.vision', { y: 80, rotateX: -12, transformPerspective: 1200, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.vision', start: 'top 85%' } });
    gsap.from('.vision__quote', { y: 40, opacity: 0, duration: 1.4, delay: 0.2, ease: 'expo.out', scrollTrigger: { trigger: '.vision', start: 'top 75%' } });
  }

  /* ---------- Makna logo: fokus bergulir ---------- */
  const logoImg = $('#logoImg');
  const items = $$('#meaning li');
  function focusItem(li) {
    items.forEach((x) => x.classList.toggle('is-active', x === li));
    if (!logoImg || window.innerWidth <= 900) return;
    logoImg.style.transformOrigin = li.dataset.focus;
    logoImg.style.transform = `scale(${li.dataset.scale})`;
  }
  items.forEach((li) => {
    ScrollTrigger.create({
      trigger: li, start: 'top 60%', end: 'bottom 60%',
      onToggle: (s) => s.isActive && focusItem(li),
    });
  });
  ScrollTrigger.create({
    trigger: '#meaning', start: 'top 60%', end: 'bottom 40%',
    onLeave: resetLogo, onLeaveBack: resetLogo,
  });
  function resetLogo() { if (logoImg) logoImg.style.transform = 'scale(1)'; }
  if (!reduced) {
    gsap.from('.logo-stage', { scale: 0.85, rotateY: -25, transformPerspective: 1200, opacity: 0, duration: 1.6, ease: 'expo.out', scrollTrigger: { trigger: '.logo-story', start: 'top 75%' } });
  }

  /* ---------- Misi: gulir horizontal (desktop) ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 821px) and (prefers-reduced-motion: no-preference)', () => {
    const track = $('#missionTrack');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#mission', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 },
    });
    $$('.mcard', track).forEach((c) => {
      gsap.from(c, {
        rotateY: -18, y: 40, transformPerspective: 1200, opacity: 0.4, ease: 'none',
        scrollTrigger: { trigger: c, containerAnimation: tween, start: 'left 100%', end: 'left 60%', scrub: true },
      });
    });
  });
  mm.add('(max-width: 820px)', () => { batchIn('.mcard'); });


  /* ---------- Sinema lanskap: bingkai meluas ---------- */
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const tl = gsap.timeline({
      scrollTrigger: { trigger: '.cinema', start: 'top top', end: '+=140%', pin: '.cinema__pin', scrub: 0.8, anticipatePin: 1, refreshPriority: 2 },
    });
    tl.fromTo('.cinema__frame', { clipPath: 'inset(18% 22% 18% 22% round 36px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none', duration: 1 }, 0)
      .fromTo('.cinema__frame img', { scale: 1.25 }, { scale: 1, ease: 'none', duration: 1.2 }, 0)
      .from('.cinema__kicker', { y: 30, opacity: 0, duration: 0.3 }, 0.35)
      .from('.cinema__title span', { yPercent: 60, opacity: 0, rotateX: -40, transformPerspective: 800, stagger: 0.12, duration: 0.45 }, 0.4);

    /* Parallax foto dalam bingkai */
    $$('.mask img').forEach((img) => {
      gsap.fromTo(img, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    $$('.mask').forEach((m) => {
      gsap.from(m, { clipPath: 'inset(100% 0% 0% 0% round 32px)', duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: m, start: 'top 88%' } });
    });
  });
  mm.add('(prefers-reduced-motion: reduce)', () => { document.documentElement.classList.add('no-pin'); });
  batchIn('.showcase figcaption, .trustbar li');

  /* ---------- Alur: garis tumbuh ---------- */
  const path = $('#flowPath');
  if (path) {
    gsap.to(path, { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.flow__wrap', start: 'top 70%', end: 'bottom 60%', scrub: 0.5 } });
    $$('.flow__steps li').forEach((li) => {
      ScrollTrigger.create({ trigger: li, start: 'top 65%', onEnter: () => li.classList.add('is-in'), onLeaveBack: () => li.classList.remove('is-in') });
      if (!reduced) gsap.from(li.children[1], { x: 60, opacity: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: li, start: 'top 85%' } });
    });
  }

  /* ---------- Titik anggota ---------- */
  const md = $('#memberDots');
  if (md) {
    md.innerHTML = Array.from({ length: 36 }, (_, i) => `<i class="${i < 3 ? 'is-lead' : ''}"></i>`).join('');
    gsap.to(md.children, { scale: 1, duration: 0.6, ease: 'back.out(3)', stagger: { each: 0.03, from: 'center' }, scrollTrigger: { trigger: md, start: 'top 90%' } });
  }

  /* ---------- Program: hanya satu terbuka ---------- */
  const progs = $$('.prog');
  progs.forEach((p) => p.addEventListener('toggle', () => {
    if (p.open) progs.forEach((o) => { if (o !== p) o.open = false; });
    ScrollTrigger.refresh();
  }));

  /* ---------- Formulir kemitraan ---------- */
  const cfg = window.TUNAS_CONFIG || {};
  const list = $('#contactList');
  if (cfg.whatsapp) list.insertAdjacentHTML('beforeend', `<li><svg class="ic"><use href="#i-wa"/></svg><a href="https://wa.me/${cfg.whatsapp}" target="_blank" rel="noopener">WhatsApp +${cfg.whatsapp}</a></li>`);
  if (cfg.email) list.insertAdjacentHTML('beforeend', `<li><svg class="ic"><use href="#i-mail"/></svg><a href="mailto:${cfg.email}">${cfg.email}</a></li>`);

  const form = $('#partnerForm');
  const note = $('#formNote');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    let ok = true;
    $$('[required]', form).forEach((f) => {
      const bad = !f.value.trim();
      f.closest('.field').classList.toggle('is-invalid', bad);
      if (bad) ok = false;
    });
    if (!ok) { note.textContent = 'Mohon lengkapi nama, instansi, dan bentuk dukungan.'; return; }
    const v = Object.fromEntries(new FormData(form));
    const msg = `Salam hormat, Kelompok Tani Tunas Harapan.\n\nSaya ${v.nama} dari ${v.instansi} tertarik menjajaki kemitraan dalam bentuk: ${v.jenis}.${v.pesan ? `\n\n${v.pesan}` : ''}\n\nMohon informasi lebih lanjut. Terima kasih.`;
    if (cfg.whatsapp) {
      window.open(`https://wa.me/${cfg.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      note.textContent = 'Terima kasih! Percakapan WhatsApp dengan sekretariat telah dibuka.';
    } else if (cfg.email) {
      window.location.href = `mailto:${cfg.email}?subject=${encodeURIComponent('Minat Kemitraan — ' + v.instansi)}&body=${encodeURIComponent(msg)}`;
      note.textContent = 'Terima kasih! Aplikasi email Anda sedang dibuka.';
    } else {
      note.innerHTML = 'Terima kasih atas minat Anda! Silakan salin pesan berikut dan sampaikan kepada sekretariat kami:';
      const pre = document.createElement('pre');
      pre.textContent = msg;
      note.appendChild(pre);
    }
    gsap.fromTo(form, { scale: 0.98 }, { scale: 1, duration: 0.6, ease: 'elastic.out(1, .5)' });
  });
  $$('input, select, textarea', form).forEach((f) => f.addEventListener('input', () => f.closest('.field').classList.remove('is-invalid')));

  $('#year').textContent = new Date().getFullYear();

  // Pin dibuat tidak berurutan; urutkan sesuai posisi di halaman
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  window.addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
})();
