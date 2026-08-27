// The diamond the whole app is built on, the box cut the same way, and the colours both wear.
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
 * A four-pointed star. The stones twinkle with it and the box throws it around by the handful, so
 * it lives out here rather than inside either of them.
 */
export function star(x, y, r, fill = '#fff6d5') {
  return el('path', {
    fill,
    d: `M ${x} ${y - r} Q ${x + r * 0.22} ${y - r * 0.22} ${x + r} ${y}
        Q ${x + r * 0.22} ${y + r * 0.22} ${x} ${y + r}
        Q ${x - r * 0.22} ${y + r * 0.22} ${x - r} ${y}
        Q ${x - r * 0.22} ${y - r * 0.22} ${x} ${y - r} Z`
  });
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
  const twinkle = (x, y, r, delay) => {
    const node = star(x, y, r, '#fff');
    node.setAttribute('class', 'stone-star');
    node.style.animationDelay = `${delay}ms`;
    g.appendChild(node);
  };
  twinkle(cx - w * 0.34, cy - h * 0.30, w * 0.15, 0);
  twinkle(cx + w * 0.30, cy + h * 0.22, w * 0.11, 1700);

  const glintBox = el('g', { 'clip-path': `url(#${id}-clip)` }, g);
  const glint = el('rect', {
    class: 'stone-glint', x: cx - w * 2.2, y: cy - h, width: w * 0.9, height: h * 2,
    fill: `url(#${id}-glint)`
  }, glintBox);

  const rim = el('path', { class: 'stone-rim', d: outline(cx, cy, w, h), fill: 'none' }, g);

  return { g, face, glint, rim, defs, geom: { cx, cy, w, h } };
}

// ---- the box -----------------------------------------------------------------------------------
//
// One 2:1 isometric cube, three faces, light fixed at upper left: the same rule the diamond is cut
// by, in the one other shape that rule makes sense in. What makes it a box rather than a stone is
// what is laid on top of that: a heavy gold frame, a panel sunk into each face, and a question mark
// painted across all three.
//
// The frame is gold whatever the state of the ladder, because a box is treasure and treasure is
// gold. The panels take the band colour, so the one thing colour means in this app — how far you
// have come — still means only that.
//
// Every face is a unit square pushed through a matrix, which is what lets the panel, the gloss and
// the question mark be drawn straight and land already skewed onto the face. The matrix goes on an
// inner <g> and the animations on an outer one: a CSS transform replaces the transform attribute
// outright rather than composing with it, and would flatten the cube the first time the lid moved.

const BOX = (() => {
  const cx = 100, cy = 112, w = 62, hh = 31, b = 72;
  const T = [cx, cy - b / 2 - hh], TR = [cx + w, cy - b / 2], F = [cx, cy - b / 2 + hh], TL = [cx - w, cy - b / 2];
  const BR = [cx + w, cy + b / 2], BF = [cx, cy + b / 2 + hh], BL = [cx - w, cy + b / 2];
  const pts = list => list.map(p => p.join(',')).join(' ');
  return {
    cx, cy,
    T, TR, F, TL, BR, BF, BL,
    top: `matrix(${w},${-hh},${w},${hh},${TL[0]},${TL[1]})`,
    left: `matrix(${w},${hh},0,${b},${TL[0]},${TL[1]})`,
    right: `matrix(${w},${-hh},0,${b},${F[0]},${F[1]})`,
    lidQuad: pts([T, TR, F, TL]),
    outlinePath: `M ${T} L ${TR} L ${BR} L ${BF} L ${BL} L ${TL} Z`,
    lidEdges: `M ${TL} L ${T} L ${TR}`,
    frontSeam: `M ${F} L ${BF}`
  };
})();

export const boxGeom = BOX;

/** The gold, at three values — the lid, the left flank, the right flank in shade. */
const GOLD = {
  top: [['0', '#FFFAD9'], ['0.42', '#FFDC6B'], ['1', '#F0AE22']],
  left: [['0', '#FFE491'], ['0.5', '#F7B72B'], ['1', '#BE7A04']],
  right: [['0', '#F0B838'], ['0.55', '#CE8A12'], ['1', '#8A5300']]
};

/**
 * Builds the box into an <svg>. Returns the pieces the views move: the body that idles, the lid
 * that comes off, the rim that carries progress, and one function for whatever the lid says.
 */
