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
// A steel reliquary: one 2:1 isometric cube on the same rule the diamond is cut by — light fixed at
// upper left, every face a unit square pushed through a matrix so anything drawn straight lands on
// it already skewed.
//
// What makes it a box rather than a stone is everything laid over that. The lid is its own slab
// with a visible thickness and a seam where it meets the body, so it reads as a piece that can come
// off. Each flank carries a panel sunk into the steel, bevelled light along its top edge and dark
// along its bottom, with a framed triangle standing in it and the app's own stone glowing at the
// centre. The lid is engraved with two rings and four notches around a lit core.
//
// The steel never changes. What glows takes the band colour — the sigil, the frame, the core — so
// the one thing colour means in this app still means only that: how far you have come.

const BOX = (() => {
  const cx = 100, w = 58, h = 29, lid = 16, body = 62, top = 34;
  const T = [cx, top], TR = [cx + w, top + h], F = [cx, top + 2 * h], TL = [cx - w, top + h];
  const T2 = [cx, top + lid], TL2 = [TL[0], TL[1] + lid], F2 = [F[0], F[1] + lid], TR2 = [TR[0], TR[1] + lid];
  const TL3 = [TL2[0], TL2[1] + body], F3 = [F2[0], F2[1] + body], TR3 = [TR2[0], TR2[1] + body];
  const pts = list => list.map(p => p.join(',')).join(' ');
  return {
    cx, cy: (top + F3[1]) / 2, w, lid, body,
    T, TR, F, TL, TL2, F2, TR2, TL3, F3, TR3,
    // unit square -> face
    lidTop: `matrix(${w},${-h},${w},${h},${TL[0]},${TL[1]})`,
    lidLeft: `matrix(${w},${h},0,${lid},${TL[0]},${TL[1]})`,
    lidRight: `matrix(${w},${-h},0,${lid},${F[0]},${F[1]})`,
    bodyLeft: `matrix(${w},${h},0,${body},${TL2[0]},${TL2[1]})`,
    bodyRight: `matrix(${w},${-h},0,${body},${F2[0]},${F2[1]})`,
    // what the lid coming off reveals
    mouth: pts([T2, TR2, F2, TL2]),
    outlinePath: `M ${T} L ${TR} L ${TR3} L ${F3} L ${TL3} L ${TL} Z`,
    crownEdges: `M ${TL} L ${T} L ${TR}`,
    lidSeam: `M ${TL2} L ${F2} L ${TR2}`,
    frontSeam: `M ${F2} L ${F3}`,
    floor: F3[1] + 8
  };
})();

export const boxGeom = BOX;

/** Steel at three values: the lid catches most light, the left flank less, the right flank least. */
const STEEL = {
  top: ['#EEF6FC', '#B4C7D8', '#7C8FA2'],
  left: ['#C3D4E3', '#8698AA', '#546575'],
  right: ['#93A7B9', '#647689', '#394654'],
  hair: '#F2F8FD',
  shade: '#0E141B'
};

/**
 * Builds the box into an <svg>. Returns the pieces the views move: the body that idles, the lid
 * that comes off, the rim that carries progress, and one function for whatever the lid says.
 */
