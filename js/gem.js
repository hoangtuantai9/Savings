// The diamond the whole app is built on, and the colours it wears.
//
// Straight edges are kept sharp in the geometry so the perimeter maths stays exact — the rim
// traces the stone by dashing a precise fraction of that perimeter, which is what puts the head of
// a draining lock exactly where the time says it should be. Corners are softened with
// stroke-linejoin instead.

import { tierAt } from './plans.js';

export const SVG = 'http://www.w3.org/2000/svg';

export const el = (tag, attrs = {}, parent = null) => {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (parent) parent.appendChild(node);
  return node;
};

/** Closed diamond starting at the top vertex and running clockwise. */
export const outline = (cx, cy, w, h) =>
  `M ${cx} ${cy - h} L ${cx + w} ${cy} L ${cx} ${cy + h} L ${cx - w} ${cy} Z`;

/**
 * The narrow half of the diamond, drawn over the fill as a lighter panel so the stone reads as cut
 * glass rather than a flat lozenge. Same centre and height as the outline.
 */
const facet = (cx, cy, w, h) =>
  `M ${cx} ${cy - h} L ${cx + w * 0.42} ${cy} L ${cx} ${cy + h} L ${cx - w * 0.42} ${cy} Z`;

export const perimeter = (w, h) => 4 * Math.hypot(w, h);

/** Point `fraction` of the way clockwise from the top vertex. */
export function pointAt(cx, cy, w, h, fraction) {
  const f = Math.min(0.99999, Math.max(0, fraction));
  const edge = Math.floor(f * 4);
  const t = f * 4 - edge;
  const corners = [[cx, cy - h], [cx + w, cy], [cx, cy + h], [cx - w, cy]];
  const [ax, ay] = corners[edge];
  const [bx, by] = corners[(edge + 1) % 4];
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t };
}

/** Dash pattern painting only the first `fraction` of the perimeter. */
export function dash(w, h, fraction) {
  const p = perimeter(w, h);
  return `${Math.max(0.001, p * Math.min(1, Math.max(0, fraction)))} ${p}`;
}

// ---- colour -----------------------------------------------------------------------------------

const TIERS = ['#FF5A57', '#FFB020', '#35C08E'];
const ACCENT = { VND: '#FFB020', USD: '#35C08E' };

const hex = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

/** Mixes `t` of `b` into `a`. */
export function blend(a, b, t) {
  const [ar, ag, ab] = hex(a), [br, bg, bb] = hex(b);
  const p = n => Math.round(n).toString(16).padStart(2, '0');
  return `#${p(ar + (br - ar) * t)}${p(ag + (bg - ag) * t)}${p(ab + (bb - ab) * t)}`;
}

export const lighten = (c, t) => blend(c, '#ffffff', t);
export const darken = (c, t) => blend(c, '#000000', t);

