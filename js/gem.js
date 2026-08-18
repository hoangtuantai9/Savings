// The diamond the whole app is built on, and the colours it wears.
//
// Straight edges are kept sharp in the geometry so the perimeter maths stays exact — the rim
// traces the stone by dashing a precise fraction of that perimeter, which is what puts the head of
// a draining lock exactly where the time says it should be. Corners are softened with
// stroke-linejoin instead.

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
export const facet = (cx, cy, w, h) =>
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

export const TIERS = ['#FF5A57', '#FFB020', '#35C08E'];
export const ACCENT = { VND: '#FFB020', USD: '#35C08E' };
export const ICE = '#8FD6FF';

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
  let tier = 0;
  for (const end of plan.tierEnds) { if (step < end) break; tier++; }
  return TIERS[Math.min(TIERS.length - 1, tier)];
}

/**
 * Builds one stone into an <svg>: top-lit body, pale facet, rim, and the sockets the caller lights
 * up later (glint, progress rim, lock rim, head). Returns the parts by name.
 */
export function stone(svg, { cx, cy, w, h, id }) {
  const defs = el('defs', {}, svg);

  const body = el('linearGradient', { id: `${id}-body`, x1: '0.5', y1: '0', x2: '0.5', y2: '1' }, defs);
  el('stop', { offset: '0', class: 'stop-crown' }, body);
  el('stop', { offset: '0.5', class: 'stop-mid' }, body);
  el('stop', { offset: '1', class: 'stop-point' }, body);

  const sheen = el('linearGradient', { id: `${id}-sheen`, x1: '0.5', y1: '0', x2: '0.5', y2: '1' }, defs);
  el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0.40' }, sheen);
  el('stop', { offset: '0.55', 'stop-color': '#fff', 'stop-opacity': '0.10' }, sheen);
  el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0.28' }, sheen);

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
  el('path', { class: 'stone-facet', d: facet(cx, cy, w, h), fill: `url(#${id}-sheen)` }, g);

  // The cuts. Without them the shape reads as a flat lozenge; with them the light has edges to
  // break on, which is the whole difference between a diamond and a rhombus.
  el('path', {
    class: 'stone-cut', fill: 'none',
    d: [
      `M ${cx} ${cy - h} L ${cx - w * 0.42} ${cy} L ${cx} ${cy + h}`,
      `M ${cx} ${cy - h} L ${cx + w * 0.42} ${cy} L ${cx} ${cy + h}`,
      `M ${cx - w} ${cy} L ${cx + w} ${cy}`,
      `M ${cx - w * 0.66} ${cy - h * 0.34} L ${cx + w * 0.66} ${cy - h * 0.34}`
    ].join(' ')
  }, g);

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
