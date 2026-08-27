// The menu: two cards, VND on the left and USD on the right, and — when there is one to be had —
// the box between them. No logo, no title, no numbers beyond the count cut into each stone.
//
// The box is not on the menu the rest of the time, and there is no gap left where it would go: an
// empty socket gives away that something is coming just as surely as a countdown would. So the row
// is two cards, and when a box is earned the two cards part to let it in — measured before and
// after, and each card run from where it was to where it now is. That movement is the arrival.
//
// There is no button — the gem is the button, and it is the only thing on the card. Open, it wears
// its full tier colour, twinkles and takes a band of light across its face every few seconds.
// Locked, the same stone is mixed towards a cold blue until the light has gone out of it, the bloom
// behind it fades to nothing, and the countdown is cut into the middle of the face in a pale tint of
// the track's own colour.

import { count, toNextTier } from './plans.js';
import { track, box, remaining } from './state.js';
import { stone, boxStone, wear, wearBox, accentOf, blend, alpha, darken, lighten, dash, el, SVG } from './gem.js';
import { animate, shiver, clock, arrive, boxSparks, slideFrom, EASE_OUT, done } from './fx.js';

const COLD = '#3A4B63';          // where a locked stone is mixed to: cold, and no longer lit
const GEM = { cx: 100, cy: 118, w: 66, h: 88 };

export function createMenu({ onOpen, onBox, onSettings }) {
  const root = document.createElement('div');
  root.className = 'view menu';

  // Built in the order they stand in: VND, the box between them, USD.
  const cards = { VND: buildCard('VND', root) };
  const chest = buildBox(root);
  cards.USD = buildCard('USD', root);

  // What the menu last drew of the box, so that its coming and going is eased from where the row
  // actually stands rather than snapped to wherever it should be.
  let boxShown = null;

  function buildBox(parent) {
    const slot = document.createElement('div');
    slot.className = 'box-slot';
    slot.style.display = 'none';
    parent.appendChild(slot);

    // The warm haze it sits in, which is what makes it read as lit rather than drawn.
    const haze = document.createElement('div');
    haze.className = 'box-haze';
    slot.appendChild(haze);

    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'boxstone');
    svg.setAttribute('viewBox', '0 0 200 220');
    slot.appendChild(svg);

    const parts = boxStone(svg, 'menu-box');
    slot.addEventListener('click', e => { e.stopPropagation(); onBox(); });
    return { slot, svg, parts };
  }

  /** Lets the box into the row, or out of it, with the cards gliding to their new places. */
  function partCards(mutate) {
    const list = [cards.VND.card, cards.USD.card];
    const before = list.map(c => c.getBoundingClientRect().left);
    mutate();
    const after = list.map(c => c.getBoundingClientRect().left);
    list.forEach((c, i) => slideFrom(c, before[i] - after[i]));
  }

  function buildCard(currency, parent) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.currency = currency;
    parent.appendChild(card);

    // The light travelling the card's border. A dashed stroke was the obvious way to do this and
    // the wrong one: a dash has two hard ends, and where the pattern meets the start of the path it
    // is cut, which is the chunk that kept going missing. This is a cone of light swept round the
    // card instead — bright head, tail fading to nothing, no ends to catch on anything — masked to
    // the border so only the ring of it shows. The halo underneath is the same sweep, blurred.
    const rim = document.createElement('div');
    rim.className = 'card-rim';
    card.appendChild(rim);

    const glow = document.createElement('div');
    glow.className = 'card-edge glow';
    card.appendChild(glow);

    const edgeLight = document.createElement('div');
    edgeLight.className = 'card-edge';
    card.appendChild(edgeLight);

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

    card.addEventListener('click', () => { if (!card.classList.contains('shut')) onOpen(currency); });
    card.addEventListener('contextmenu', e => { e.preventDefault(); onSettings(currency); });

    return { card, rim, glow, edgeLight, bloom, wrap, svg, parts, countText, clockText, name };
  }

  /** Draws one card from the state. Everything is eased from wherever it stands. */
  function paint(state, currency) {
    const c = cards[currency];
    const t = track(state, currency);
    const total = count(t.plan);
    const finished = t.done >= total;
    const left = remaining(t.unlockAt);
    const shut = left > 0;

    const accent = accentOf(currency, t.plan, t.done);

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
    // The rim outlines the whole compartment in the tier colour; the sweep runs round it, head
    // first, quickening as a promotion comes into range. The tail fades to nothing over roughly
    // half a turn, so there is no end to it and nothing to catch on the corner it starts at.
    c.rim.style.borderColor = alpha(shut ? '#8B95A5' : accent, shut ? 0.12 : 0.32);
    const comet = `conic-gradient(from var(--spin),
      ${alpha(accent, 0)} 0deg, ${alpha(accent, 0)} 186deg,
      ${alpha(accent, 0.22)} 268deg, ${alpha(accent, 0.72)} 330deg,
      ${alpha(accent, 0.98)} 352deg, #ffffff 358deg, ${alpha(accent, 0)} 360deg)`;
    for (const layer of [c.edgeLight, c.glow]) {
      layer.style.background = comet;
      layer.style.setProperty('--edge-speed', `${Math.round(5200 - windup * 3200)}ms`);
    }

    // Progress round the rim: geometry only, never a number.
    c.parts.rim.setAttribute('stroke-dasharray', dash(GEM.w, GEM.h, finished ? 1 : t.done / total));

    c.countText.textContent = shut ? '' : String(t.done);
    c.countText.style.fill = darken(accent, 0.72);
    c.clockText.textContent = shut ? clock(left) : '';
    c.clockText.style.fill = lighten(worn, 0.55);

    c.name.style.color = shut ? 'rgba(139, 149, 165, 0.75)' : alpha(accent, 0.92);
  }

  /**
   * The clock reaching zero is announced, not just noted: the gem shivers five times and goes
   * still — five flicks, each a little smaller than the last — and only when it settles does the
   * gem light up and let you in. The bloom stays where it is.
   */
  function announce(currency) {
    shiver(cards[currency].wrap);
  }

  /**
   * The box, which is either there or is not. Its count is stamped on the lid and its progress runs
   * round the silhouette; the band colour goes into the sunken panels, and the frame stays gold.
   */
  function paintBox(state) {
    const b = box(state);
    const accent = accentOf('USD', b.plan, b.done);
    wearBox(chest.svg, accent);
    chest.parts.setLid(String(b.done));
    chest.parts.rim.setAttribute('stroke-dasharray', `${(b.done / count(b.plan)) * 1000} 1000`);

    if (b.live === boxShown) return;
    const first = boxShown === null;
    boxShown = b.live;
    partCards(() => { chest.slot.style.display = b.live ? 'grid' : 'none'; });
    if (!b.live) return;
    arrive(chest.slot);
    // A box that was already standing when the app opened has already been announced once. Opening
    // onto one is not news, the same way opening onto an expired lock is not.
    if (!first) boxSparks(chest.svg);
  }

  function render(state) {
    for (const currency of ['VND', 'USD']) paint(state, currency);
    paintBox(state);
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
