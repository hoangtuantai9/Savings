// The menu: two cards, VND on the left and USD on the right, and nothing else. No logo, no title,
// no numbers beyond the count cut into each stone.
//
// There is no button — the gem is the button. Open, it wears its full tier colour, twinkles and
// takes a band of light across its face every few seconds. Locked, the same stone is mixed towards
// a cold blue until the light has gone out of it, the bloom behind it fades to nothing, and the
// countdown is cut into the middle of the face in a pale tint of the track's own colour.

import { plans, count, amountAt, toNextTier } from './plans.js';
import { track, bonus, remaining } from './state.js';
import { stone, wear, accentOf, blend, alpha, darken, lighten, dash, ICE, el, outline, SVG } from './gem.js';
import { animate, pop, shiver, clock, EASE_OUT, done } from './fx.js';

const COLD = '#3A4B63';          // where a locked stone is mixed to: cold, and no longer lit
const GEM = { cx: 100, cy: 118, w: 66, h: 88 };

export function createMenu({ onOpen, onBonus, onSettings }) {
  const root = document.createElement('div');
  root.className = 'view menu';

  const cards = {};
  for (const currency of ['VND', 'USD']) cards[currency] = buildCard(currency, root);

  // Each card is its own little machine: it remembers what it was showing so a change of state can
  // be eased from wherever it stands, rather than snapped to.
  const shown = { VND: {}, USD: {} };

  function buildCard(currency, parent) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.currency = currency;
    parent.appendChild(card);

    // The light travelling the card's border in the track's tier colour.
    const edge = document.createElementNS(SVG, 'svg');
    edge.setAttribute('class', 'card-edge');
    edge.setAttribute('preserveAspectRatio', 'none');
    const edgeRect = el('rect', { x: 1, y: 1, rx: 21, fill: 'none', 'stroke-width': 2 }, edge);
    const edgeLight = el('rect', { x: 1, y: 1, rx: 21, fill: 'none', 'stroke-width': 2, class: 'edge-light' }, edge);
    card.appendChild(edge);

    const bloom = document.createElement('div');
    bloom.className = 'bloom';
    card.appendChild(bloom);

    const wrap = document.createElement('div');
    wrap.className = 'gem-wrap';
    card.appendChild(wrap);

    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'gem');
    svg.setAttribute('viewBox', '0 0 200 236');
    wrap.appendChild(svg);

    const parts = stone(svg, { ...GEM, id: `menu-${currency}` });

    // The count is cut into the stone: 41 means forty-one banked and the forty-second on offer.
    const countText = el('text', {
      class: 'gem-count', x: GEM.cx, y: GEM.cy + 12, 'text-anchor': 'middle'
    }, parts.g);

    // The same face carries the countdown once the track locks. Only ever one of the two is up.
    const clockText = el('text', {
      class: 'gem-clock', x: GEM.cx, y: GEM.cy + 10, 'text-anchor': 'middle'
    }, parts.g);

    const name = document.createElement('div');
    name.className = 'card-name';
    name.textContent = currency;
    card.appendChild(name);

    // The bonus: an ice stone that shows up, or does not. There is no dimmed socket for it — an
    // empty socket would give the hidden clock away just as surely as a countdown would.
    const ice = document.createElementNS(SVG, 'svg');
    ice.setAttribute('class', 'ice');
    ice.setAttribute('viewBox', '0 0 100 120');
    ice.style.display = 'none';
    const iceParts = stone(ice, { cx: 50, cy: 58, w: 26, h: 36, id: `ice-${currency}` });
    wear(ice, ICE);
    card.appendChild(ice);

    ice.addEventListener('click', e => { e.stopPropagation(); onBonus(currency); });
    card.addEventListener('click', () => { if (!card.classList.contains('shut')) onOpen(currency); });
    card.addEventListener('contextmenu', e => { e.preventDefault(); onSettings(currency); });

    return { card, edge, edgeRect, edgeLight, bloom, wrap, svg, parts, countText, clockText, ice, iceParts, name };
  }

  // The border rect has to match the card in pixels for the dash to travel it evenly.
  const fitEdges = () => {
    for (const c of Object.values(cards)) {
      // offsetWidth is the laid-out size; getBoundingClientRect is that size after transforms,
      // so reading it mid-zoom baked the animation's scale into the border and left it hanging
      // off the card once the zoom had finished.
      const width = c.card.offsetWidth, height = c.card.offsetHeight;
      if (!width) continue;
      for (const r of [c.edgeRect, c.edgeLight]) {
        r.setAttribute('width', Math.max(0, width - 2));
        r.setAttribute('height', Math.max(0, height - 2));
      }
      // The rounded corners cut about 36 px off what 2·(w+h) would say, and a dash pattern that
      // does not tile the path exactly leaves the light jumping — and a gap sitting on one edge —
      // every time round. The element knows its own length; ask it.
      const perimeter = c.edgeLight.getTotalLength?.() || 2 * (width + height);
      c.edgeLight.style.setProperty('--edge-len', perimeter);
      c.edgeLight.setAttribute('stroke-dasharray', `${perimeter * 0.22} ${perimeter}`);
    }
  };
  addEventListener('resize', fitEdges);

  /** Draws one card from the state. Everything is eased from wherever it stands. */
  function paint(state, currency) {
    const c = cards[currency];
    const t = track(state, currency);
    const total = count(t.plan);
    const finished = t.done >= total;
    const left = remaining(t.unlockAt);
    const shut = left > 0;

    const accent = accentOf(currency, t.plan, t.done);
    const was = shown[currency];

    // A card winds up as a promotion comes into range: over the last five steps of a colour band
    // the bloom brightens and swells and its beat quickens, all of it scaling with how close you
    // are and hitting full tilt on the step whose tick actually changes the colour.
    const toGo = finished ? 0 : toNextTier(t.plan, t.done);
    const windup = finished ? 1 : Math.min(1, Math.max(0, (5 - toGo) / 5));
    const beat = 2500 - windup * 1600;               // 2.5 s idle → under one second at full tilt

    c.card.classList.toggle('shut', shut);
    c.card.classList.toggle('windup', windup > 0 && !shut);
    c.card.classList.toggle('finished', finished);

    // Locked, the stone is mixed towards cold blue until the light has gone out of it.
    const worn = shut ? blend(accent, COLD, 0.84) : accent;
    wear(c.svg, worn, shut);
    c.parts.rim.style.stroke = alpha(shut ? '#9DB4CE' : '#ffffff', shut ? 0.22 : 0.5);

    c.card.style.setProperty('--accent', accent);
    c.card.style.setProperty('--beat', `${Math.round(beat)}ms`);
    c.card.style.setProperty('--bloom-opacity', shut ? 0 : 0.5 + windup * 0.42);
    c.card.style.setProperty('--bloom-scale', 1 + windup * 0.22);
    // The border the light travels: drawn in full round the card, so the tier colour outlines the
    // whole compartment rather than only wherever the light happens to be at that moment.
    c.edgeRect.style.stroke = alpha(shut ? '#8B95A5' : accent, shut ? 0.12 : 0.34);
    c.edgeLight.style.stroke = shut ? 'transparent' : accent;
    c.edgeLight.style.setProperty('--edge-speed', `${Math.round(5200 - windup * 3200)}ms`);

    // Progress round the rim: geometry only, never a number.
    c.parts.rim.setAttribute('stroke-dasharray', dash(GEM.w, GEM.h, finished ? 1 : t.done / total));

    c.countText.textContent = shut ? '' : String(t.done);
    c.countText.style.fill = darken(accent, 0.72);
    c.clockText.textContent = shut ? clock(left) : '';
    c.clockText.style.fill = lighten(worn, 0.55);

    c.name.style.color = shut ? 'rgba(139, 149, 165, 0.75)' : alpha(accent, 0.92);

    // The bonus stone: it is there, or it is not. Its clock is unrelated to the main track's, so a
    // track sitting out a countdown takes nothing away from the stone standing next to it.
    const b = bonus(state, currency);
    const live = b.done < count(b.plan) && remaining(b.readyAt) === 0;
    if (live !== was.bonusLive) {
      if (live || was.bonusLive !== undefined) pop(c.ice, live);
      else c.ice.style.display = 'none';
      was.bonusLive = live;
    }

    was.accent = accent;
    was.shut = shut;
  }

  /**
   * The clock reaching zero is announced, not just noted: the main gem shivers five times and goes
   * still — five flicks, each a little smaller than the last — and only when it settles does the
   * gem light up and let you in. The bloom stays where it is; the bonus keeps its own clock and
   * announces nothing.
   */
  function announce(currency) {
    shiver(cards[currency].wrap);
  }

  function render(state) {
    for (const currency of ['VND', 'USD']) paint(state, currency);
    fitEdges();
  }

  /** The cards fade and rise in on launch, and then sit still. */
  function enter() {
    let i = 0;
    for (const c of Object.values(cards)) {
      animate(c.card, [
        { opacity: 0, transform: 'translateY(26px) scale(0.97)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], { duration: 640, delay: 90 * i++, easing: EASE_OUT });
    }
  }

  /** The menu rushes past the camera as a currency's own screen zooms in behind it. */
  function leave() {
    return done(animate(root, [
      { opacity: 1, transform: 'scale(1)' },
      { opacity: 0, transform: 'scale(1.5)' }
    ], { duration: 340, easing: 'cubic-bezier(0.55, 0, 0.85, 0.35)' }));
  }

  function back() {
    root.style.opacity = '';
    return done(animate(root, [
      { opacity: 0, transform: 'scale(1.32)' },
      { opacity: 1, transform: 'scale(1)' }
    ], { duration: 420, easing: EASE_OUT }));
  }

  return { root, render, enter, leave, back, announce, cards };
}
