// grocery-tiles-card.js
import { CATEGORIES, categorize, emojiFor, splitQuantity, suggest, normalize } from './food-db.js';

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

const STYLE_ADD = `
  .addrow { display: flex; gap: 8px; margin-bottom: 4px; }
  .addrow input { flex: 1; font: inherit; font-size: 15px; padding: 10px 12px; border-radius: 8px; border: 1px solid var(--divider-color); background: var(--secondary-background-color); color: var(--primary-text-color); outline: none; }
  .addrow input:focus { border-color: var(--primary-color); }
  .addrow button { font: inherit; font-size: 20px; width: 44px; border-radius: 8px; border: 0; background: var(--primary-color); color: #fff; cursor: pointer; }
  .toast { position: sticky; bottom: 8px; margin: 8px auto 0; width: fit-content; max-width: 90%; background: var(--primary-text-color); color: var(--card-background-color); padding: 8px 14px; border-radius: 8px; font-size: 13px; }
  .tile.pending { opacity: .4; pointer-events: none; }
`;

const STYLE_MORE = `
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 6px 0 2px; }
  .chip { border-radius: 16px; padding: 5px 10px; background: var(--secondary-background-color); font-size: 13px; cursor: pointer; border: 0; color: var(--primary-text-color); font: inherit; }
  .menu { position: fixed; z-index: 10; background: var(--card-background-color); border: 1px solid var(--divider-color); border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,.2); min-width: 160px; }
  .menu button { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 10px 14px; font: inherit; color: var(--primary-text-color); cursor: pointer; }
  .menu button:hover { background: var(--secondary-background-color); }
  .menu input { width: calc(100% - 28px); margin: 8px 14px; font: inherit; }
`;

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

