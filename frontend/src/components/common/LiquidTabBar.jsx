import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';

/*
 * Barre d'onglets inférieure « liquide » (version web/React de l'animation) :
 * l'onglet actif sort de la barre dans une bulle, et une encoche liquide
 * glisse d'un onglet à l'autre avec plongée, ressort amorti et sillage.
 *
 * Toute la physique est dans computeFrame(t, anim, ctx), fonction pure qui
 * renvoie l'état complet d'une frame. Une interruption repart de la frame
 * courante (position, vitesse, taille de la bulle, forme) sans aucun saut.
 *
 * API : items [{ icon, label, to?, end?, onSelect? }], index?, onChange?,
 *       colors?, config?. Compatible drop-in avec l'ancien TabBar.
 */

const DEFAULT_CONFIG = {
  barHeight: 62,        // hauteur standard d'une barre d'onglets mobile (~60 px)
  topPad: 12,           // marge au-dessus du bord plat pour la bosse du sillage
  bubbleRadius: 22,
  bubbleLift: 4,        // centre de la bulle 4 px au-dessus du bord de la barre
  ring: 4,              // anneau de fond visible entre bulle et encoche
  diveMs: 180,          // plongée de la bulle
  slideStartMs: 90,     // début du glissement du creux
  exitStartMs: 300,     // début de la sortie de la bulle
  exitMs: 360,          // durée de la sortie (~660 ms au total)
  springZeta: 0.62,     // amortissement du ressort (plus rebondissant)
  springOmega: 13.2,    // rad/s -> glisse plus ample puis retour doux
  relaxDelayMs: 40,     // l'encoche garde sa forme puis se relâche
  relaxMs: 240,
  minDepth: 0.45,       // profondeur du creux relâché (x profondeur de repos)
  relaxWiden: 1.42,     // élargissement du creux relâché
  velStretch: 0.38,     // étirement du creux par px/ms de vitesse
  velFlatten: 0.26,     // aplatissement du creux par px/ms
  maxStretch: 0.85,
  minFlatten: 0.22,
  vRef: 0.9,            // vitesse (px/ms) à laquelle le sillage est maximal
  wakeBump: 9,          // bosse vers le haut derrière le creux
  wakeDip: 7,           // vaguelette vers le bas derrière la bosse
  wakeDist1: 44,
  wakeDist2: 84,
  wakeSigma1: 15,
  wakeSigma2: 21,
  iconPush: 0.38,       // icônes inactives poussées quand la vague passe
  maxIconPush: 5,
  iconFadeDelayMs: 30,  // réapparition en fondu de l'icône de l'ancien onglet
  iconFadeMs: 220,
  blendMs: 140,         // reprise douce après interruption
  diveY: 12,            // position de la bulle fondue dans la barre
  minBubbleScale: 0.55,
  shoulder: 30,         // longueur du raccord Hermite des épaules de l'encoche
  arcAngle: 45,         // angle de raccord arc de cercle -> Hermite (degrés)
  overshoot: 1.18,      // easeOutBack ~5 % de dépassement
  nearSpan: 150,        // zone échantillonnée à 1 px autour du creux + sillage
  stepNear: 1,
  stepFar: 3,
};

