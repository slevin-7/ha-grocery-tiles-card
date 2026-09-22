// grocery-tiles-card.js
import { CATEGORIES, categorize, emojiFor, splitQuantity } from './food-db.js';

const DEFAULTS = { title: '', columns: 0, show_recent: true, recent_limit: 30, show_clear_completed: true, overrides: [] };

const STYLE = `
  :host { display: block; }
  ha-card, .card { display: block; background: var(--card-background-color); border-radius: 12px; padding: 12px 12px 8px; box-shadow: var(--ha-card-box-shadow, none); border: var(--ha-card-border-width, 1px) solid var(--divider-color); color: var(--primary-text-color); font-family: inherit; }
  h1 { font-size: 18px; font-weight: 500; margin: 0 0 8px; }
  .group { margin-top: 12px; }
  .group-head { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--secondary-text-color); padding: 0 0 6px 8px; border-left: 3px solid var(--gt-color); }
  .group-head .count { margin-left: auto; opacity: .7; }
  .grid { display: grid; gap: 8px; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); }
  .grid.fixed { grid-template-columns: repeat(var(--gt-cols), 1fr); }
  .tile { aspect-ratio: 1; border-radius: 8px; background: var(--secondary-background-color); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 6px; cursor: pointer; user-select: none; -webkit-user-select: none; transition: transform .12s, opacity .15s; }
  .tile:active { transform: scale(.96); }
  .tile .emoji { font-size: 32px; line-height: 1.1; }
  .tile .name { font-size: 13px; line-height: 1.2; margin-top: 4px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .tile .qty { font-size: 11px; color: var(--secondary-text-color); margin-top: 2px; }
  .tile.done { opacity: .55; }
  .tile.done .name { text-decoration: line-through; }
  .recent-head { display: flex; align-items: center; margin-top: 16px; padding-top: 10px; border-top: 1px solid var(--divider-color); font-size: 13px; color: var(--secondary-text-color); }
  .recent-head .spacer { flex: 1; }
  .empty, .warn { padding: 16px 8px; color: var(--secondary-text-color); font-size: 14px; }
  .warn { color: var(--error-color, #db4437); }
  button.link { background: none; border: 0; color: var(--primary-color); cursor: pointer; font: inherit; font-size: 13px; padding: 4px 8px; }
`;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

class GroceryTilesCard extends HTMLElement {
  static getStubConfig(hass) {
    const first = Object.keys(hass?.states || {}).find(id => id.startsWith('todo.'));
    return { entity: first || 'todo.einkaufsliste' };
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._items = [];
    this._unsub = null;
    this._subscribedFor = null; // `${entity}` der laufenden Subscription
    this._showAllRecent = false;
  }

  setConfig(config) {
    if (!config || !config.entity || !String(config.entity).startsWith('todo.')) {
      throw new Error('grocery-tiles-card: "entity" (todo.*) fehlt');
    }
    this._config = { ...DEFAULTS, ...config, overrides: Array.isArray(config.overrides) ? config.overrides : [] };
    this._resubscribe();
    this._render();
  }

  set hass(hass) {
    const connChanged = this._hass?.connection !== hass?.connection;
    this._hass = hass;
    if (connChanged) this._resubscribe();
    this._render();
  }

  connectedCallback() { this._resubscribe(); }
  disconnectedCallback() { this._unsubscribe(); }

  getCardSize() { return 3 + this._groups().length; }
  getGridOptions() { return { columns: 'full' }; }

  _unsubscribe() {
    if (this._unsub) { try { this._unsub(); } catch (_) { /* ignore */ } }
    this._unsub = null;
    this._subscribedFor = null;
  }

