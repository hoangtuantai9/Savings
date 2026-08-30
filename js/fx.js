// Movement, and the words struck across the window.
//
// Everything here animates transform and opacity only, so the compositor carries it and nothing
// touches layout mid-flight. The timings that do real work are exact and stay that way: the 1.8 s
// burst, the five-flick shiver, the 620 ms elastic settle.

import { SVG, el, outline, alpha, star, boxGeom } from './gem.js';

export const EASE_OUT = 'cubic-bezier(0.22, 0.61, 0.36, 1)';
export const EASE_IN = 'cubic-bezier(0.55, 0.06, 0.68, 0.19)';
const EASE_SOFT = 'cubic-bezier(0.45, 0, 0.55, 1)';
/** Overshoots and settles — something arriving under its own steam rather than being placed. */
const EASE_BACK = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');

/** One-shot Web Animations helper that cleans up after itself. */
export function animate(node, frames, options) {
  if (!node) return null;
  const opts = typeof options === 'number' ? { duration: options } : { ...options };
  if (reduced.matches) opts.duration = Math.min(opts.duration ?? 0, 1);
  opts.easing ??= EASE_OUT;
  opts.fill ??= 'both';
  const a = node.animate(frames, opts);
  a.finished.then(() => { try { a.commitStyles(); a.cancel(); } catch { /* detached */ } }, () => {});
  return a;
}

export const after = (ms, fn) => setTimeout(fn, Math.max(1, ms));

/** A promise that settles when the animation does — for sequencing without callback nests. */
export const done = a => (a ? a.finished.catch(() => {}) : Promise.resolve());

/**
 * A gem shivering on the spot: `shakes` flicks left and right, then still again. Counted rather
 * than looped on purpose — this is the announcement that a lock has run out, and an announcement
 * that never stops would just be another idle. Each flick is smaller than the one before, and the
 * last frame is a hard zero, so the stone always ends exactly where it started.
 */
export function shiver(node, amplitude = 7, shakes = 5, msEach = 130) {
  const frames = [{ transform: 'translateX(0)' }];
  for (let i = 0; i < shakes; i++) {
    const swing = amplitude * Math.pow(0.86, i);
    frames.push({ transform: `translateX(${swing}px)` }, { transform: `translateX(${-swing}px)` });
  }
  frames.push({ transform: 'translateX(0)' });
  return animate(node, frames, { duration: msEach * shakes, easing: EASE_SOFT });
}

/** Elastic bounce, used when something unlocks or lands. */
export function bounce(node, peak = 1.07, ms = 620) {
  return animate(node, [
    { transform: 'scale(1)', offset: 0 },
    { transform: `scale(${peak})`, offset: 0.35 },
    { transform: `scale(${1 + (peak - 1) * 0.28})`, offset: 0.58 },
    { transform: `scale(${1 - (peak - 1) * 0.14})`, offset: 0.78 },
    { transform: 'scale(1)', offset: 1 }
  ], { duration: ms, easing: EASE_SOFT });
}

/**
 * Slides a node from `dx` back to where it sits, leaving nothing behind on it. This is what the
 * menu cards do when the box arrives between them — and they have a hover state of their own, so an
 * animation that committed its last frame would overwrite that for good.
 */
export function slideFrom(node, dx, ms = 540) {
  if (!node || reduced.matches || Math.abs(dx) < 0.5) return null;
  return node.animate(
    [{ transform: `translateX(${dx}px)` }, { transform: 'translateX(0)' }],
    { duration: ms, easing: EASE_OUT }
  );
}

/**
 * The box arriving: it springs in past its size and settles, the way something that was not there a
 * moment ago ought to.
 */
export function arrive(node) {
  return animate(node, [
    { opacity: 0, transform: 'scale(0.34) translateY(26px)' },
    { opacity: 1, transform: 'scale(1) translateY(0)' }
  ], { duration: 620, easing: EASE_BACK });
}

/**
 * Stars thrown out of the middle of the box. `up` fans them upward out of an opened lid instead of
 * scattering them in a circle, and gives them a little weight on the way down.
 */
