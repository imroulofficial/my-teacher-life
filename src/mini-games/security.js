// Mini-game 5: Morning Security Scan (Metal Detector).
// Students walk through the detector. Check their bag (some items are hidden under clothes!)
// and decide SUSPICIOUS or APPROVE. Rewarded "Scanner VIP" gives 10 seconds of X-ray vision.
import { h, btn, pick, shuffle, randInt } from '../core/ui.js';
import { AD_UNITS, BOOSTS } from '../core/config.js';
import { getState, saveState } from '../core/storage.js';
import { ALLOWED_ITEMS, BANNED_ITEMS, METAL_ITEMS, COVER_ITEMS, STUDENT_NAMES, STUDENT_FACES, SHIRT_COLORS } from './data.js';

export default {
  id: 'security',
  howTo: [
    'Students arrive one by one through the metal detector.',
    'The detector beeps 🔴 for ANY metal — even keys and rulers. It is only a hint!',
    'Look in the bag. Tap 👕 clothes to peek under them.',
    'Banned item inside? Press SUSPICIOUS. All clear? Press APPROVE.',
  ],

  start(api) {
    const d = api.difficulty;
    const bannedPool = BANNED_ITEMS.slice(0, d < 0.3 ? 3 : d < 0.6 ? 4 : 6);
    const bannedIcons = bannedPool.map((b) => b.icon);

    const banList = h(
      'div',
      { class: 'ban-list' },
      h('span', { class: 'font-bold mr-1' }, '🚫 BANNED:'),
      bannedPool.map((b) => h('span', { class: 'ban-item', title: b.name }, b.icon)),
    );
    const light = h('div', { class: 'detector-light' });
    const walker = h('div', { class: 'walker' });
    const queue = h('div', { class: 'queue' });
    const gate = h('div', { class: 'detector' }, h('div', { class: 'detector-top' }, light, h('span', { class: 'detector-label' }, 'SCAN')), h('div', { class: 'detector-arch' }));
    const corridor = h('div', { class: 'corridor' }, queue, gate, walker);
    const bag = h('div', { class: 'bag-grid' });
    const bagWrap = h('div', { class: 'bag-wrap' }, h('div', { class: 'bag-title' }, '🎒 Bag check'), bag);
    api.stage.append(h('div', { class: 'security-scene' }, banList, corridor, bagWrap));

    const susBtn = btn('SUSPICIOUS', { color: 'red', icon: '🚨', size: 'lg', cls: 'action-btn', onClick: () => decide(true) });
    const okBtn = btn('APPROVE', { color: 'green', icon: '✅', size: 'lg', cls: 'action-btn', onClick: () => decide(false) });
    api.setControls(h('div', { class: 'controls-row' }, susBtn, okBtn));

    // "Stuck" helper — always available, pulses when the player struggles.
    let xray = false;
    const vip = api.addPower({
      label: `X-Ray Vision ${BOOSTS.xraySeconds}s`,
      icon: '🩻',
      adUnit: AD_UNITS.SCANNER_VIP,
      onReward: startXray,
    });

    const students = Array.from({ length: api.rounds }, () => makeStudent());
    let idx = 0;
    let locked = true;
    let mistakes = 0;
    let stuckTimer = null;

    function makeStudent() {
      const nItems = Math.round(3 + 4 * d); // 3..7 items
      const hasBanned = Math.random() < 0.5;
      const items = [];
      const allowed = shuffle(ALLOWED_ITEMS);
      for (let i = 0; i < nItems - (hasBanned ? 1 : 0); i++) items.push(allowed[i]);
      if (hasBanned) items.push(pick(bannedIcons));
      const shuffled = shuffle(items);
      // Hide some items under clothes. Banned items are more often hidden on hard levels.
      const hideChance = 0.15 + 0.45 * d;
      const slots = shuffled.map((icon) => ({
        icon,
        banned: bannedIcons.includes(icon),
        hidden: Math.random() < (bannedIcons.includes(icon) ? hideChance + 0.15 : hideChance),
        cover: pick(COVER_ITEMS),
      }));
      // Decoys: empty clothes with nothing under them.
      const decoys = randInt(0, Math.round(2 * d));
      for (let k = 0; k < decoys; k++) slots.splice(randInt(0, slots.length), 0, { icon: '', banned: false, hidden: true, cover: pick(COVER_ITEMS) });
      return {
        name: pick(STUDENT_NAMES),
        face: pick(STUDENT_FACES),
        shirt: pick(SHIRT_COLORS),
        slots,
        hasBanned,
        metal: shuffled.some((i) => METAL_ITEMS.has(i)),
      };
    }

    function renderQueue() {
      queue.replaceChildren(
        ...students.slice(idx + 1, idx + 4).map((s) => h('div', { class: 'queue-kid' }, s.face)),
      );
    }

    function nextStudent() {
      if (!api.alive) return;
      if (idx >= students.length) {
        api.after(0.3, () => api.finish());
        return;
      }
      const s = students[idx];
      renderQueue();
      bag.replaceChildren();
      light.className = 'detector-light';
      walker.replaceChildren(h('div', { class: 'walker-face' }, s.face), h('div', { class: 'walker-body', style: { background: s.shirt } }), h('div', { class: 'walker-name' }, s.name));
      walker.className = 'walker walk-in';
      locked = true;
      api.after(0.9, () => {
        // Detector result
        light.className = `detector-light ${s.metal ? 'red' : 'green'}`;
        api.sfx(s.metal ? 'alarm' : 'beep');
        renderBag(s);
        locked = false;
        api.cancel(stuckTimer);
        stuckTimer = api.after(7, () => vip.pulse(true));
      });
    }

    function renderBag(s) {
      bag.replaceChildren(
        ...s.slots.map((slot) => {
          const item = h('div', { class: `bag-item ${slot.banned ? 'is-banned' : ''}` }, slot.icon);
          const cell = h('button', { class: 'bag-cell' }, item);
          if (slot.hidden) {
            const cover = h('div', { class: 'bag-cover' }, slot.cover);
            cell.appendChild(cover);
            cell.addEventListener('click', () => {
              if (locked) return;
              api.sfx('tap');
              cover.classList.add('lifted');
              setTimeout(() => cover.classList.remove('lifted'), 1100 - 500 * d);
            });
          }
          return cell;
        }),
      );
      bag.classList.toggle('xray', xray);
    }

    function decide(suspicious) {
      if (locked) return;
      locked = true;
      api.cancel(stuckTimer);
      const s = students[idx];
      const right = suspicious === s.hasBanned;
      // Reveal everything after the decision.
      bag.querySelectorAll('.bag-cover').forEach((c) => c.classList.add('lifted', 'stay'));
      bag.querySelectorAll('.is-banned').forEach((c) => c.classList.add('flag'));
      getState().stats.bagsChecked++;
      saveState();
      if (right) {
        api.correct(walker);
        vip.pulse(false);
      } else {
        api.wrong(walker);
        mistakes++;
        if (mistakes >= 2 && !vip.used) vip.pulse(true);
        api.toast(s.hasBanned ? '😬 A banned item slipped through!' : '😕 That bag was clean.', 'error');
      }
      walker.className = `walker ${suspicious ? 'walk-office' : 'walk-out'}`;
      api.after(right ? 1.0 : 1.6, () => {
        idx++;
        nextStudent();
      });
    }

    function startXray() {
      xray = true;
      vip.pulse(false);
      bag.classList.add('xray');
      api.toast(`🩻 X-Ray Vision for ${BOOSTS.xraySeconds} seconds!`, 'success');
      api.after(BOOSTS.xraySeconds, () => {
        xray = false;
        bag.classList.remove('xray');
        api.toast('X-Ray Vision ended.');
      });
    }

    api.after(0.4, nextStudent);
    return { destroy() {} };
  },
};
