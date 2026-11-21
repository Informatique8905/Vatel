/*
 * DishOrbitCarousel — carrousel de plats piloté par le défilement.
 * Adaptation JSX (React + JS) du modèle « dish-orbit-carousel » (21st.dev,
 * MIT) au design Cantine Vatel.
 *
 * Moteur « continu » (fluidité) :
 * - une position flottante `p` (0 = 1er plat, 1 = 2e…) suit en direct le
 *   scroll, le doigt (glisser n'importe où sur la scène) et les flèches ;
 * - la position affichée rattrape la cible par interpolation exponentielle
 *   à chaque frame (gsap.ticker), sans re-render React : seules les
 *   transformations des assiettes sont écrites dans le DOM ;
 * - le scroll se cale sur le plat le plus proche quand il s'arrête
 *   (ScrollTrigger snap) ; un glisser projette l'inertie du geste ;
 * - le titre et la carte ne changent qu'au franchissement d'un plat, avec
 *   une transition courte et interruptible (jamais de verrou).
 *
 * dish = {
 *   title, subtitle,   // titre en 2 graisses
 *   eyebrow,           // surtitre (jour, statut)
 *   image,             // URL photo (admin) ou null -> assiette stylisée
 *   rating, chef, kitchen, description, likes, dislikes, price,
 *   ingredients[],     // onglet Ingrédients
 *   accent,            // couleur pastel du fond
 *   allergen,          // chaîne -> réservation bloquée (rouge)
 *   warn               // chaîne -> avertissement non bloquant (jaune)
 * }
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import DishPlate from './DishPlate';
import Icon from './Icon';

gsap.registerPlugin(ScrollTrigger);

const PER_DISH = 0.5;   // hauteurs d'écran de scroll par plat
const SPACING = 46;     // degrés entre deux assiettes sur l'orbite
const FOLLOW = 14;      // raideur du suivi (plus haut = plus réactif)
const wrap = (i, n) => ((i % n) + n) % n;
const near = (d, n) => { const w = wrap(d, n); return w > n / 2 ? w - n : w; };
const fmt = (n) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} F`;

const I_STAR = <svg className="dsh-ic" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 3l2.7 5.8 6.3.7-4.7 4.3 1.3 6.2L12 16.9 6.4 20l1.3-6.2L3 9.5l6.3-.7z" /></svg>;
const I_HEART = <svg className="dsh-ic" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M12 20.6C5.6 16.5 2.8 13.2 2.8 9.6 2.8 7 4.8 5 7.3 5c1.8 0 3.5 1 4.7 2.6C13.2 6 14.9 5 16.7 5c2.5 0 4.5 2 4.5 4.6 0 3.6-2.8 7-9.2 11z" /></svg>;
const I_LIKE = <svg className="dsh-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="M7 21H4a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1h3v10zm3 0h7.5a2 2 0 0 0 2-1.7l1-7A2 2 0 0 0 18.5 10H14l1-5.3c.1-.9-.5-1.7-1.4-1.7H12l-3.5 5.4V21" /></svg>;
const I_DISLIKE = <svg className="dsh-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="M17 3h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3V3zm-3 0H6.5a2 2 0 0 0-2 1.7l-1 7A2 2 0 0 0 5.5 14H10l-1 5.3c-.1.9.5 1.7 1.4 1.7H12l3.5-5.4V3" /></svg>;
const I_LOCK = <svg className="dsh-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

const CSS = `
.dsh-trk { position: relative; width: 100%; }
.dsh-root {
  position: sticky; top: 0; overflow: hidden; outline: none;
  container-type: size;
  background: #F9F9F9; color: #1D1D1B;
  --dsh-accent: #E8F3FC;
}
.dsh-arc {
  position: absolute; top: -36%; left: 50%; translate: -50% 0;
  width: 165cqw; aspect-ratio: 1; border-radius: 50%;
  background: var(--dsh-accent); opacity: .55;
  transition: background-color .45s ease;
  pointer-events: none; z-index: 0;
}
.dsh-canvas { position: relative; height: 100%; display: flex; flex-direction: column; justify-content: space-evenly; padding: 8px 18px 14px; box-sizing: border-box; max-width: 640px; margin: 0 auto; z-index: 1; touch-action: pan-y; }

/* ---- Assiettes ---- */
.dsh-plates { position: relative; flex: none; width: min(62cqw, 42cqh, 260px); aspect-ratio: 1; margin: 0 auto; touch-action: pan-y; user-select: none; -webkit-user-select: none; cursor: grab; }
.dsh-plates.drag { cursor: grabbing; }
.dsh-plates.gest { touch-action: none; }
.dsh-ring { position: absolute; inset: -8%; border: 1.5px dashed rgba(7,42,93,.16); border-radius: 50%; animation: dsh-spin 46s linear infinite; pointer-events: none; }
@keyframes dsh-spin { to { transform: rotate(360deg); } }
.dsh-arm { position: absolute; inset: 0; transform-origin: 50% 215%; will-change: transform, opacity; backface-visibility: hidden; pointer-events: none; }
.dsh-arm > * { display: block; width: 100%; height: 100%; will-change: transform; }
.dsh-arm .dish-plate, .dsh-arm .dish-photo { width: 100%; height: 100%; box-shadow: 0 24px 42px -16px rgba(7,42,93,.32); }