export function boxSparks(svg, n = 12, distance = 92, up = false) {
  if (reduced.matches) return;
  const host = el('g', {}, svg);
  const from = up ? boxGeom.cy - 30 : boxGeom.cy;
  for (let i = 0; i < n; i++) {
    const angle = up
      ? -Math.PI / 2 + (i / Math.max(1, n - 1) - 0.5) * 2.1
      : (i / n) * Math.PI * 2 + Math.random() * 0.5;
    const d = distance * (0.65 + Math.random() * 0.5);
    const node = star(boxGeom.cx, from, 3.5 + Math.random() * 5);
    node.setAttribute('class', 'box-burst-star');
    host.appendChild(node);
    animate(node, [
      { opacity: 0, transform: 'translate(0px, 0px) scale(0.2) rotate(0deg)' },
      {
        opacity: 1, offset: 0.32,
        transform: `translate(${Math.cos(angle) * d * 0.45}px, ${Math.sin(angle) * d * 0.45}px) scale(1.15) rotate(60deg)`
      },
      {
        opacity: 0,
        transform: `translate(${Math.cos(angle) * d}px, ${Math.sin(angle) * d + (up ? 26 : 0)}px) scale(0.25) rotate(140deg)`
      }
    ], { duration: 820 + Math.random() * 520, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
  }
  const ring = el('path', {
    class: 'box-burst-ring', d: boxGeom.outlinePath, fill: 'none', stroke: '#ffd76a', 'stroke-width': 3
  }, host);
  animate(ring, [
    { opacity: 0.9, transform: 'scale(0.7)' },
    { opacity: 0, transform: 'scale(2.4)' }
  ], { duration: 900, easing: EASE_OUT });
  after(1500, () => host.remove());
}

/**
 * Puts the lid back where it belongs.
 *
 * openLid() finishes with the lid held open, and animate() commits its last frame as an inline
 * style on the way out — which is the point, or the lid would snap shut halfway through the
 * reveal. But the box's screen builds its drawing once and shows the same one every time, so that
 * inline transform outlived the moment it was for: the next box you opened was already open.
 *
 * Anything that shows the box has to shut it first. There is no state to consult — a closed lid is
 * simply the absence of a transform, and cancelling first stops a reveal that is still running from
 * committing itself over the top a moment later.
 */
export function closeLid(box) {
  const lid = box?.lid?.wrap;
  if (!lid) return;
  for (const a of lid.getAnimations?.() ?? []) a.cancel();
  lid.style.transform = '';
}

/** The lid comes off, and what was inside comes out of the opening. */
export function openLid(box) {
  animate(box.lid.wrap, [
    { transform: 'translate(0px, 0px) rotate(0deg)' },
    { transform: 'translate(4px, -34px) rotate(-11deg)' }
  ], { duration: 560, easing: EASE_BACK, fill: 'forwards' });
  after(180, () => boxSparks(box.svg, 11, 84, true));
}

/**
 * One shockwave: a diamond ring growing outward as it fades. Every burst in the app is a few of
 * these, staggered. `dir` of -1 falls inward instead — the shape a step being taken back makes.
 */
export function ring(host, colour, { size = 60, to = 3.4, ms = 900, delay = 0, dir = 1 } = {}) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'burst-ring');
  svg.setAttribute('viewBox', '0 0 100 100');
  el('path', {
    d: outline(50, 50, 34, 44), fill: 'none', stroke: colour,
    'stroke-width': 3, 'stroke-linejoin': 'round'
  }, svg);
  svg.style.width = svg.style.height = `${size}px`;
  host.appendChild(svg);

  const from = dir > 0 ? 0.35 : to;
  const end = dir > 0 ? to : 0.3;
  const a = animate(svg, [
    { opacity: 0.85, transform: `translate(-50%, -50%) scale(${from})` },
    { opacity: 0, transform: `translate(-50%, -50%) scale(${end})` }
  ], { duration: ms, delay, easing: EASE_OUT });
  done(a).then(() => svg.remove());
  return a;
}

/**
 * Diamonds thrown out from the middle. `dir` of -1 pulls them back in instead, which is what a
 * cross looks like: the step returning to the ladder it came off.
 */
export function shards(host, colour, { n = 5, distance = 120, ms = 1000, dir = 1 } = {}) {
  for (let i = 0; i < n; i++) {
    const angle = (-90 + (360 / n) * i + (dir > 0 ? 0 : 24)) * Math.PI / 180;
    const far = distance * (0.72 + (i % 3) * 0.19);
    const x = Math.cos(angle) * far, y = Math.sin(angle) * far;

    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'burst-shard');
    svg.setAttribute('viewBox', '0 0 100 100');
    el('path', { d: outline(50, 50, 26, 40), fill: colour }, svg);
    host.appendChild(svg);

    const spin = dir > 0 ? 160 : -160;
    const a = animate(svg, dir > 0
      ? [{ opacity: 1, transform: 'translate(-50%, -50%) scale(0.3) rotate(0deg)' },
         { opacity: 0.9, offset: 0.25 },
         { opacity: 0, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.9) rotate(${spin}deg)` }]
      : [{ opacity: 0, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(0.9) rotate(${spin}deg)` },
         { opacity: 0.9, offset: 0.4 },
         { opacity: 0, transform: 'translate(-50%, -50%) scale(0.2) rotate(0deg)' }],
      { duration: ms, delay: i * 34, easing: EASE_OUT });
    done(a).then(() => svg.remove());
  }
}