class GroceryTilesCard extends HTMLElement {
  static getConfigElement() { return document.createElement('grocery-tiles-card-editor'); }

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
    this._shell = null; // Hülle (inkl. Eingabefeld) neu aufbauen
    this._resubscribe();
    this._render();
  }

  set hass(hass) {
    const connChanged = this._hass?.connection !== hass?.connection;
    const stChanged = this._hass?.states?.[this._config?.entity] !== hass?.states?.[this._config?.entity];
    this._hass = hass;
    if (connChanged) this._resubscribe();
    // HA setzt hass bei jeder Zustandsänderung irgendeiner Entity — nur rendern, wenn uns etwas betrifft.
    if (stChanged || !this._shell) this._render();
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
  _chipsHtml() {
    if (!this._draft) return '';
    const names = [...this._done(), ...this._open()].map(t => t.name);
    const s = suggest(this._draft, names, 6);
    return s.length ? `<div class="chips">${s.map(n => `<button class="chip" data-name="${esc(n)}">${emojiFor(n, this._config.overrides)} ${esc(n)}</button>`).join('')}</div>` : '';
  }

  _tile(t, done) {
    return `<div class="tile${done ? ' done' : ''}" data-uid="${esc(t.uid)}" role="button" tabindex="0" aria-label="${esc(t.name)}${done ? ' (erledigt)' : ''}">
      <div class="emoji">${t.emoji}</div><div class="name">${esc(t.name)}</div>${t.qty ? `<div class="qty">${esc(t.qty)}</div>` : ''}</div>`;
  }

  // Hülle (Style, Karte, Titel, Eingabezeile, Container) wird EINMAL gebaut. Das Eingabefeld
  // überlebt so alle Updates — sonst verliert es bei jedem hass-Update den Fokus und HAs
  // Tastenkürzel („a" = Assist) fangen die nächste Taste ab.
  _buildShell() {
    const cfg = this._config;
    this.shadowRoot.innerHTML = `<style>${STYLE}${STYLE_ADD}${STYLE_MORE}</style><ha-card class="card" style="--gt-cols:${cfg.columns || 3}">
      ${cfg.title ? `<h1>${esc(cfg.title)}</h1>` : ''}
      <div class="addrow"><input class="add" type="text" placeholder="Artikel hinzufügen…" autocomplete="off" enterkeyhint="done"><button data-action="add" aria-label="Hinzufügen">+</button></div>
      <div class="chips-slot"></div><div class="body-slot"></div><div class="toast-slot"></div></ha-card>`;
    const root = this.shadowRoot;
    this._shell = {
      input: root.querySelector('input.add'),
      chips: root.querySelector('.chips-slot'),
      body: root.querySelector('.body-slot'),
      toast: root.querySelector('.toast-slot'),
    };
    const { input } = this._shell;
    input.addEventListener('input', () => { this._draft = input.value; this._renderChips(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); this._add(input.value); } });
    root.querySelector('[data-action="add"]').addEventListener('click', () => this._add(input.value));
  }

  _setDraft(v) {
    this._draft = v;
    if (this._shell) this._shell.input.value = v;
    this._renderChips();
  }

  _renderChips() {
    if (!this._shell) return;
    this._shell.chips.innerHTML = this._chipsHtml();
    this._shell.chips.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => this._add(c.dataset.name)));
  }

  _render() {
    if (!this._config) return;
    if (!this._shell) this._buildShell();
    const cfg = this._config;
    const st = this._hass?.states?.[cfg.entity];
    const gridClass = cfg.columns > 0 ? 'grid fixed' : 'grid';
    this._shell.input.disabled = !st || st.state === 'unavailable';
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
    this._shell.body.innerHTML = body;
    this._shell.toast.innerHTML = this._toastMsg ? `<div class="toast">${esc(this._toastMsg)}</div>` : '';
    this._renderChips();
    this._wireBody();
  }

  _wireBody() {
    const root = this._shell.body;
    root.querySelector('[data-action="clear"]')?.addEventListener('click', () => this._clearCompleted());
    root.querySelector('[data-action="more"]')?.addEventListener('click', () => { this._showAllRecent = true; this._render(); });
    root.querySelectorAll('.tile').forEach(el => {
      el.addEventListener('click', () => {
        if (this._menuJustOpened) { this._menuJustOpened = false; return; }
        this._toggle(el.dataset.uid);
      });
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._toggle(el.dataset.uid); } });
      // Long-Press (500 ms) → Menü Umbenennen/Löschen
      let timer;
      const start = () => { timer = setTimeout(() => { timer = null; this._openMenu(el.dataset.uid, el); }, 500); };
      const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
      el.addEventListener('pointerdown', start);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => el.addEventListener(ev, cancel));
      el.addEventListener('contextmenu', e => { e.preventDefault(); this._openMenu(el.dataset.uid, el); });
    });
  }

  _openMenu(uid, anchor) {
    this._closeMenu();
    const it = this._items.find(i => i.uid === uid);
    if (!it) return;
    this._menuJustOpened = true;
    const r = anchor.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.style.left = `${Math.min(r.left, window.innerWidth - 180)}px`;
    menu.style.top = `${Math.min(r.bottom + 4, window.innerHeight - 120)}px`;
    menu.innerHTML = `<button data-action="rename">Umbenennen</button><button data-action="delete">Löschen</button>`;
    menu.querySelector('[data-action="delete"]').addEventListener('click', () => { this._closeMenu(); this._remove(uid); });
    menu.querySelector('[data-action="rename"]').addEventListener('click', () => {
      menu.innerHTML = `<input type="text" value="${esc(it.summary)}" aria-label="Neuer Name">`;
      const inp = menu.querySelector('input'); inp.focus(); inp.select();
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') { this._closeMenu(); this._rename(uid, inp.value); }
        if (e.key === 'Escape') this._closeMenu();
      });
    });
    this.shadowRoot.appendChild(menu);
    this._menu = menu;
    setTimeout(() => document.addEventListener('pointerdown', this._outsideHandler = e => { if (!e.composedPath().includes(menu)) this._closeMenu(); }, { once: true }), 0);
  }

  _closeMenu() {
    this._menu?.remove();
    this._menu = null;
    if (this._outsideHandler) { document.removeEventListener('pointerdown', this._outsideHandler); this._outsideHandler = null; }
  }

  // ── Aktionen ────────────────────────────────────────────────
  _toast(msg) {
    this._toastMsg = msg;
    this._render();
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { this._toastMsg = ''; this._render(); }, 4000);
  }

  _call(service, data) {
    return this._hass.callService('todo', service, data, { entity_id: this._config.entity });
  }

  // Optimistisch: lokale Kopie ändern, rendern, Service rufen, bei Fehler alte Items zurück.
  async _optimistic(mutate, service, data) {
    const before = this._items;
    this._items = mutate(before.map(i => ({ ...i })));
    this._render();
    try { await this._call(service, data); }
    catch (e) { this._items = before; this._toast(e?.message || 'Fehler'); }
  }

  _toggle(uid) {
    const it = this._items.find(i => i.uid === uid);
    if (!it) return;
    const status = it.status === 'completed' ? 'needs_action' : 'completed';
    this._optimistic(items => items.map(i => i.uid === uid ? { ...i, status } : i), 'update_item', { item: uid, status });
  }

  async _add(text) {
    const summary = String(text || '').trim().replace(/\s+/g, ' ');
    if (!summary) return;
    const key = normalize(summary);
    const open = this._items.find(i => i.status === 'needs_action' && normalize(i.summary) === key);
    if (open) { this._setDraft(''); this._toast(`„${splitQuantity(open.summary).name}" ist schon auf der Liste`); return; }
    const done = this._items.find(i => i.status === 'completed' && normalize(i.summary) === key);
    if (done) { this._setDraft(''); this._toggle(done.uid); return; }
    this._setDraft('');
    const tmp = { uid: `tmp-${Date.now()}`, summary, status: 'needs_action' };
    this._optimistic(items => [...items, tmp], 'add_item', { item: summary });
  }

  _rename(uid, text) {
    const rename = String(text || '').trim();
    if (!rename) return;
    this._optimistic(items => items.map(i => i.uid === uid ? { ...i, summary: rename } : i), 'update_item', { item: uid, rename });
  }

  _remove(uid) {
    const it = this._items.find(i => i.uid === uid);
    if (!it) return;
    this._optimistic(items => items.filter(i => i.uid !== uid), 'remove_item', { item: [uid] });
    this._toast(`„${splitQuantity(it.summary).name}" gelöscht`);
  }

  _clearCompleted() {
    const n = this._items.filter(i => i.status === 'completed').length;
    if (!n) return;
    if (!confirm(`${n} erledigte Einträge endgültig löschen?`)) return;
    this._optimistic(items => items.filter(i => i.status !== 'completed'), 'remove_completed_items', {});
  }
}

class GroceryTilesCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement('ha-form');
      this._form.computeLabel = s => ({ entity: 'To-do-Entity', title: 'Titel', columns: 'Spalten (0 = automatisch)', show_recent: '„Zuletzt" anzeigen', recent_limit: 'Max. Kacheln unter „Zuletzt"', show_clear_completed: 'Button „Erledigte löschen"' }[s.name] || s.name);
      this._form.schema = [
        { name: 'entity', required: true, selector: { entity: { domain: 'todo' } } },
        { name: 'title', selector: { text: {} } },
        { name: 'columns', selector: { number: { min: 0, max: 8, mode: 'box' } } },
        { name: 'show_recent', selector: { boolean: {} } },
        { name: 'recent_limit', selector: { number: { min: 1, max: 200, mode: 'box' } } },
        { name: 'show_clear_completed', selector: { boolean: {} } },
      ];
      this._form.addEventListener('value-changed', e => {
        this._config = { ...this._config, ...e.detail.value };
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = { ...DEFAULTS, ...this._config };
  }
}

customElements.define('grocery-tiles-card-editor', GroceryTilesCardEditor);
customElements.define('grocery-tiles-card', GroceryTilesCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: 'grocery-tiles-card', name: 'Grocery Tiles Card', description: 'Einkaufsliste als Emoji-Kacheln nach Kategorien (Bring-Style) für jede todo-Entity.', preview: true });