/** Same colour, given an alpha — for glows and washes. */
export function alpha(c, a) {
  const [r, g, b] = hex(c);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/**
 * Colour a track wears at `index`. A plan without tiers keeps the currency's own accent, so a
 * hand-pasted list never comes out looking like it is stuck on tier one.
 */
export function accentOf(currency, plan, index) {
  if (!plan.tierEnds.length) return ACCENT[currency];
  const last = Math.max(0, (plan.custom.length || plan.steps) - 1);
  const step = Math.min(last, Math.max(0, index));   // a finished track sits one past its last step
  return TIERS[Math.min(TIERS.length - 1, tierAt(plan, step))];
}

/**
 * Every tint one stone wears, worked out from a single colour. A real cut stone is not one gradient
 * — it is a dozen flats, each catching the light at its own angle — so the light is fixed at upper
 * left and each facet is given the value it would have under it.
 */
export function tint(colour, cold = false) {
  return {
    '--crown': lighten(colour, cold ? 0.16 : 0.62),
    '--mid': colour,
    '--point': darken(colour, cold ? 0.64 : 0.42),
    // The crown: the table catches the most light, the left flat rather less, the right flat least.
    '--f-table': lighten(colour, cold ? 0.34 : 0.72),
    '--f-left': lighten(colour, cold ? 0.18 : 0.42),
    '--f-right': darken(colour, cold ? 0.24 : 0.08),
    // The pavilion, in shadow under the girdle, with the centre wedge catching a little back.
    '--f-pav-left': darken(colour, cold ? 0.5 : 0.26),
    '--f-pav-right': darken(colour, cold ? 0.66 : 0.48),
    '--f-spine': lighten(colour, cold ? 0.06 : 0.24)
  };
}

/** Applies a tint to whichever element carries the stone. */
export function wear(node, colour, cold = false) {
  for (const [k, v] of Object.entries(tint(colour, cold))) node.style.setProperty(k, v);
}

/**
 * Builds one stone into an <svg>: six cut flats, a girdle, the sheen down the middle, the rim, and
 * the sockets the caller lights up later (glint, progress rim, lock rim, head).
 */
export function stone(svg, { cx, cy, w, h, id }) {
  const defs = el('defs', {}, svg);

  const body = el('linearGradient', { id: `${id}-body`, x1: '0.5', y1: '0', x2: '0.5', y2: '1' }, defs);
  el('stop', { offset: '0', class: 'stop-crown' }, body);
  el('stop', { offset: '0.5', class: 'stop-mid' }, body);
  el('stop', { offset: '1', class: 'stop-point' }, body);

  const sheen = el('linearGradient', { id: `${id}-sheen`, x1: '0.5', y1: '0', x2: '0.5', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0.24' }, sheen);
  el('stop', { offset: '0.55', 'stop-color': '#fff', 'stop-opacity': '0.05' }, sheen);
  el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0.16' }, sheen);

  // Laid over the flats: light gathering at the crown and falling away into the pavilion. Flat
  // colour on every facet is what makes cut-glass artwork look like folded paper.
  const shade = el('linearGradient', { id: `${id}-shade`, x1: '0.18', y1: '0', x2: '0.86', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0.22' }, shade);
  el('stop', { offset: '0.34', 'stop-color': '#fff', 'stop-opacity': '0.03' }, shade);
  el('stop', { offset: '0.62', 'stop-color': '#000', 'stop-opacity': '0.06' }, shade);
  el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': '0.34' }, shade);

  // The band of light that crosses the face every few seconds. Clipped to the stone so it reads as
  // a glint travelling under the surface rather than a highlight laid on top of it.
  const clip = el('clipPath', { id: `${id}-clip` }, defs);
  el('path', { d: outline(cx, cy, w, h) }, clip);

  const glintFill = el('linearGradient', { id: `${id}-glint`, x1: '0', y1: '0', x2: '1', y2: '0.35' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0' }, glintFill);
  el('stop', { offset: '0.5', 'stop-color': '#fff', 'stop-opacity': '0.55' }, glintFill);
  el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }, glintFill);

  const g = el('g', { class: 'stone' }, svg);
  const face = el('path', { class: 'stone-body', d: outline(cx, cy, w, h), fill: `url(#${id}-body)` }, g);

  // The cut. Six flats meeting at the girdle: three on the crown, three on the pavilion, each with
  // the value it would have under a light fixed at upper left. This is the whole difference between
  // a diamond and a rhombus — a single gradient can only ever be a lozenge.
  const T = [cx, cy - h], L = [cx - w, cy], R = [cx + w, cy], B = [cx, cy + h];
  const l = [cx - w * 0.42, cy], r = [cx + w * 0.42, cy];
  const poly = (pts, cls) => el('polygon', {
    class: `facet ${cls}`, points: pts.map(p => p.join(',')).join(' ')
  }, g);

  poly([T, L, l], 'f-left');
  poly([T, r, R], 'f-right');
  poly([T, l, r], 'f-table');
  poly([B, L, l], 'f-pav-left');
  poly([B, r, R], 'f-pav-right');
  poly([B, l, r], 'f-spine');

  // The girdle, and the two edges the table is cut against: hairlines, and the stone reads as
  // faceted glass rather than flat colour the moment they are there.
  el('path', {
    class: 'stone-cut', fill: 'none',
    d: [
      `M ${L[0]} ${L[1]} L ${R[0]} ${R[1]}`,
      `M ${T[0]} ${T[1]} L ${l[0]} ${l[1]}`,
      `M ${T[0]} ${T[1]} L ${r[0]} ${r[1]}`,
      `M ${B[0]} ${B[1]} L ${l[0]} ${l[1]}`,
      `M ${B[0]} ${B[1]} L ${r[0]} ${r[1]}`
    ].join(' ')
  }, g);

  el('path', { class: 'stone-shade', d: outline(cx, cy, w, h), fill: `url(#${id}-shade)` }, g);

  // One long highlight down the table, over the flats: the wet look a polished stone has.
  el('path', { class: 'stone-facet', d: facet(cx, cy, w, h), fill: `url(#${id}-sheen)` }, g);

  // Two small stars that catch and let go, out of step with each other — the twinkle.
  const star = (x, y, r, delay) => {
    const s = el('path', {
      class: 'stone-star',
      d: `M ${x} ${y - r} Q ${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y}
          Q ${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r}
          Q ${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y}
          Q ${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z`,
      fill: '#fff'
    }, g);
    s.style.animationDelay = `${delay}ms`;
    return s;
  };
  star(cx - w * 0.34, cy - h * 0.30, w * 0.15, 0);
  star(cx + w * 0.30, cy + h * 0.22, w * 0.11, 1700);

  const glintBox = el('g', { 'clip-path': `url(#${id}-clip)` }, g);
  const glint = el('rect', {
    class: 'stone-glint', x: cx - w * 2.2, y: cy - h, width: w * 0.9, height: h * 2,
    fill: `url(#${id}-glint)`
  }, glintBox);

  const rim = el('path', { class: 'stone-rim', d: outline(cx, cy, w, h), fill: 'none' }, g);

  return { g, face, glint, rim, defs, geom: { cx, cy, w, h } };
}