/** A shower of sparks, thrown wide. The cheap half of every celebration, and the half you see. */
export function sparks(host, colour, n = 26, spread = 190) {
  for (let i = 0; i < n; i++) {
    const angle = Math.random() * Math.PI * 2;
    const far = spread * (0.35 + Math.random() * 0.8);
    const x = Math.cos(angle) * far, y = Math.sin(angle) * far - 20;

    const dot = document.createElement('i');
    dot.className = 'spark';
    dot.style.background = colour;
    dot.style.boxShadow = `0 0 10px ${alpha(colour, 0.9)}`;
    const size = 3 + Math.random() * 4;
    dot.style.width = dot.style.height = `${size}px`;
    host.appendChild(dot);

    const a = animate(dot, [
      { opacity: 1, transform: 'translate(-50%, -50%) scale(1)' },
      { opacity: 0, transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + 70}px)) scale(0.2)` }
    ], { duration: 900 + Math.random() * 700, delay: Math.random() * 160, easing: EASE_OUT });
    done(a).then(() => dot.remove());
  }
}

/**
 * One word struck across the whole window: UNLOCKED when a wait has been survived, AGAIN when the
 * journey comes round. Flown in oversized and spread apart, snapping home in the tier's colour
 * with a shockwave and a shower of sparks. The word is all there is — no amount, no currency, no
 * step number.
 */
export function proclaim(word, colour, big = false) {
  const host = document.getElementById('cheer');
  host.innerHTML = '';
  host.hidden = false;
  host.style.setProperty('--accent', colour);

  const veil = document.createElement('div');
  veil.className = 'cheer-veil';
  host.appendChild(veil);

  const stage = document.createElement('div');
  stage.className = 'cheer-stage';
  host.appendChild(stage);

  const text = document.createElement('div');
  text.className = 'cheer-word';
  text.textContent = word;
  text.style.color = colour;
  text.style.textShadow = `0 0 38px ${alpha(colour, 0.75)}, 0 0 90px ${alpha(colour, 0.35)}`;
  stage.appendChild(text);

  const hold = big ? 2200 : 1500;
  animate(veil, [{ opacity: 0 }, { opacity: 1 }], { duration: 260 });
  animate(text, [
    { opacity: 0, letterSpacing: '0.9em', transform: 'scale(1.6)', filter: 'blur(14px)' },
    { opacity: 1, letterSpacing: '0.18em', transform: 'scale(1)', filter: 'blur(0)' }
  ], { duration: 620, easing: EASE_OUT });

  ring(stage, colour, { size: 150, to: 5.5, ms: 1100, delay: 180 });
  ring(stage, colour, { size: 150, to: 4.2, ms: 1000, delay: 320 });
  sparks(stage, colour, big ? 54 : 30, big ? 300 : 220);
  if (big) after(520, () => sparks(stage, colour, 40, 340));

  after(hold, async () => {
    await done(animate(host, [{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: EASE_IN }));
    host.hidden = true;
    host.innerHTML = '';
    host.style.opacity = '';
  });
  return hold + 420;
}

// ---- numbers ----------------------------------------------------------------------------------

/** mm:ss under an hour, h:mm:ss under a day, then "6d 23:59". */
export function clock(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor(total / 3600) % 24;
  const m = Math.floor(total / 60) % 60;
  const s = total % 60;
  const pad = n => String(n).padStart(2, '0');
  if (d > 0) return `${d}d ${pad(h)}:${pad(m)}`;
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export const money = (currency, v) => (currency === 'VND'
  ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v) + ' ₫'
  : '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v));

/**
 * Counts a number up from zero into a node. Eased out, so it arrives rather than stops — and it
 * lands on the exact figure, never on a rounding of the last frame.
 *
 * It steps rather than runs. At sixty frames a second a dollar figure is re-rendering its cents
 * sixty times, which does not read as counting at all — it reads as noise. Twenty-two steps is
 * fast enough to feel like a tally and slow enough that the eye can follow a digit.
 */
const COUNT_STEPS = 22;

export function countUp(node, currency, value, ms = 900) {
  if (reduced.matches) { node.textContent = money(currency, value); return; }
  const start = performance.now();
  let shown = -1;
  const tick = now => {
    const t = Math.min(1, (now - start) / ms);
    const step = Math.round(t * COUNT_STEPS);
    if (step !== shown) {
      shown = step;
      const eased = 1 - Math.pow(1 - step / COUNT_STEPS, 3);
      // Đồng has no decimals of its own, so counting one up must not invent them mid-flight.
      const at = step === COUNT_STEPS ? value : value * eased;
      node.textContent = money(currency, currency === 'VND' ? Math.round(at) : at);
    }
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