// Palette Vatel : verre dépoli translucide, icône active marine,
// inactifs gris de la maquette. L'anneau laisse voir le fond flouté.
const DEFAULT_COLORS = {
  bar: 'rgba(255, 255, 255, 0.78)',
  rim: 'rgba(255, 255, 255, 0.65)',   // liseré lumineux sur le bord supérieur
  icon: '#5C5C5C',
  iconActive: '#072A5D',
  text: '#5C5C5C',
  textActive: '#072A5D',
  bubble: 'linear-gradient(160deg, rgba(255,255,255,0.97), rgba(255,255,255,0.82))',
  bubbleIcon: '#072A5D',
};

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const easeInCubic = (t) => t * t * t;
const easeOutBack = (t, c) => {
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const gauss = (u) => Math.exp(-u * u);

// Encoche de repos : arc de cercle au fond (rayon bulle + anneau, centre
// confondu avec la bulle) + raccord Hermite cubique jusqu'au bord plat (C1).
function makeNotch(cfg) {
  const R = cfg.bubbleRadius + cfg.ring;
  const depth = cfg.bubbleRadius - cfg.bubbleLift + cfg.ring;
  const cy = depth - R;
  const th = (cfg.arcAngle * Math.PI) / 180;
  const halfArc = R * Math.sin(th);
  const yArc = cy + R * Math.cos(th);
  const mArc = -Math.tan(th); // dy/d|u| au point de raccord
  const W = cfg.shoulder;
  const half = halfArc + W;
  return (u) => {
    const a = Math.abs(u);
    if (a >= half) return 0;
    if (a <= halfArc) return cy + Math.sqrt(R * R - a * a);
    const t = (a - halfArc) / W;
    const h00 = 2 * t * t * t - 3 * t * t + 1;
    const h10 = t * t * t - 2 * t * t + t;
    return h00 * yArc + h10 * W * mArc;
  };
}

// Ressort amorti sous-critique : position et vitesse analytiques.
// v0 et v en px/ms, t en secondes.
function springAt(t, x0, v0, target, zeta, omega) {
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const A = x0 - target;
  const B = (v0 * 1000 + zeta * omega * A) / wd;
  const e = Math.exp(-zeta * omega * t);
  const cos = Math.cos(wd * t);
  const sin = Math.sin(wd * t);
  return {
    x: target + e * (A * cos + B * sin),
    v: (e * ((B * wd - A * zeta * omega) * cos - (A * wd + B * zeta * omega) * sin)) / 1000,
  };
}

// Fonction pure : état complet d'une frame à l'instant tMs.
// anim = { t0, from, target, cx0, v0, bubble0:{y,s,icon}, shape0:{d,k}, iconOp0[] }
function computeFrame(tMs, anim, ctx) {
  const { cfg, notch, tabXs, width } = ctx;
  const xT = tabXs[anim.target];

  // Phase 2 — le creux glisse vers la cible (ressort amorti). Départ différé
  // si la bulle doit d'abord plonger ; immédiat si elle était déjà en vol.
  const diving = anim.bubble0.s > cfg.minBubbleScale + 0.05;
  const slideDelay = diving ? cfg.slideStartMs : 0;
  let cx = anim.cx0;
  let v = anim.v0;
  if (tMs > slideDelay) {
    ({ x: cx, v } = springAt((tMs - slideDelay) / 1000, anim.cx0, anim.v0, xT, cfg.springZeta, cfg.springOmega));
  }

  // Reprise douce après interruption (état capturé -> trajectoire courante)
  const blend = smooth(clamp(tMs / cfg.blendMs, 0, 1));

  // Forme du creux : encoche -> creux relâché plus large et plus doux -> encoche
  const relax = smooth(clamp((tMs - cfg.relaxDelayMs) / cfg.relaxMs, 0, 1));
  const tighten = smooth(clamp((tMs - cfg.exitStartMs) / cfg.exitMs, 0, 1));
  const depth = lerp(anim.shape0.d, lerp(lerp(1, cfg.minDepth, relax), 1, tighten), blend)
    * Math.max(1 - cfg.velFlatten * Math.abs(v), cfg.minFlatten);
  const widen = lerp(anim.shape0.k, lerp(lerp(1, cfg.relaxWiden, relax), 1, tighten), blend)
    * (1 + Math.min(cfg.velStretch * Math.abs(v), cfg.maxStretch));

  // Sillage : petite bosse vers le haut puis vaguelette vers le bas,
  // derrière le creux, naissant et s'éteignant avec la vitesse.
  const dir = Math.sign(v || xT - cx || 1);
  const wAmp = clamp(Math.abs(v) / cfg.vRef, 0, 1);
  const edge = (x) => {
    let y = depth * notch((x - cx) / widen);
    if (wAmp > 0.001) {
      y -= wAmp * cfg.wakeBump * gauss((x - cx + dir * cfg.wakeDist1) / cfg.wakeSigma1);
      y += wAmp * cfg.wakeDip * gauss((x - cx + dir * cfg.wakeDist2) / cfg.wakeSigma2);
    }
    return y;
  };

  // Phases 1 et 3 — la bulle plonge en rétrécissant (blanc sur blanc) puis
  // ressort du fond du creux en grossissant avec un léger dépassement.
  const p = clamp(tMs / cfg.diveMs, 0, 1);
  const q = clamp((tMs - cfg.exitStartMs) / cfg.exitMs, 0, 1);
  let bs;
  let by;
  let iconOld;
  let iconNew;
  if (q <= 0) {
    if (diving) {
      const e = easeInCubic(p);
      bs = lerp(anim.bubble0.s, cfg.minBubbleScale, e);
      by = lerp(anim.bubble0.y, cfg.diveY, e);
    } else {
      bs = cfg.minBubbleScale;
      by = cfg.diveY;
    }
    iconOld = anim.bubble0.icon * (1 - smooth(clamp(p * 1.4, 0, 1)));
    iconNew = 0;
  } else {
    const o = easeOutBack(q, cfg.overshoot);
    bs = cfg.minBubbleScale + (1 - cfg.minBubbleScale) * o;
    by = cfg.diveY + (-cfg.bubbleLift - cfg.diveY) * o;
    iconOld = 0;
    iconNew = smooth(clamp((q - 0.35) / 0.65, 0, 1));
  }

  // Léger étirement de la bulle dans le sens du mouvement (gelée liquide)
  const jelly = clamp(Math.abs(v) * 0.16, 0, 0.12);
  const sx = bs * (1 + jelly);
  const sy = bs * (1 - jelly * 0.6);

  // Icônes des onglets : l'ancienne réapparaît en fondu, la nouvelle disparaît
  // sous la bulle, les inactives sont poussées quand la vague passe.
  const retFade = smooth(clamp((tMs - slideDelay - cfg.iconFadeDelayMs) / cfg.iconFadeMs, 0, 1));
  const icons = tabXs.map((x, i) => {
    const target = i === anim.target ? 1 - iconNew : i === anim.from ? retFade : 1;
    return {
      opacity: lerp(anim.iconOp0[i] ?? target, target, blend),
      dy: clamp(cfg.iconPush * edge(x), 0, cfg.maxIconPush),
    };
  });

  // Bord supérieur de la barre échantillonné : 1 px autour du creux, 3 px ailleurs.
  const near = Math.abs(v) > 0.01 ? cfg.nearSpan : 110;
  const pts = [];
  let x = 0;
  while (x < width) {
    pts.push(x, edge(x));
    x = Math.min(x + (Math.abs(x - cx) < near ? cfg.stepNear : cfg.stepFar), width);
  }
  pts.push(width, edge(width));

  return { cx, v, depth, widen, edge, pts, bubble: { x: cx, y: by, s: bs, sx, sy }, iconOld, iconNew, icons };
}

function buildPath(pts, y0, w, h) {
  let d = `M 0 ${(y0 + pts[1]).toFixed(2)}`;
  for (let i = 2; i < pts.length; i += 2) {
    d += ` L ${pts[i].toFixed(1)} ${(y0 + pts[i + 1]).toFixed(2)}`;
  }
  return `${d} L ${w} ${h} L 0 ${h} Z`;
}

// Polyligne ouverte du bord supérieur : sert de liseré lumineux.
function buildLine(pts, y0) {
  let d = `M 0 ${(y0 + pts[1] - 0.5).toFixed(2)}`;
  for (let i = 2; i < pts.length; i += 2) {
    d += ` L ${pts[i].toFixed(1)} ${(y0 + pts[i + 1] - 0.5).toFixed(2)}`;
  }
  return d;
}

export default function LiquidTabBar({ items, index, onChange, colors, config }) {
  const cfg = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config]);
  const col = useMemo(() => ({ ...DEFAULT_COLORS, ...colors }), [colors]);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const rootRef = useRef(null);
  const pathRef = useRef(null);
  const rimRef = useRef(null);
  const bubbleRef = useRef(null);
  const iconOldRef = useRef(null);
  const iconNewRef = useRef(null);
  const tabRefs = useRef([]);
  const frameRef = useRef(null);
  const animRef = useRef(null);
  const rafRef = useRef(0);
  const ctxRef = useRef(null);
  const dispRef = useRef({ target: -1, from: -1 });

  const [width, setWidth] = useState(0);
  const [manual, setManual] = useState(null); // { i, path } pour les onglets sans route
  const [disp, setDisp] = useState({ target: -1, from: -1 }); // pilote les icônes de la bulle

  const n = items.length;
  const tabXs = useMemo(() => Array.from({ length: n }, (_, i) => ((i + 0.5) * width) / n), [width, n]);
  const notch = useMemo(() => makeNotch(cfg), [cfg]);
  const H = cfg.topPad + cfg.barHeight;
  const R = cfg.bubbleRadius;
  ctxRef.current = { cfg, notch, tabXs, width };

  const routeIndex = items.findIndex(
    (it) => it.to && (it.end ? pathname === it.to : pathname === it.to || pathname.startsWith(`${it.to}/`)),
  );
  const activeIndex =
    index ?? (manual && manual.path === pathname ? manual.i : routeIndex >= 0 ? routeIndex : 0);

  const restAnim = (i) => ({
    target: i,
    from: -1,
    cx0: tabXs[i],
    v0: 0,
    bubble0: { y: -cfg.bubbleLift, s: 1, icon: 1 },
    shape0: { d: 1, k: 1 },
    iconOp0: [],
  });

  // Écrit l'état d'une frame directement dans le DOM (60 fps, sans re-render).
  const apply = (f) => {
    const { cfg: c } = ctxRef.current;
    if (pathRef.current) pathRef.current.setAttribute('d', buildPath(f.pts, c.topPad, width, H));
    if (rimRef.current) rimRef.current.setAttribute('d', buildLine(f.pts, c.topPad));
    if (bubbleRef.current) {
      bubbleRef.current.style.transform =
        `translate(${f.bubble.x}px, ${c.topPad + f.bubble.y}px) translate(-50%, -50%) scale(${f.bubble.sx}, ${f.bubble.sy})`;
    }
    if (iconOldRef.current) iconOldRef.current.style.opacity = f.iconOld;
    if (iconNewRef.current) iconNewRef.current.style.opacity = f.iconNew;
    f.icons.forEach((ic, i) => {
      const el = tabRefs.current[i];
      if (el) {
        el.style.opacity = ic.opacity;
        el.style.transform = ic.dy ? `translateY(${ic.dy.toFixed(2)}px)` : '';
      }
    });
  };

  const tick = (now) => {
    const anim = animRef.current;
    const ctx = ctxRef.current;
    if (!anim || ctx.width <= 0) return;
    const t = now - anim.t0;
    const f = computeFrame(t, anim, ctx);
    frameRef.current = f;
    apply(f);
    const done =
      t > cfg.exitStartMs + cfg.exitMs &&
      Math.abs(f.cx - ctx.tabXs[anim.target]) < 0.4 &&
      Math.abs(f.v) < 0.01;
    if (done || t > 2000) {
      animRef.current = null;
      dispRef.current = { target: anim.target, from: -1 };
      setDisp({ target: anim.target, from: -1 });
      const rest = computeFrame(1e6, { ...restAnim(anim.target) }, ctx);
      frameRef.current = rest;
      apply(rest);
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  useLayoutEffect(() => {
    if (width <= 0) return;
    const d = dispRef.current;
    const ctx = ctxRef.current;
    // Premier rendu, retap sur l'onglet courant ou redimensionnement : état de repos.
    if (d.target === -1 || (d.target === activeIndex && !animRef.current)) {
      d.target = activeIndex;
      d.from = -1;
      setDisp({ target: activeIndex, from: -1 });
      const f = computeFrame(1e6, restAnim(activeIndex), ctx);
      frameRef.current = f;
      apply(f);
      return;
    }
    if (d.target === activeIndex) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      d.target = activeIndex;
      d.from = -1;
      setDisp({ target: activeIndex, from: -1 });
      const f = computeFrame(1e6, restAnim(activeIndex), ctx);
      frameRef.current = f;
      apply(f);
      return;
    }
    // Nouvelle animation : repart de la frame courante, sans saut.
    const cur = frameRef.current;
    const prevTarget = d.target;
    animRef.current = {
      t0: performance.now(),
      from: prevTarget,
      target: activeIndex,
      cx0: cur ? cur.cx : tabXs[prevTarget],
      v0: cur ? cur.v : 0,
      bubble0: cur
        ? {
            y: cur.bubble.y,
            s: cur.bubble.s,
            icon: cur.bubble.s > cfg.minBubbleScale + 0.05 ? Math.max(cur.iconOld, cur.iconNew) : 0,
          }
        : { y: -cfg.bubbleLift, s: 1, icon: 1 },
      shape0: cur ? { d: cur.depth, k: cur.widen } : { d: 1, k: 1 },
      iconOp0: cur ? cur.icons.map((ic) => ic.opacity) : tabXs.map((_, i) => (i === prevTarget ? 0 : 1)),
    };
    d.target = activeIndex;
    d.from = prevTarget;
    setDisp({ target: activeIndex, from: prevTarget });
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, width]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const select = (i) => {
    onChange?.(i);
    const it = items[i];
    it?.onSelect?.();
    if (it?.to) navigate(it.to);
    else if (index === undefined) setManual({ i, path: pathname });
  };

  return (
    <nav
      ref={rootRef}
      aria-label="Navigation"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 0,
        width: '100%',
        maxWidth: 390,
        height: H,
        zIndex: 10,
        pointerEvents: 'none',
        backdropFilter: 'blur(14px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(14px) saturate(1.5)',
      }}
    >
      <svg
        width={width}
        height={H}
        viewBox={`0 0 ${width} ${H}`}
        style={{ position: 'absolute', inset: 0, display: 'block', overflow: 'visible' }}
        aria-hidden="true"
      >
        <path ref={pathRef} fill={col.bar} />
        <path ref={rimRef} fill="none" stroke={col.rim} strokeWidth={1.2} />
      </svg>

      <div
        ref={bubbleRef}
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: R * 2,
          height: R * 2,
          borderRadius: R,
          background: col.bubble,
          boxShadow: '0 10px 24px rgba(4, 27, 61, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(6px)',
          WebkitBackdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          willChange: 'transform',
        }}
      >
        {disp.from >= 0 && (
          <span ref={iconOldRef} style={{ position: 'absolute', color: col.bubbleIcon, display: 'flex' }}>
            <Icon name={items[disp.from].icon} sw={2} size={20} />
          </span>
        )}
        {disp.target >= 0 && (
          <span ref={iconNewRef} style={{ color: col.bubbleIcon, display: 'flex' }}>
            <Icon name={items[disp.target].icon} sw={2} size={20} />
          </span>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: cfg.topPad,
          bottom: 0,
          display: 'flex',
        }}
      >
        {items.map((it, i) => (
          <button
            key={it.label}
            type="button"
            aria-label={it.label}
            aria-selected={i === activeIndex}
            onClick={() => select(i)}
            style={{
              flex: 1,
              border: 0,
              background: 'transparent',
              padding: '9px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              cursor: 'pointer',
              fontFamily: 'inherit',
              pointerEvents: 'auto',
            }}
          >
            <span
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              style={{ color: i === activeIndex ? col.iconActive : col.icon, display: 'flex', willChange: 'transform, opacity' }}
            >
              <Icon name={it.icon} sw={2} size={22} />
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                lineHeight: '14px',
                color: i === activeIndex ? col.textActive : col.text,
                transition: 'color 0.25s',
              }}
            >
              {it.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