  async _resubscribe() {
    const entity = this._config?.entity;
    const conn = this._hass?.connection;
    if (!entity || !conn || !this.isConnected) return;
    if (this._subscribedFor === entity && this._unsub) return;
    this._unsubscribe();
    this._subscribedFor = entity;
    try {
      this._unsub = await conn.subscribeMessage(
        msg => { this._items = Array.isArray(msg?.items) ? msg.items : []; this._render(); },
        { type: 'todo/item/subscribe', entity_id: entity },
      );
    } catch (e) {
      this._subscribedFor = null;
      console.error('grocery-tiles-card: subscribe failed', e);
    }
  }

  // ── Ableitungen ─────────────────────────────────────────────
  _decorate(item) {
    const { name, qty } = splitQuantity(item.summary);
    return { ...item, name, qty, emoji: emojiFor(name, this._config.overrides), category: categorize(name, this._config.overrides) };
  }
  _open() { return this._items.filter(i => i.status === 'needs_action').map(i => this._decorate(i)); }
  _done() { return this._items.filter(i => i.status === 'completed').map(i => this._decorate(i)).reverse(); }
  _groups() {
    const open = this._open();
    return CATEGORIES
      .map(c => ({ c, tiles: open.filter(t => t.category === c.id).sort((a, b) => a.name.localeCompare(b.name, 'de')) }))
      .filter(g => g.tiles.length);
  }

  // ── Rendering ───────────────────────────────────────────────
  _tile(t, done) {
    return `<div class="tile${done ? ' done' : ''}" data-uid="${esc(t.uid)}" role="button" tabindex="0" aria-label="${esc(t.name)}${done ? ' (erledigt)' : ''}">
      <div class="emoji">${t.emoji}</div><div class="name">${esc(t.name)}</div>${t.qty ? `<div class="qty">${esc(t.qty)}</div>` : ''}</div>`;
  }

  _render() {
    if (!this._config) return;
    const cfg = this._config;
    const st = this._hass?.states?.[cfg.entity];
    const gridClass = cfg.columns > 0 ? 'grid fixed' : 'grid';
    let body = '';
    if (!st) {
      body = `<div class="warn">Entity nicht gefunden: ${esc(cfg.entity)}</div>`;
    } else {
      const unavailable = st.state === 'unavailable' || st.state === 'unknown';
      const groups = this._groups();
      const done = this._done();
      if (unavailable) body += `<div class="warn">${esc(cfg.entity)} ist nicht erreichbar.</div>`;
      body += groups.length
        ? groups.map(g => `<section class="group" style="--gt-color:${g.c.color}">
            <div class="group-head"><span>${g.c.emoji}</span><span>${esc(g.c.label)}</span><span class="count">${g.tiles.length}</span></div>
            <div class="${gridClass}">${g.tiles.map(t => this._tile(t, false)).join('')}</div></section>`).join('')
        : `<div class="empty">Liste ist leer.</div>`;
      if (cfg.show_recent && done.length) {
        const shown = this._showAllRecent ? done : done.slice(0, cfg.recent_limit);
        const rest = done.length - shown.length;
        body += `<div class="recent-head"><span>Zuletzt</span><span class="spacer"></span>
          ${cfg.show_clear_completed ? `<button class="link" data-action="clear">Erledigte löschen</button>` : ''}</div>
          <div class="${gridClass} recent">${shown.map(t => this._tile(t, true)).join('')}</div>
          ${rest > 0 ? `<button class="link" data-action="more">mehr anzeigen (${rest})</button>` : ''}`;
      }
    }
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card class="card" style="--gt-cols:${cfg.columns || 3}">
      ${cfg.title ? `<h1>${esc(cfg.title)}</h1>` : ''}${body}</ha-card>`;
    this.shadowRoot.querySelector('[data-action="more"]')?.addEventListener('click', () => { this._showAllRecent = true; this._render(); });
  }
}

customElements.define('grocery-tiles-card', GroceryTilesCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'grocery-tiles-card', name: 'Grocery Tiles Card', description: 'Einkaufsliste als Emoji-Kacheln nach Kategorien (Bring-Style) für jede todo-Entity.', preview: true });