export function boxStone(svg, id) {
  const defs = el('defs', {}, svg);

  const grad = (suffix, stops, coords = { x1: '0', y1: '0', x2: '0.4', y2: '1' }) => {
    const g = el('linearGradient', { id: `${id}-${suffix}`, ...coords }, defs);
    for (const [offset, colour, o] of stops) {
      el('stop', { offset, 'stop-color': colour, 'stop-opacity': o ?? '1' }, g);
    }
    return `url(#${id}-${suffix})`;
  };
  const plate = (suffix, arr) => grad(suffix, [['0', arr[0]], ['0.45', arr[1]], ['1', arr[2]]]);

  const fillTop = plate('t', STEEL.top);
  const fillLeft = plate('l', STEEL.left);
  const fillRight = plate('r', STEEL.right);
  // Light gathering at the top edge of a recess and shadow pooling at its foot. Flat colour in a
  // sunken panel reads as a sticker rather than a hollow.
  const inner = grad('in', [['0', '#000000', '0.5'], ['0.5', '#000000', '0.1'], ['1', '#ffffff', '0.1']]);
  const gloss = grad('gs', [['0', '#ffffff', '0'], ['0.5', '#ffffff', '0.5'], ['1', '#ffffff', '0']],
    { x1: '0', y1: '0', x2: '1', y2: '0.3' });
  grad('mouth', [['0', '#04060a'], ['0.75', '#0d1219'], ['1', '#2a3444']]);

  const clip = el('clipPath', { id: `${id}-clip` }, defs);
  el('path', { d: BOX.outlinePath }, clip);

  const soften = el('filter', { id: `${id}-soft`, x: '-60%', y: '-300%', width: '220%', height: '700%' }, defs);
  el('feGaussianBlur', { stdDeviation: '5' }, soften);

  // The contact shadow. Without one the box floats, and nothing else on it can fix that.
  el('ellipse', {
    class: 'box-shadow', cx: BOX.cx, cy: BOX.floor, rx: BOX.w * 0.92, ry: 10,
    filter: `url(#${id}-soft)`
  }, svg);

  const root = el('g', { class: 'box-body' }, svg);

  /** One face: steel, and a group in unit space to draw the rest of it into. */
  const face = (parent, matrix, fill) => {
    const wrap = el('g', {}, parent);
    const g = el('g', { transform: matrix }, wrap);
    el('rect', { x: 0, y: 0, width: 1, height: 1, fill }, g);
    return { wrap, g };
  };

  /** A panel sunk into a face: the band colour, a bevel, a cut edge and a lit inner lip. */
  const recess = (g, inset) => {
    const s = inset, w = 1 - inset * 2;
    const box = attrs => el('rect', { x: s, y: s, width: w, height: w, rx: 0.05, ...attrs }, g);
    box({ class: 'box-panel' });
    box({ fill: inner });
    box({ fill: 'none', stroke: STEEL.shade, 'stroke-opacity': 0.85, 'stroke-width': 0.028 });
    el('rect', {
      x: s + 0.018, y: s + 0.018, width: w - 0.036, height: w - 0.036, rx: 0.04,
      fill: 'none', stroke: STEEL.hair, 'stroke-opacity': 0.3, 'stroke-width': 0.016
    }, g);
  };

  /**
   * A lit shape, and the bloom around it — drawn rather than filtered.
   *
   * A CSS filter here would be a disaster and was one: these shapes live inside a group the face
   * matrix scales by about sixty, and a filter's lengths go through that scale with everything
   * else, so a four-pixel blur came out over three hundred pixels wide. It swamped the artwork and
   * had to be re-rasterised on every frame of the idle. A wider, fainter copy of the same shape
   * costs nothing, stays sharp at any size, and is what a glow looks like anyway.
   */
  const lit = (g, node, bloom) => {
    if (bloom) { bloom.classList.add('box-bloom'); g.appendChild(bloom); }
    g.appendChild(node);
    return node;
  };

  /** A framed triangle with the app's own stone glowing in the middle of it. */
  const sigil = g => {
    recess(g, 0.1);
    const tri = 'M 0.5 0.845 L 0.155 0.235 L 0.845 0.235 Z';
    el('path', {
      d: tri, fill: 'none', stroke: STEEL.shade, 'stroke-opacity': 0.75,
      'stroke-width': 0.055, 'stroke-linejoin': 'round'
    }, g);
    lit(g,
      el('path', { d: tri, fill: 'none', 'stroke-width': 0.028, 'stroke-linejoin': 'round', class: 'box-glow-stroke' }),
      el('path', { d: tri, fill: 'none', 'stroke-width': 0.085, 'stroke-linejoin': 'round', class: 'box-glow-stroke' }));
    const stoneAt = (rx, ry) => `M 0.5 ${0.5 - ry} L ${0.5 + rx} 0.5 L 0.5 ${0.5 + ry} L ${0.5 - rx} 0.5 Z`;
    el('path', { d: stoneAt(0.115, 0.16), fill: STEEL.shade, opacity: 0.6 }, g);
    lit(g,
      el('path', { d: stoneAt(0.1, 0.14), class: 'box-glow-fill box-pulse' }),
      el('path', { d: stoneAt(0.19, 0.26), class: 'box-glow-fill' }));
  };

  // ---- body, then the mouth, then the lid over both ----
  const body = el('g', {}, root);
  sigil(face(body, BOX.bodyLeft, fillLeft).g);
  sigil(face(body, BOX.bodyRight, fillRight).g);

  el('polygon', { points: BOX.mouth, fill: `url(#${id}-mouth)` }, root);

  const lidWrap = el('g', { class: 'box-lid' }, root);
  face(lidWrap, BOX.lidLeft, fillLeft);
  face(lidWrap, BOX.lidRight, fillRight);
  const lidTop = face(lidWrap, BOX.lidTop, fillTop);
  // The lid turns about its own middle. Left alone an SVG element turns about the origin of the
  // whole drawing, which sends it across the room rather than off the box.
  lidWrap.style.transformBox = 'fill-box';
  lidWrap.style.transformOrigin = '50% 50%';

  // Two engraved rings, four notches and a lit core.
  {
    const g = lidTop.g;
    const ring = (r, width, opacity) => el('circle', {
      cx: 0.5, cy: 0.5, r, fill: 'none', stroke: STEEL.shade,
      'stroke-opacity': opacity, 'stroke-width': width
    }, g);
    ring(0.34, 0.05, 0.6);
    el('circle', { cx: 0.5, cy: 0.5, r: 0.34, fill: 'none', stroke: STEEL.hair, 'stroke-opacity': 0.35, 'stroke-width': 0.016 }, g);
    ring(0.24, 0.035, 0.5);
    for (const deg of [0, 90, 180, 270]) {
      const a = deg * Math.PI / 180;
      el('line', {
        x1: 0.5 + Math.cos(a) * 0.28, y1: 0.5 + Math.sin(a) * 0.28,
        x2: 0.5 + Math.cos(a) * 0.4, y2: 0.5 + Math.sin(a) * 0.4,
        stroke: STEEL.shade, 'stroke-opacity': 0.7, 'stroke-width': 0.05, 'stroke-linecap': 'round'
      }, g);
    }
    lit(g,
      el('circle', { cx: 0.5, cy: 0.5, r: 0.135, class: 'box-glow-fill box-pulse' }),
      el('circle', { cx: 0.5, cy: 0.5, r: 0.23, class: 'box-glow-fill' }));
  }

  // Whatever the lid says, stamped over its lit core: the step count on the menu, nothing on the
  // box's own screen, where saying anything would be answering the question the box is asking.
  const lidInk = el('text', {
    class: 'box-ink', x: 0.5, y: 0.53, 'text-anchor': 'middle', 'dominant-baseline': 'central',
    'font-size': 0.2, 'font-weight': 800
  }, lidTop.g);
  const setLid = text => { lidInk.textContent = text ?? ''; };

  // Brackets over the two side corners, and the light along the crown.
  const bracket = (p, dir) => el('path', {
    class: 'box-bracket',
    d: `M ${p[0]} ${p[1] - 3} l ${dir * 13} 6.5 l 0 ${BOX.lid + 3} l ${-dir * 13} -6.5 Z`
  }, lidWrap);
  bracket(BOX.TL, 1);
  bracket(BOX.TR, -1);

  el('path', { class: 'box-bevel', d: BOX.crownEdges }, root);
  el('path', { class: 'box-bevel', d: BOX.frontSeam, 'stroke-opacity': 0.2 }, root);
  el('path', { class: 'box-rim', d: BOX.outlinePath }, root);
  // the seam the lid sits on, which is what makes it read as a separate piece
  el('path', { class: 'box-seam', d: BOX.lidSeam }, root);

  // A band of light crossing the whole box, clipped to it, so it reads as a gleam travelling over
  // the steel rather than a highlight laid on top of it.
  const glossBox = el('g', { 'clip-path': `url(#${id}-clip)` }, root);
  el('rect', { class: 'box-gloss', x: -14, y: 20, width: 30, height: 180, fill: gloss }, glossBox);

  // Progress round the silhouette: geometry only, never a number.
  const rim = el('path', { class: 'box-progress', pathLength: 1000, d: BOX.outlinePath }, root);

  const sparks = el('g', { class: 'box-sparks' }, svg);
  for (const [x, y, r, delay] of [
    [BOX.cx, 16, 7.5, 0], [40, 42, 5, 700], [163, 48, 6, 1500],
    [176, 116, 4.5, 2100], [24, 124, 4, 900], [70, 190, 4.5, 2400]
  ]) {
    const node = star(x, y, r);
    node.setAttribute('class', 'box-spark');
    node.style.animationDelay = `${delay}ms`;
    sparks.appendChild(node);
  }

  setLid('');
  return { svg, body: root, lid: { wrap: lidWrap }, rim, sparks, setLid };
}

/** The steel never moves; what glows takes the band colour. */
export function wearBox(node, colour) {
  node.style.setProperty('--box-panel', darken(colour, 0.74));
  node.style.setProperty('--box-glow', lighten(colour, 0.35));
  node.style.setProperty('--box-halo', alpha(lighten(colour, 0.2), 0.85));
  node.style.setProperty('--box-ink', darken(colour, 0.7));
}