/* ---- Titre ---- */
.dsh-head { position: relative; flex: none; margin-top: 0; text-align: center; }
.dsh-eyebrow { display: block; overflow: hidden; margin: 0; }
.dsh-eb { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #5C5C5C; }
.dsh-hd { margin: 3px 0 0; font-size: clamp(24px, 7cqw, 34px); line-height: 1.06; letter-spacing: -.02em; }
.dsh-l { display: block; overflow: hidden; }
.dsh-t1 { display: inline-block; font-weight: 400; }
.dsh-t2 { display: inline-block; font-weight: 900; color: #072A5D; }
.dsh-li { will-change: transform; }

/* ---- Actions ---- */
.dsh-acts { flex: none; display: flex; gap: 10px; margin-top: 0; align-items: stretch; justify-content: center; }
.dsh-abtn {
  flex: 1; height: 52px; border-radius: 14px; border: 1px solid #E3E3E3; background: #fff;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  font-family: inherit; font-size: 15px; font-weight: 700; color: #1D1D1B; cursor: pointer;
  transition: transform .12s ease;
}
.dsh-abtn:active { transform: scale(.97); }
.dsh-abtn .i { width: 18px; height: 18px; }
.dsh-abtn.flag { flex: none; width: 52px; color: #5C5C5C; }
.dsh-abtn.main { flex: 0 0 auto; padding: 0 20px; background: #072A5D; border-color: #072A5D; color: #fff; box-shadow: inset 0 -3px 0 #041B3D; }
.dsh-price { font-variant-numeric: tabular-nums; font-weight: 800; }
.dsh-off { flex: 0 0 auto; padding: 0 20px; height: 52px; border-radius: 14px; background: #F2F2F2; color: #5C5C5C; display: inline-flex; align-items: center; justify-content: center; gap: 7px; font-size: 15px; font-weight: 700; }
.dsh-off .dsh-ic { width: 17px; height: 17px; }

/* ---- Carte plat ---- */
.dsh-card {
  flex: 1; min-height: 0; margin-top: 0; background: #fff; border-radius: 18px;
  border: 1px solid #F0F0F0; box-shadow: 0 14px 30px -20px rgba(7,42,93,.25);
  padding: 12px 14px; display: flex; flex-direction: column; overflow: hidden;
}
.dsh-card-in { display: flex; flex-direction: column; gap: 8px; min-height: 0; flex: 1; will-change: transform, opacity; }
.dsh-rate { display: flex; align-items: center; gap: 8px; flex: none; }
.dsh-num { font-size: 28px; line-height: 1; font-weight: 900; letter-spacing: -.5px; font-variant-numeric: tabular-nums; }
.dsh-cap { font-size: 14px; font-weight: 700; color: #5C5C5C; }
.dsh-stars { color: #FDCA12; display: inline-flex; }
.dsh-stars .dsh-ic { width: 14px; height: 14px; }
.dsh-badge { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.dsh-badge b { font-size: 14px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dsh-badge small { font-size: 12px; color: #5C5C5C; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dsh-likes { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; color: #5C5C5C; flex: none; }
.dsh-likes .dsh-ic { width: 15px; height: 15px; color: #FF5959; }
.dsh-warn { margin: 0; display: flex; align-items: center; gap: 7px; padding: 7px 9px; border-radius: 9px; font-size: 12px; font-weight: 700; line-height: 1.35; background: #FFF6D6; color: #8a6d00; flex: none; }
.dsh-warn .i { width: 16px; height: 16px; flex: none; }
.dsh-warn.block { background: #FFECEC; color: #B42318; }
.dsh-tabs { display: flex; background: #EDEDED; border-radius: 10px; padding: 3px; flex: none; }
.dsh-tabs button { flex: 1; height: 32px; border: 0; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 700; cursor: pointer; background: transparent; color: #5C5C5C; transition: background .2s, color .2s; }
.dsh-tabs button.on { background: #fff; color: #072A5D; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.dsh-body { flex: 1; min-height: 0; overflow-y: auto; }
.dsh-desc { margin: 2px 0 0; font-size: 13.5px; line-height: 1.55; color: #5C5C5C; }
.dsh-ings { display: flex; flex-wrap: wrap; gap: 7px; padding-top: 2px; }
.dsh-ing { padding: 6px 10px; border-radius: 9px; background: #E8F3FC; color: #072A5D; font-size: 12.5px; font-weight: 700; }
.dish-photo { animation: dsh-fade .5s ease both; }
@keyframes dsh-fade { from { opacity: 0; } }

.dsh-react { flex: none; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.dsh-rcount { display: inline-flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 700; color: #5C5C5C; }
.dsh-rcount .dsh-ic { width: 15px; height: 15px; color: #FF5959; }
.dsh-votes { display: inline-flex; gap: 8px; }
.dsh-vbtn { width: 40px; height: 34px; border-radius: 9px; border: 1px solid #E3E3E3; background: #fff; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: #5C5C5C; transition: transform .1s; }
.dsh-vbtn:active { transform: scale(.9); }
.dsh-vbtn .dsh-ic { width: 17px; height: 17px; }
.dsh-vbtn.on { border-color: #072A5D; color: #072A5D; background: #E8F3FC; }

/* ---- Pager / flèches / vignettes ---- */
.dsh-pager { position: absolute; left: 8px; top: 28%; display: flex; flex-direction: column; gap: 9px; z-index: 3; padding: 0; }
.dsh-dot { width: 7px; height: 7px; border-radius: 4px; border: 0; padding: 0; background: #C9C9C9; cursor: pointer; transition: height .25s cubic-bezier(.2,.8,.2,1), background .25s; }
.dsh-dot.on { height: 22px; background: #072A5D; }
.dsh-nav { position: absolute; top: 15%; width: 38px; height: 38px; border-radius: 50%; border: 0; background: rgba(255,255,255,.9); box-shadow: 0 4px 12px rgba(7,42,93,.15); color: #072A5D; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 3; transition: transform .1s; }
.dsh-nav:active { transform: scale(.9); }
.dsh-nav .i { width: 20px; height: 20px; }
.dsh-prev { left: 8px; }
.dsh-next { right: 8px; }
.dsh-strip { display: none; }

/* ---- Petites hauteurs (mesurees sur le conteneur) ---- */
@container (max-height: 660px) {
  .dsh-tabs, .dsh-body, .dsh-react { display: none; }
  .dsh-card { flex: none; }
}
@container (max-height: 460px) {
  .dsh-card { display: none; }
  .dsh-pager { top: 18%; }
}
@media (prefers-reduced-motion: reduce) {
  .dsh-ring { animation: none; }
  .dsh-arc { transition: none; }
}

/* ---- Grand conteneur (hors coquille mobile) ---- */
@container (min-width: 640px) {
  .dsh-canvas { display: grid; grid-template-columns: 44% 1fr; grid-template-rows: auto 1fr; column-gap: 34px; padding: 22px 30px; }
  .dsh-plates { grid-row: 1 / 3; width: 100%; margin: auto 0; }
  .dsh-head { text-align: left; margin-top: 0; align-self: end; }
  .dsh-acts { align-self: start; margin-top: 14px; max-width: 380px; }
  .dsh-card { margin-top: 16px; max-height: 46%; }
  .dsh-pager { left: auto; right: 14px; top: 50%; translate: 0 -50%; }
  .dsh-nav { display: flex; }
  .dsh-strip { position: absolute; left: 30px; bottom: 18px; display: flex; gap: 10px; z-index: 3; }
  .dsh-tn { width: 52px; height: 52px; border-radius: 50%; border: 2px solid transparent; padding: 3px; background: #fff; cursor: pointer; opacity: .6; transition: .25s; }
  .dsh-tn.on { border-color: #072A5D; opacity: 1; scale: 1.1; }
  .dsh-tn .dish-plate, .dsh-tn .dish-photo { width: 100%; height: 100%; }
}
`;

export default function DishOrbitCarousel({
  dishes,
  initialIndex = 0,
  height = '100svh',
  onIndexChange,
  onOrder,
  onReport,
  drive = 'scroll',
}) {
  const n = dishes.length;
  const start = wrap(initialIndex, n);
  const [idx, setIdx] = useState(start);
  const [tab, setTab] = useState('overview');
  const [vote, setVote] = useState(0);
  const [dragging, setDragging] = useState(false);

  const trackRef = useRef(null);
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const snapT = useRef(null);
  const platesRef = useRef(null);
  const armRefs = useRef([]);
  const headRef = useRef(null);
  const cardRef = useRef(null);

  // Position : cible = départ + décalage (flèches, glisser) + scroll + glisser en cours.
  const base = useRef(start);
  const scrollP = useRef(0);
  const drag = useRef(0);
  const cur = useRef(start);
  const idxRef = useRef(start);
  const dirRef = useRef(1);
  const swipe = useRef(null);
  const cbRef = useRef({ onIndexChange, onOrder, onReport });
  cbRef.current = { onIndexChange, onOrder, onReport };

  const dish = dishes[idx];

  // Rendu d'une frame : écrit uniquement les transformations des assiettes.
  const paint = (p) => {
    const arms = armRefs.current;
    for (let i = 0; i < n; i += 1) {
      const el = arms[i];
      if (!el) continue;
      const a = near(i - p, n);          // -n/2..n/2, 0 = assiette au centre
      const abs = Math.abs(a);
      if (abs > 1.6) { el.style.visibility = 'hidden'; continue; }
      const deg = a * SPACING;
      el.style.visibility = 'visible';
      el.style.opacity = String(Math.max(0, 1 - abs * 0.75));
      el.style.zIndex = String(10 - Math.round(abs * 4));
      el.style.transform = `rotate(${deg}deg)`;
      el.firstChild.style.transform = `rotate(${-deg * 0.55}deg) scale(${1 - Math.min(abs, 1) * 0.16})`;
    }
  };

  // Boucle d'animation unique : suivi exponentiel de la cible.
  // Légère avance sur l'orbite au montage : les assiettes glissent vers
  // leur place au lieu d'apparaître d'un coup (entrée, filtre par jour…).
  useLayoutEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduced) cur.current = start - 0.45;
    paint(cur.current);
    const tick = (_t, dt) => {
      const target = Math.min(n - 1, Math.max(0, base.current + scrollP.current + drag.current));
      const diff = target - cur.current;
      if (Math.abs(diff) < 0.0004) {
        if (diff === 0) return;
        cur.current = target;
      } else {
        // drag : quasi instantané (suit le doigt) ; sinon glissé amorti.
        const k = reduced ? 1 : 1 - Math.exp(-(dt / 1000) * (swipe.current?.active ? FOLLOW * 2.4 : FOLLOW));
        cur.current += diff * k;
      }
      paint(cur.current);
      const i = wrap(Math.round(cur.current), n);
      if (i !== idxRef.current) {
        dirRef.current = near(i - idxRef.current, n) >= 0 ? 1 : -1;
        idxRef.current = i;
        setIdx(i);
        setTab('overview');
        setVote(0);
      }
    };
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  // Transition courte et interruptible du titre et de la carte.
  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const d = dirRef.current;
    const lines = headRef.current ? headRef.current.querySelectorAll('.dsh-li') : [];
    const tl = gsap.timeline();
    tl.fromTo(lines, { yPercent: 105 * d }, { yPercent: 0, duration: 0.42, stagger: 0.035, ease: 'expo.out', overwrite: true }, 0);
    tl.fromTo(cardRef.current, { autoAlpha: 0.25, y: 10 * d }, { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out', overwrite: true }, 0.02);
    return () => tl.progress(1).kill();
  }, [idx]);

  // Mode « gesture » : la molette fait défiler les plats, puis calage
  // élastique sur le plat le plus proche quand la molette s'arrête.
  useEffect(() => {
    if (drive !== 'gesture') return undefined;
    const el = rootRef.current;
    if (!el) return undefined;
    const snap = () => {
      const t = base.current + scrollP.current + drag.current;
      base.current += Math.round(t) - t;
      scrollP.current = 0;
    };
    const onWheel = (e) => {
      e.preventDefault();
      scrollP.current += e.deltaY / 480;
      clearTimeout(snapT.current);
      snapT.current = setTimeout(snap, 130);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => { el.removeEventListener('wheel', onWheel); clearTimeout(snapT.current); };
  }, [drive]);

  // Scroll : progression continue + calage sur le plat le plus proche.
  useEffect(() => {
    if (drive !== 'scroll') return undefined;
    const el = trackRef.current;
    if (!el || n < 2) return undefined;
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate(self) { scrollP.current = self.progress * n; },
      snap: {
        snapTo: 1 / n,
        duration: { min: 0.18, max: 0.45 },
        delay: 0.04,
        ease: 'power2.out',
        inertia: false,
      },
    });
    scrollP.current = st.progress * n;
    return () => st.kill();
  }, [n]);

  useEffect(() => { cbRef.current.onIndexChange?.(idx); }, [idx]);

  // Navigation discrète (flèches, pastilles, clavier) : décale la cible.
  const step = (delta) => { base.current += delta; };
  const goTo = (i) => step(near(i - idxRef.current, n));

  // Glisser continu sur toute la scène (horizontal ; sur l'assiette le
  // vertical est accepté aussi). Inertie projetée au relâchement.
  const onDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    swipe.current = {
      x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY,
      lt: performance.now(), v: 0, active: false, axis: null, id: e.pointerId,
      plate: !!e.target?.closest?.('.dsh-plates'),
    };
  };
  const onMove = (e) => {
    const s = swipe.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (!s.active) {
      const ax = Math.abs(dx);
      const ay = Math.abs(dy);
      // Sur l'assiette : geste dans n'importe quel axe ; ailleurs (carte,
      // titre, boutons) : uniquement horizontal franc pour ne pas voler le
      // scroll vertical de la carte ni les clics.
      if (s.plate ? Math.max(ax, ay) < 6 : (ax < 6 || ax < ay)) return;
      s.axis = s.plate && ay > ax ? 'y' : 'x';
      s.active = true;
      setDragging(true);
      canvasRef.current?.setPointerCapture?.(s.id);
    }
    e.preventDefault();
    const now = performance.now();
    const w = platesRef.current?.offsetWidth || 220;
    const raw = s.axis === 'x' ? e.clientX - s.lx : e.clientY - s.ly;
    s.v = 0.7 * s.v + 0.3 * (raw / Math.max(1, now - s.lt)) / w; // plats/ms
    s.lx = e.clientX;
    s.ly = e.clientY;
    s.lt = now;
    drag.current = -(s.axis === 'x' ? dx : dy) / (w * 0.9);
  };
  const onUp = () => {
    const s = swipe.current;
    swipe.current = null;
    if (!s?.active) return;
    setDragging(false);
    const projected = drag.current - s.v * 160;           // inertie du geste
    const delta = Math.abs(projected) < 0.18 ? 0 : Math.sign(projected) * Math.max(1, Math.round(Math.abs(projected)));
    base.current += delta;
    drag.current = 0;
  };

  const onKey = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
  };

  const warnText = dish.allergen || dish.warn;
  const likes = dish.likes + (vote === 1 ? 1 : 0);
  const dislikes = (dish.dislikes || 0) + (vote === -1 ? 1 : 0);
  const total = dish.priceXof || 0;

  return (
    <div ref={trackRef} className="dsh-trk" style={{ height: drive === 'gesture' ? height : `calc((${height}) * ${1 + n * PER_DISH})` }}>
      <section
        ref={rootRef}
        className="dsh-root"
        style={{ height, '--dsh-accent': dish.accent }}
        tabIndex={0}
        role="region"
        aria-roledescription="carrousel"
        aria-label="Plats de la semaine"
        onKeyDown={onKey}
      >
        <style>{CSS}</style>
        <span className="dsh-arc" aria-hidden="true" />
        <div
          ref={canvasRef}
          className="dsh-canvas"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={onUp}
        >
          <div
            ref={platesRef}
            className={`dsh-plates${dragging ? ' drag' : ''}${drive === 'gesture' ? ' gest' : ''}`}
          >
            <span className="dsh-ring" aria-hidden="true" />
            {dishes.map((d, i) => (
              <div key={d.key || i} className="dsh-arm" ref={(el) => { armRefs.current[i] = el; }} aria-hidden={i !== idx}>
                <div><DishPlate dish={d} /></div>
              </div>
            ))}
          </div>
          <button type="button" className="dsh-nav dsh-prev" aria-label="Plat précédent" onClick={() => step(-1)}><Icon name="chevronLeft" /></button>
          <button type="button" className="dsh-nav dsh-next" aria-label="Plat suivant" onClick={() => step(1)}><Icon name="chevronRight" /></button>

          <header className="dsh-head" ref={headRef} aria-live="polite">
            <p className="dsh-eyebrow"><span className="dsh-eb dsh-li">{dish.eyebrow}</span></p>
            <h2 className="dsh-hd">
              <span className="dsh-l"><span className="dsh-t1 dsh-li">{dish.title}</span></span>
              <span className="dsh-l"><span className="dsh-t2 dsh-li">{dish.subtitle}</span></span>
            </h2>
          </header>

          <div className="dsh-acts">
            <button type="button" className="dsh-abtn flag" aria-label="Signaler le plat" title="Signaler" onClick={() => cbRef.current.onReport?.(dish, idx)}>
              <Icon name="flag" />
            </button>
            {dish.allergen ? (
              <span className="dsh-off">{I_LOCK}<span>Indisponible</span></span>
            ) : (
              <button type="button" className="dsh-abtn main" onClick={() => cbRef.current.onOrder?.(dish, idx)}>
                <span>Réserver</span><b className="dsh-price">{fmt(total)}</b>
              </button>
            )}
          </div>

          <div className="dsh-card">
            <div className="dsh-card-in" ref={cardRef}>
              <div className="dsh-rate">
                <span className="dsh-num">{dish.rating}</span>
                <span className="dsh-cap">/5</span>
                <span className="dsh-stars">{I_STAR}</span>
                <div className="dsh-badge"><b>{dish.chef}</b><small>{dish.kitchen}</small></div>
                <span className="dsh-likes">{I_HEART}<span className="num">{likes}</span></span>
              </div>

              {warnText && (
                <p className={`dsh-warn${dish.allergen ? ' block' : ''}`}>
                  <Icon name="alert" /><span>{warnText}</span>
                </p>
              )}

              <div className="dsh-tabs" role="tablist" aria-label="Détails du plat">
                <button type="button" role="tab" aria-selected={tab === 'overview'} className={tab === 'overview' ? 'on' : ''} onClick={() => setTab('overview')}>Aperçu</button>
                <button type="button" role="tab" aria-selected={tab === 'ingredients'} className={tab === 'ingredients' ? 'on' : ''} onClick={() => setTab('ingredients')}>Ingrédients</button>
              </div>

              <div className="dsh-body">
                {tab === 'overview' && <p className="dsh-desc">{dish.description}</p>}
                {tab === 'ingredients' && (
                  <div className="dsh-ings">{dish.ingredients.map((ing) => <span key={ing} className="dsh-ing">{ing}</span>)}</div>
                )}
              </div>

              <div className="dsh-react">
                <span className="dsh-rcount">{I_HEART}<span className="num">{likes} · {dislikes}</span><span>avis</span></span>
                <span className="dsh-votes">
                  <button type="button" className={`dsh-vbtn${vote === 1 ? ' on' : ''}`} aria-label="J'aime" aria-pressed={vote === 1} onClick={() => setVote(vote === 1 ? 0 : 1)}>{I_LIKE}</button>
                  <button type="button" className={`dsh-vbtn${vote === -1 ? ' on' : ''}`} aria-label="Je n'aime pas" aria-pressed={vote === -1} onClick={() => setVote(vote === -1 ? 0 : -1)}>{I_DISLIKE}</button>
                </span>
              </div>
            </div>
          </div>

          <nav className="dsh-pager" aria-label="Choisir un plat">
            {dishes.map((d, i) => (
              <button
                key={d.key || i}
                type="button"
                className={`dsh-dot${i === idx ? ' on' : ''}`}
                aria-label={d.label}
                aria-current={i === idx ? 'true' : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </nav>

          <div className="dsh-strip">
            {dishes.map((d, i) => (
              <button key={d.key || i} type="button" className={`dsh-tn${i === idx ? ' on' : ''}`} aria-label={d.label} onClick={() => goTo(i)}>
                <DishPlate dish={d} />
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
