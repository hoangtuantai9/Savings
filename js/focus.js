// One currency's own screen — and the box's, which is the same screen with the stone swapped for a
// box and the clock taken out of it. Everything the app will ever tell you about money is here, and
// only ever one figure of it: the amount due right now.
//
//   Revealed  the amount, counting up from zero, and a round tick
//   Saved     a shockwave, five diamonds flying outward, an accent flash and a big tick
//   Waiting   a padlock, a big countdown, and a glowing head riding the draining edge
//   Verdict   a tick and a cross, side by side
//   Done      a crown in the track's colour, with a full burst once every step is saved
//
// Not a word of explanation on any of these faces: a countdown under a padlock, or a tick beside a
// cross on a gem that has just finished counting down, each say what they are on their own.

import { count, amountAt } from './plans.js';
import { track, box, remaining } from './state.js';
import { stone, boxStone, wear, wearBox, accentOf, blend, alpha, lighten, dash, pointAt, el, SVG } from './gem.js';
import { animate, done, bounce, ring, shards, sparks, countUp, clock, openLid, EASE_OUT, EASE_IN } from './fx.js';

const COLD = '#3A4B63';
const G = { cx: 210, cy: 218, w: 132, h: 176 };

// Faces drawn rather than written: the app never labels a state it can show.
const ICONS = {
  tick: 'M -34 2 L -11 26 L 34 -24',
  cross: 'M -26 -26 L 26 26 M 26 -26 L -26 26',
  crown: 'M -42 26 L -50 -30 L -22 -6 L 0 -36 L 22 -6 L 50 -30 L 42 26 Z M -34 12 L 34 12',
  lock: 'M -20 -2 h 40 v 30 h -40 Z M -12 -2 v -12 a 12 12 0 0 1 24 0 v 12'
};