export function boxStone(svg, id) {
  const defs = el('defs', {}, svg);

  const grad = (suffix, stops, coords = { x1: '0', y1: '0', x2: '0.35', y2: '1' }) => {
    const g = el('linearGradient', { id: `${id}-${suffix}`, ...coords }, defs);
    for (const [offset, colour, o] of stops) {
      el('stop', { offset, 'stop-color': colour, 'stop-opacity': o ?? '1' }, g);
    }
    return `url(#${id}-${suffix})`;
  };

  const goldTop = grad('gt', GOLD.top);
  const goldLeft = grad('gl', GOLD.left);
  const goldRight = grad('gr', GOLD.right);
  // Laid over each sunken panel: light gathering at its top edge, shadow pooling at the bottom. A
  // flat colour in a recess reads as a sticker rather than a hollow.
  const inner = grad('in', [['0', '#000000', '0.42'], ['0.45', '#000000', '0.06'], ['1', '#ffffff', '0.09']]);
  const gloss = grad('gs', [['0', '#ffffff', '0'], ['0.5', '#ffffff', '0.55'], ['1', '#ffffff', '0']],
    { x1: '0', y1: '0', x2: '1', y2: '0.3' });
  // What you see when the lid comes off: dark at the back, a little warm light at the near edge.
  grad('hole', [['0', '#0a0603'], ['0.7', '#20110a'], ['1', '#4a2a10']]);

  const clip = el('clipPath', { id: `${id}-clip` }, defs);
  el('path', { d: BOX.outlinePath }, clip);

  const body = el('g', { class: 'box-body' }, svg);

  const face = (matrix, gold, panelClass) => {
    const wrap = el('g', {}, body);                    // what the animations are allowed to move
    const g = el('g', { transform: matrix }, wrap);     // what holds the face flat
    el('rect', { x: 0, y: 0, width: 1, height: 1, fill: gold }, g);
    const panel = { x: 0.115, y: 0.115, width: 0.77, height: 0.77, rx: 0.055 };
    el('rect', { ...panel, class: panelClass }, g);
    el('rect', { ...panel, fill: inner }, g);
    // the hairline where the frame meets the panel, which is what gives the recess an edge
    el('rect', { ...panel, fill: 'none', stroke: '#2a0f0e', 'stroke-opacity': 0.55, 'stroke-width': 0.02 }, g);
    const mark = (cls, dx, dy) => el('text', {
      class: cls, x: 0.5 + dx, y: 0.53 + dy, 'text-anchor': 'middle', 'dominant-baseline': 'central',
      'font-size': 0.58, 'font-weight': 800, 'letter-spacing': -0.02
    }, g);
    return { wrap, shadow: mark('box-mark-shadow', 0.022, 0.03), text: mark('box-mark', 0, 0) };
  };

  const left = face(BOX.left, goldLeft, 'box-panel-left');
  const right = face(BOX.right, goldRight, 'box-panel-right');
  // The inside, drawn before the lid and never moved: it is what the lid coming off reveals.
  el('polygon', { points: BOX.lidQuad, fill: `url(#${id}-hole)` }, body);
  const lid = face(BOX.top, goldTop, 'box-panel-top');
  // The lid turns about its own middle. Left alone an SVG element turns about the origin of the
  // whole drawing, which sends it across the room rather than off the box.
  lid.wrap.style.transformBox = 'fill-box';
  lid.wrap.style.transformOrigin = '50% 50%';

  // The bevel: the two top edges catching the light, and the seam down the front corner.
  el('path', { class: 'box-bevel', d: BOX.lidEdges }, body);
  el('path', { class: 'box-bevel', d: BOX.frontSeam, 'stroke-opacity': 0.22 }, body);
  el('path', { class: 'box-rim', d: BOX.outlinePath }, body);

  // A band of light crossing the whole box every few seconds, clipped to its silhouette so it reads
  // as a gleam travelling over the gold rather than a highlight laid on top of it.
  const glossBox = el('g', { 'clip-path': `url(#${id}-clip)` }, body);
  el('rect', { class: 'box-gloss', x: -10, y: 30, width: 34, height: 170, fill: gloss }, glossBox);

  // Progress round the silhouette, drawn over the gold: geometry only, never a number.
  const rim = el('path', { class: 'box-progress', pathLength: 1000, d: BOX.outlinePath }, body);

  // The stones twinkle; the box twinkles harder, and above itself as well as beside.
  const sparks = el('g', { class: 'box-sparks' }, svg);
  for (const [x, y, r, delay] of [
    [100, 30, 8.5, 0], [46, 48, 5.5, 700], [158, 52, 6.5, 1400],
    [172, 118, 5, 2000], [28, 126, 4.5, 900], [140, 34, 4, 1800], [64, 190, 4.5, 2300]
  ]) {
    const node = star(x, y, r);
    node.setAttribute('class', 'box-spark');
    node.style.animationDelay = `${delay}ms`;
    sparks.appendChild(node);
  }

  // Whatever the lid says has to be written to the mark and to the shadow under it, or the two fall
  // out of step: the count on the menu, a question mark on the box's own screen.
  const setLid = text => { lid.text.textContent = text; lid.shadow.textContent = text; };
  setLid('?');
  for (const side of [left, right]) { side.text.textContent = '?'; side.shadow.textContent = '?'; }

  return { svg, body, lid, rim, sparks, setLid };
}

/** The band colour goes into the sunken panels; the frame stays gold. */
export function wearBox(node, colour) {
  node.style.setProperty('--box-panel-top', darken(colour, 0.46));
  node.style.setProperty('--box-panel-left', darken(colour, 0.56));
  node.style.setProperty('--box-panel-right', darken(colour, 0.66));
  node.style.setProperty('--box-ink', lighten(colour, 0.88));
}
