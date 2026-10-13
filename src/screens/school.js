// My School: upgrade facilities and expand the school size.
// When funds are short, a rewarded "School Grant" ad gives a huge instant grant.
import { h, btn, fmt, toast, confetti, clearChildren, modal } from '../core/ui.js';
import { getState } from '../core/storage.js';
import { go } from '../core/router.js';
import { sfx } from '../core/audio.js';
import { showRewardedAd } from '../core/ads.js';
import { AD_UNITS } from '../core/config.js';
import {
  UPGRADES,
  SCHOOL_SIZES,
  upgradeLevel,
  upgradeCost,
  currentSize,
  nextSize,
  buyUpgrade,
  buyNextSize,
  incomePerHour,
  levelCoinMultiplier,
  addCoins,
  grantAmountFor,
} from '../core/economy.js';
import { topBar } from './common.js';
import { t, digits } from '../i18n/index.js';

export default {
  render(root) {
    const bar = topBar({ title: t('school.title'), onBack: () => go('home') });
    const body = h('div', { class: 'school-list' });
    root.append(bar, body);

    function offerGrant(cost, what) {
      const grant = grantAmountFor(cost);
      modal({
        title: t('school.grantTitle'),
        body: h(
          'div',
          { class: 'text-center' },
          h('div', { class: 'text-6xl my-2' }, '🏦'),
          h('p', { class: 'text-lg' }, t('school.grantShort', { what })),
          h('p', { class: 'mt-2' }, t('school.grantWatch')),
          h('div', { class: 'grant-amount' }, `${fmt(grant)} 🪙`),
        ),
        buttons: [
          { label: t('school.grantNotNow'), color: 'gray' },
          {
            label: t('school.grantGet'),
            color: 'gold',
            icon: '📺',
            onClick: () => {
              showRewardedAd(AD_UNITS.SCHOOL_GRANT, () => {
                addCoins(grant);
                sfx('coin');
                confetti(70);
                toast(t('school.grantReceived', { coins: fmt(grant) }), 'success', 2600);
                draw();
              });
            },
          },
        ],
      });
    }

    function draw() {
      const s = getState();
      clearChildren(body);
      const size = currentSize();
      const nx = nextSize();

      body.appendChild(
        h(
          'div',
          { class: 'school-hero' },
          h('div', { class: 'school-hero-icon float-y' }, size.icon),
          h(
            'div',
            { class: 'flex-1' },
            h('div', { class: 'school-hero-name' }, size.name),
            h('div', { class: 'school-hero-sub' }, t('school.sizeLine', { n: s.school.size + 1, total: SCHOOL_SIZES.length, max: size.maxUpgrade })),
            h('div', { class: 'school-hero-income' }, t('school.income', { n: fmt(incomePerHour()) })),
            h('div', { class: 'school-hero-sub' }, t('school.levelRewards', { n: digits(levelCoinMultiplier().toFixed(2)) })),
          ),
        ),
      );

      if (nx) {
        const can = s.coins >= nx.cost;
        body.appendChild(
          h(
            'div',
            { class: 'upgrade-card expand' },
            h('div', { class: 'upgrade-icon' }, nx.icon),
            h(
              'div',
              { class: 'flex-1' },
              h('div', { class: 'upgrade-name' }, t('school.expandTo', { name: nx.name })),
              h('div', { class: 'upgrade-desc' }, t('school.expandDesc', { mult: nx.incomeMult, max: nx.maxUpgrade })),
            ),
            can
              ? btn(`${fmt(nx.cost)} 🪙`, {
                  color: 'green',
                  size: 'sm',
                  onClick: () => {
                    if (buyNextSize() === 'ok') {
                      sfx('win');
                      confetti(100);
                      toast(t('school.welcome', { name: nx.name }), 'success');
                      draw();
                    }
                  },
                })
              : h(
                  'div',
                  { class: 'flex flex-col items-end gap-1' },
                  h('div', { class: 'cost-short' }, `${fmt(nx.cost)} 🪙`),
                  btn(t('school.grantBtn'), { color: 'gold', size: 'sm', icon: '📺', onClick: () => offerGrant(nx.cost, nx.name) }),
                ),
          ),
        );
      } else {
        body.appendChild(h('div', { class: 'upgrade-card expand' }, h('div', { class: 'upgrade-icon' }, '🏆'), h('div', { class: 'upgrade-name' }, t('school.biggest'))));
      }

      for (const up of UPGRADES) {
        const lvl = upgradeLevel(up.id);
        const maxed = lvl >= size.maxUpgrade;
        const cost = upgradeCost(up);
        const can = s.coins >= cost;
        let action;
        if (maxed) {
          action = h('div', { class: 'maxed' }, nx ? t('school.maxExpand') : t('school.max'));
        } else if (can) {
          action = btn(`${fmt(cost)} 🪙`, {
            color: 'green',
            size: 'sm',
            onClick: () => {
              const r = buyUpgrade(up);
              if (r === 'ok') {
                sfx('coin');
                toast(t('school.upgraded', { icon: up.icon, name: up.name, n: lvl + 1 }), 'success');
                draw();
              }
            },
          });
        } else {
          action = h(
            'div',
            { class: 'flex flex-col items-end gap-1' },
            h('div', { class: 'cost-short' }, `${fmt(cost)} 🪙`),
            btn(t('school.grantBtn'), { color: 'gold', size: 'sm', icon: '📺', onClick: () => offerGrant(cost, up.name) }),
          );
        }
        body.appendChild(
          h(
            'div',
            { class: 'upgrade-card' },
            h('div', { class: 'upgrade-icon' }, up.icon),
            h(
              'div',
              { class: 'flex-1 min-w-0' },
              h('div', { class: 'upgrade-name' }, `${up.name} `, h('span', { class: 'upgrade-lvl' }, t('school.lv', { n: lvl, max: size.maxUpgrade }))),
              h('div', { class: 'upgrade-desc' }, up.desc),
              h('div', { class: 'upgrade-bonus' }, t('school.bonus', { income: up.income, pct: Math.round(up.levelBonus * 100) })),
              h('div', { class: 'lvl-bar' }, h('div', { class: 'lvl-fill', style: { width: (lvl / size.maxUpgrade) * 100 + '%' } })),
            ),
            action,
          ),
        );
      }
    }

    draw();
    const onCoins = () => draw();
    window.addEventListener('mtl:coins', onCoins);
    return () => {
      bar.destroy();
      window.removeEventListener('mtl:coins', onCoins);
    };
  },
  onBack() {
    go('home');
    return true;
  },
};