export function createFocus({ onBack, onTick, onVerdict, onTickBox }) {
  const root = document.createElement('div');
  root.className = 'view focus';
  root.hidden = true;

  const back = document.createElement('button');
  back.className = 'back';
  back.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5 L8 12 L15 19" stroke-linecap="round" stroke-linejoin="round"/>
    </svg><span>BACK</span>`;
  back.setAttribute('aria-label', 'Back to the menu');
  back.addEventListener('click', () => onBack());
  root.appendChild(back);

  const coin = document.createElement('div');
  coin.className = 'coin';
  root.appendChild(coin);

  const bloom = document.createElement('div');
  bloom.className = 'bloom coin-bloom';
  coin.appendChild(bloom);

  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'coin-gem');
  svg.setAttribute('viewBox', '0 0 420 448');
  coin.appendChild(svg);

  const parts = stone(svg, { ...G, id: 'coin' });

  // The rim traces the diamond twice: dimly for progress through the plan, brightly for the lock
  // draining away — both drawn by dashing an exact fraction of the perimeter, so the head sits
  // precisely where the time says it should.
  const progressRim = el('path', {
    class: 'rim-progress', d: parts.rim.getAttribute('d'), fill: 'none', 'stroke-width': 5
  }, parts.g);
  const lockRim = el('path', {
    class: 'rim-lock', d: parts.rim.getAttribute('d'), fill: 'none', 'stroke-width': 5
  }, parts.g);
  const head = el('circle', { class: 'rim-head', r: 7 }, parts.g);

  // The box, built alongside the stone and shown instead of it. Two drawings rather than one that
  // changes shape: they have nothing in common but the light they are lit by. It goes in where the
  // stone is — under the face and over the bloom — because the face is the one thing that has to
  // stay on top of whichever of the two is up.
  const boxHost = document.createElement('div');
  boxHost.className = 'coin-box-host';
  boxHost.style.display = 'none';
  const boxHaze = document.createElement('div');
  boxHaze.className = 'box-haze';
  boxHost.appendChild(boxHaze);
  const boxSvg = document.createElementNS(SVG, 'svg');
  boxSvg.setAttribute('class', 'boxstone coin-box');
  boxSvg.setAttribute('viewBox', '0 0 200 220');
  boxHost.appendChild(boxSvg);
  const boxParts = boxStone(boxSvg, 'coin-box');
  coin.appendChild(boxHost);

  // The face. One group that is swapped out wholesale on every change of stage, so nothing from
  // the last state can be left lying about on the next one.
  const faceWrap = document.createElement('div');
  faceWrap.className = 'coin-face';
  coin.appendChild(faceWrap);

  const amountText = document.createElement('div');
  amountText.className = 'face-amount';
  faceWrap.appendChild(amountText);

  const clockText = document.createElement('div');
  clockText.className = 'face-clock';
  faceWrap.appendChild(clockText);

  const glyph = document.createElementNS(SVG, 'svg');
  glyph.setAttribute('class', 'face-glyph');
  glyph.setAttribute('viewBox', '-60 -60 120 120');
  const glyphPath = el('path', { fill: 'none', 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, glyph);
  faceWrap.appendChild(glyph);

  // The tick that banks a step: a round button under the amount, and the only control on the face.
  const tickBtn = document.createElement('button');
  tickBtn.className = 'tick-btn';
  tickBtn.innerHTML = `<svg viewBox="-60 -60 120 120"><path d="${ICONS.tick}" fill="none" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  coin.appendChild(tickBtn);

  // Tick if you held out, cross if you did not. Nothing else moves until it is answered.
  const verdictRow = document.createElement('div');
  verdictRow.className = 'verdict';
  const yes = verdictBtn('tick', ICONS.tick);
  const no = verdictBtn('cross', ICONS.cross);
  verdictRow.append(yes, no);
  coin.appendChild(verdictRow);

  function verdictBtn(kind, d) {
    const b = document.createElement('button');
    b.className = `verdict-btn ${kind}`;
    b.innerHTML = `<svg viewBox="-60 -60 120 120"><path d="${d}" fill="none" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    return b;
  }

  const burst = document.createElement('div');
  burst.className = 'burst';
  coin.appendChild(burst);

  // ---- what the screen is currently showing ----------------------------------------------------

  let currency = 'VND';
  let onBox = false;            // the screen has been given over to the box
  let state = null;
  let counted = null;           // which amount the face is currently showing, so it counts up once

  const line = () => (onBox ? box(state) : track(state, currency));

  // The stone itself is not a control. It used to turn over between the amount and the currency's name,
  // which meant a tap on the figure hid it behind a word the menu had already said and the ₫ or $
  // says again. The amount is simply always up.

  tickBtn.addEventListener('click', e => {
    e.stopPropagation();
    onBox ? onTickBox() : onTick(currency);
  });
  yes.addEventListener('click', e => { e.stopPropagation(); onVerdict(currency, true); });
  no.addEventListener('click', e => { e.stopPropagation(); onVerdict(currency, false); });

  function stage() {
    const l = line();
    if (l.done >= count(l.plan)) return 'done';
    // The box has no wait and no verdict: it was earned by a wait that has already been sat
    // through, and asking whether you held out for it would be asking the same question twice.
    if (onBox) return 'revealed';
    if (remaining(l.unlockAt) > 0) return 'waiting';
    // A track waiting to be judged looks exactly like a ready one on the menu; which of the two it
    // is, is this screen's to say.
    if (l.awaitingVerdict) return 'verdict';
    return 'revealed';
  }

  /** Draws the whole screen from the state. Called on open, on every tick and once a second. */
  function paint() {
    if (!state) return;
    const l = line();
    const total = count(l.plan);
    const s = stage();
    const accent = accentOf(onBox ? 'USD' : currency, l.plan, l.done);
    const left = remaining(l.unlockAt);

    root.style.setProperty('--accent', accent);
    root.dataset.stage = s;
    root.dataset.mode = onBox ? 'box' : 'track';

    // Waiting, the stone is mixed towards cold blue until the light has gone out of it — the same
    // cooling the menu card does, so the two screens never disagree about what a lock looks like.
    const cold = s === 'waiting';
    const worn = cold ? blend(accent, COLD, 0.84) : accent;
    svg.style.display = onBox ? 'none' : '';
    boxHost.style.display = onBox ? 'grid' : 'none';
    if (onBox) {
      wearBox(boxSvg, accent);
      boxParts.rim.setAttribute('stroke-dasharray', `${(l.done / total) * 1000} 1000`);
    } else {
      wear(svg, worn, cold);
    }

    coin.style.setProperty('--accent', accent);
    coin.style.setProperty('--bloom-opacity', s === 'waiting' ? 0.12 : 0.42);

    parts.rim.style.stroke = alpha('#ffffff', 0.45);
    progressRim.style.stroke = alpha(accent, 0.30);
    progressRim.setAttribute('stroke-dasharray', dash(G.w, G.h, s === 'done' ? 1 : l.done / total));

    // The lock, drawn as the fraction of it that is left, with a glowing head at the tip.
    if (s === 'waiting') {
      const span = Math.max(1, (l.plan.cooldown || 1) * 60000);
      const f = Math.min(1, left / span);
      lockRim.style.opacity = 1;
      lockRim.style.stroke = accent;
      lockRim.setAttribute('stroke-dasharray', dash(G.w, G.h, f));
      const p = pointAt(G.cx, G.cy, G.w, G.h, f);
      head.style.opacity = 1;
      head.style.fill = lighten(accent, 0.4);
      head.setAttribute('cx', p.x);
      head.setAttribute('cy', p.y);
    } else {
      lockRim.style.opacity = 0;
      head.style.opacity = 0;
    }

    // The face itself: one thing at a time — and on a closed box, none of them. The question marks
    // on its three faces are the whole point of not saying what is in it, and a figure sitting next
    // to them would answer the question they are asking.
    amountText.hidden = onBox || !(s === 'revealed' || s === 'saved');
    clockText.hidden = s !== 'waiting';
    glyph.style.display = ['waiting', 'verdict', 'done', 'saved'].includes(s) ? '' : 'none';
    tickBtn.hidden = s !== 'revealed';
    verdictRow.hidden = s !== 'verdict';

    if (s === 'revealed' && !onBox) {
      // Near-white, not the tier colour: the stone underneath is already wearing that colour, and
      // the one number the app ever shows has to be readable before it is decorative.
      amountText.style.color = lighten(accent, 0.9);
      // Counted up once, when the amount on offer actually changes. paint() runs four times a
      // second while any lock is draining, and starting the count again on each of those had the
      // figure scrambling on the spot instead of arriving.
      const key = `${onBox ? 'box' : currency}:${l.done}`;
      if (counted !== key) {
        counted = key;
        countUp(amountText, currency, amountAt(l.plan, l.done));
      }
    } else {
      counted = null;
    }

    clockText.textContent = clock(left);
    clockText.style.color = lighten(worn, 0.5);

    if (s === 'waiting') setGlyph(ICONS.lock, alpha(lighten(worn, 0.62), 0.9), 'fill');
    // A crown in the track's colour, on a stone already wearing it, is a crown you cannot see.
    else if (s === 'done') setGlyph(ICONS.crown, lighten(accent, 0.88), 'fill');
    else if (s === 'verdict') glyph.style.display = 'none';

    // The ring carries the tier colour; the mark inside it is lifted well clear of that colour so
    // the one control on the face is never something you have to look for.
    tickBtn.style.setProperty('--accent', accent);
    tickBtn.style.color = lighten(accent, 0.5);
  }

  function setGlyph(d, colour, mode) {
    glyph.style.display = '';
    glyphPath.setAttribute('d', d);
    glyphPath.setAttribute('fill', mode === 'fill' ? colour : 'none');
    glyphPath.setAttribute('stroke', mode === 'fill' ? 'none' : colour);
  }

  // ---- the moments -------------------------------------------------------------------------------

  /** A step banked: shockwave, five diamonds flying outward, an accent flash and a big tick. */
  async function celebrateSave(accent, finished) {
    root.dataset.stage = 'saved';
    tickBtn.hidden = true;
    amountText.hidden = false;
    ring(burst, accent, { size: 200, to: 3.6, ms: 900 });
    ring(burst, accent, { size: 200, to: 2.6, ms: 760, delay: 120 });
    shards(burst, accent, { n: 5, distance: 190, ms: 1000 });
    sparks(burst, accent, 18, 200);
    bounce(coin, 1.06, 620);
    animate(faceWrap, [{ filter: 'brightness(2.4)' }, { filter: 'brightness(1)' }], { duration: 620 });
    setGlyph(ICONS.tick, lighten(accent, 0.9), 'stroke');
    amountText.hidden = true;
    if (finished) { sparks(burst, accent, 46, 300); ring(burst, accent, { size: 240, to: 5, ms: 1200, delay: 260 }); }
    // The burst runs for about 1.8 s before the gem settles into whatever comes next.
    await new Promise(r => setTimeout(r, finished ? 2400 : 1800));
  }

  /**
   * The box opened, which is the only moment it says what was in it. The lid comes off, the stars
   * come out of the opening, and only then does the amount count up underneath — the reveal is the
   * whole reason the faces carry a question mark instead of a figure.
   *
   * No shockwave and no accent flash: that burst belongs to a step that started a wait, and this
   * one did not start anything.
   */
  async function celebrateBox(amount, accent) {
    tickBtn.hidden = true;
    amountText.hidden = true;
    openLid(boxParts);
    await new Promise(r => setTimeout(r, 420));
    amountText.hidden = false;
    amountText.style.color = lighten(accent, 0.9);
    counted = null;
    countUp(amountText, 'USD', amount);
    await new Promise(r => setTimeout(r, 1280));
  }

  /** A step taken back: the shockwave falls inward and the gem sags on its spring. */
  async function celebrateUndo(accent) {
    ring(burst, accent, { size: 200, to: 3.4, ms: 760, dir: -1 });
    shards(burst, accent, { n: 5, distance: 150, ms: 820, dir: -1 });
    animate(coin, [
      { transform: 'scale(1)' }, { transform: 'scale(0.92) translateY(10px)' }, { transform: 'scale(1)' }
    ], { duration: 720, easing: 'cubic-bezier(0.3, 1.4, 0.5, 1)' });
    await new Promise(r => setTimeout(r, 760));
  }

  /** The gem flashes and bounces on an elastic spring as the wait ends and the question arrives. */
  function askVerdict(accent) {
    bounce(coin, 1.09, 720);
    animate(parts.g, [{ filter: `drop-shadow(0 0 0 ${alpha(accent, 0)})` },
                      { filter: `drop-shadow(0 0 26px ${alpha(accent, 0.9)})` },
                      { filter: `drop-shadow(0 0 0 ${alpha(accent, 0)})` }], { duration: 900 });
  }

  // ---- coming and going ---------------------------------------------------------------------------

  /** The currency's screen zooms in behind the menu, tilting the last few degrees into place. */
  async function open(next, cur, asBox) {
    state = next;
    currency = cur;
    onBox = !!asBox;
    root.hidden = false;
    paint();
    await done(animate(root, [
      { opacity: 0, transform: 'scale(0.62) rotateX(14deg)' },
      { opacity: 1, transform: 'scale(1) rotateX(0deg)' }
    ], { duration: 460, easing: EASE_OUT }));
    if (!onBox && stage() === 'verdict') askVerdict(accentOf(currency, line().plan, line().done));
  }

  async function close() {
    await done(animate(root, [
      { opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.66)' }
    ], { duration: 300, easing: EASE_IN }));
    root.hidden = true;
  }

  function render(next) {
    state = next;
    paint();
  }

  return {
    root, open, close, render, paint,
    celebrateSave, celebrateUndo, celebrateBox, askVerdict,
    get currency() { return currency; },
    get onBox() { return onBox; },
    isOpen: () => !root.hidden
  };
}
