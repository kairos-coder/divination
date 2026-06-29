/**
 * altar-mason.js · Digital Divination
 * Renders an altar scene from a JSON definition.
 * No dependencies. Pure DOM + CSS.
 *
 * Usage:
 *   const mason = new AltarMason('#altar-root', 'json/first-altar.json');
 *   mason.build();
 */

class AltarMason {
  constructor(selector, jsonPath) {
    this.root     = document.querySelector(selector);
    this.jsonPath = jsonPath;
    this.scene    = null;
    this.palette  = {};
    this.anims    = {};
    this._kfDone  = new Set();
  }

  // ── ENTRY ──────────────────────────────────────────────────────────────────

  async build() {
    try {
      const res  = await fetch(this.jsonPath);
      this.scene = await res.json();
    } catch (e) {
      console.error('[AltarMason] Failed to load scene JSON:', e);
      return;
    }
    this.palette = this.scene.palette    || {};
    this.anims   = this.scene.animations || {};
    this._injectFonts();
    this._injectBase();
    this._render();
  }

  // ── FONTS & BASE CSS ───────────────────────────────────────────────────────

  _injectFonts() {
    if (document.querySelector('#am-fonts')) return;
    const link = document.createElement('link');
    link.id   = 'am-fonts';
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cinzel:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;1,300;1,400&display=swap';
    document.head.appendChild(link);
  }

  _injectBase() {
    if (document.querySelector('#am-base')) return;
    const p = this.palette;
    const s = document.createElement('style');
    s.id = 'am-base';
    s.textContent = `
      *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }

      body {
        background: ${p.void || '#060610'};
        background-image:
          radial-gradient(ellipse 70% 50% at 10% 5%,  #120828 0%, transparent 55%),
          radial-gradient(ellipse 50% 40% at 90% 95%, #081420 0%, transparent 55%),
          radial-gradient(ellipse 30% 60% at 80% 20%, #0a0820 0%, transparent 50%);
        font-family: 'Cormorant Garamond', Georgia, serif;
        color: ${p.text || '#f0ead8'};
        min-height: 100vh;
        overflow-x: hidden;
      }

      body::after {
        content:'';
        position:fixed; inset:0;
        background: radial-gradient(ellipse at center, transparent 35%, rgba(0,0,0,0.75) 100%);
        pointer-events:none; z-index:0;
      }

      #altar-root {
        position: relative; z-index: 2;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        min-height: 100vh;
        padding: 2rem 1rem;
      }

      /* ── nav match ── */
      .am-nav {
        position:fixed; top:0; left:0; right:0; height:56px;
        background: rgba(8,8,20,0.88); backdrop-filter:blur(20px);
        border-bottom: 1px solid ${p['border-gold'] || 'rgba(212,168,64,0.2)'};
        display:flex; align-items:center; justify-content:space-between;
        padding: 0 48px; z-index:200;
      }
      .am-nav-brand-title {
        font-family:'Cinzel Decorative',serif; font-size:13px;
        color:${p.gold}; letter-spacing:1.5px;
      }
      .am-nav-brand-sub {
        font-family:'Cinzel',serif; font-size:7px;
        letter-spacing:5px; color:${p['gold-dark']}; text-transform:uppercase;
      }
      .am-nav-links { display:flex; gap:24px; list-style:none; }
      .am-nav-links a {
        font-family:'Cinzel',serif; font-size:8px; letter-spacing:3px;
        text-transform:uppercase; color:${p['text-dim']};
        text-decoration:none; transition:color 0.2s;
      }
      .am-nav-links a:hover { color:${p['gold-light']}; }

      /* ── eyebrow / title ── */
      .am-eyebrow {
        font-family:'Cinzel',serif; font-size:9px;
        letter-spacing:8px; text-transform:uppercase;
        color:${p.gold}; opacity:0.5; margin-bottom:10px;
        text-align:center;
      }
      .am-scene-title {
        font-family:'Cinzel Decorative',serif;
        font-size: clamp(28px,5vw,52px); font-weight:900;
        color:${p['gold-light']};
        text-shadow: 0 0 80px rgba(212,168,64,0.2), 0 4px 16px rgba(0,0,0,0.9);
        letter-spacing:3px; text-align:center;
        margin-bottom:2.5rem;
      }

      /* ── atmosphere row ── */
      .am-atmosphere-row {
        display:flex; align-items:center; justify-content:space-between;
        width:100%; max-width:480px;
        margin-bottom:0.75rem;
        font-family:'Courier New', monospace;
      }

      /* ── surface row ── */
      .am-surface-row {
        display:flex; align-items:flex-end; justify-content:center;
        gap:2.8rem; position:relative; padding-bottom:0.25rem;
      }

      /* ── objects ── */
      .am-object {
        display:flex; flex-direction:column; align-items:center;
        position:relative; line-height:1.15;
      }
      .am-layer {
        display:block; text-align:center; white-space:pre;
        font-family:'Courier New', monospace;
      }

      /* ── surface / table ── */
      .am-surface {
        font-family:'Courier New', monospace;
        white-space:pre; line-height:1.1; text-align:center;
        margin-top:-1px;
      }

      /* ── rule ── */
      .am-rule {
        width:420px; max-width:80vw; height:1px;
        background:linear-gradient(90deg,transparent,${p.gold},transparent);
        margin:2rem auto; opacity:0.2;
      }

      /* ── inscription ── */
      .am-inscription {
        text-align:center; font-family:'Cormorant Garamond',serif;
        font-style:italic; font-size:clamp(16px,2.5vw,22px);
        color:${p['text-dim']}; letter-spacing:0.04em; line-height:1.9;
        margin-bottom:0.5rem;
      }
      .am-inscription em {
        color:${p.gold}; font-style:normal;
        text-shadow:0 0 20px rgba(212,168,64,0.2);
      }

      /* ── CTA ── */
      .am-cta {
        display:inline-block; margin-top:2rem;
        font-family:'Cinzel',serif; font-size:13px;
        letter-spacing:5px; text-transform:uppercase;
        color:#0a0a0a;
        background:linear-gradient(135deg,${p.gold},${p['gold-light']});
        border:none; padding:16px 52px; border-radius:10px;
        cursor:pointer; text-decoration:none; transition:all 0.3s;
        box-shadow:0 0 50px rgba(212,168,64,0.2);
      }
      .am-cta:hover {
        box-shadow:0 0 70px rgba(212,168,64,0.4);
        transform:translateY(-3px);
      }

      .am-secondary-links {
        display:flex; gap:12px; margin-top:1rem; flex-wrap:wrap;
        justify-content:center;
      }
      .am-btn-outline {
        font-family:'Cinzel',serif; font-size:9px; letter-spacing:3px;
        text-transform:uppercase; color:${p['text-dim']};
        background:transparent; border:1px solid ${p['border-gold'] || 'rgba(212,168,64,0.2)'};
        padding:10px 28px; border-radius:10px;
        cursor:pointer; text-decoration:none; transition:all 0.3s;
      }
      .am-btn-outline:hover {
        color:${p['gold-light']};
        border-color:${p.gold};
        box-shadow:0 0 20px rgba(212,168,64,0.1);
      }

      /* ── scroll cue ── */
      .am-scroll-cue {
        margin-top:2.5rem;
        font-family:'Cinzel',serif; font-size:7px;
        letter-spacing:5px; text-transform:uppercase;
        color:${p['text-dim']}; opacity:0.4;
      }
    `;
    document.head.appendChild(s);
  }

  // ── RENDER ─────────────────────────────────────────────────────────────────

  _render() {
    if (!this.root) return;
    this.root.innerHTML = '';

    // Nav
    this.root.appendChild(this._buildNav());

    // Spacer for fixed nav
    const sp = document.createElement('div');
    sp.style.height = '56px';
    this.root.appendChild(sp);

    // Eyebrow
    if (this.scene.eyebrow) {
      const ey = document.createElement('p');
      ey.className   = 'am-eyebrow';
      ey.textContent = this.scene.eyebrow;
      this.root.appendChild(ey);
    }

    // Title
    if (this.scene.title) {
      const tt = document.createElement('h1');
      tt.className   = 'am-scene-title';
      tt.textContent = this.scene.title;
      this.root.appendChild(tt);
    }

    const objects = [...(this.scene.objects || [])].sort((a, b) => a.order - b.order);

    // Atmosphere
    const atmoObjs = objects.filter(o => o.role === 'atmosphere');
    if (atmoObjs.length) {
      const row = document.createElement('div');
      row.className = 'am-atmosphere-row';
      atmoObjs.forEach(obj => {
        obj.layers.forEach(layer => row.appendChild(this._buildLayer(layer)));
      });
      this.root.appendChild(row);
    }

    // Scene wrap
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;position:relative;';

    // Object row
    const objRow = document.createElement('div');
    objRow.className = 'am-surface-row';
    const sceneObjs = objects.filter(o => o.role === 'object');
    sceneObjs.forEach(obj => objRow.appendChild(this._buildObject(obj)));
    wrap.appendChild(objRow);

    // Surface row
    const surfObjs = objects.filter(o => o.role === 'surface');
    surfObjs.forEach(obj => wrap.appendChild(this._buildSurface(obj)));

    this.root.appendChild(wrap);

    // Rule
    const rule = document.createElement('div');
    rule.className = 'am-rule';
    this.root.appendChild(rule);

    // Inscription
    if (this.scene.inscription) {
      const ins = document.createElement('p');
      ins.className = 'am-inscription';
      ins.innerHTML = `${this._esc(this.scene.inscription.line1)}<br><em>${this._esc(this.scene.inscription.line2)}</em>`;
      this.root.appendChild(ins);
    }

    // CTA
    if (this.scene.cta) {
      const cta = document.createElement('a');
      cta.className   = 'am-cta';
      cta.href        = this.scene.cta.href || '#';
      cta.textContent = this.scene.cta.text || 'Enter';
      this.root.appendChild(cta);

      const secondary = document.createElement('div');
      secondary.className = 'am-secondary-links';
      secondary.innerHTML = `
        <a href="celestial.html" class="am-btn-outline">☀ Celestial Grimoire</a>
        <a href="chthonic.html"  class="am-btn-outline">⬡ Chthonic Grimoire</a>
      `;
      this.root.appendChild(secondary);
    }

    // Scroll cue
    const cue = document.createElement('p');
    cue.className   = 'am-scroll-cue';
    cue.textContent = 'Past · Present · Future';
    this.root.appendChild(cue);
  }

  // ── NAV ────────────────────────────────────────────────────────────────────

  _buildNav() {
    const nav = document.createElement('nav');
    nav.className = 'am-nav';
    nav.innerHTML = `
      <div>
        <div class="am-nav-brand-title">Digital Divination</div>
        <div class="am-nav-brand-sub">Aspects of the Divine</div>
      </div>
      <ul class="am-nav-links">
        <li><a href="draw.html">Draw</a></li>
        <li><a href="oracle.html">Oracle</a></li>
        <li><a href="almanac.html">Almanac</a></li>
        <li><a href="celestial.html">☀ Celestial</a></li>
        <li><a href="chthonic.html">⬡ Chthonic</a></li>
        <li><a href="index.html">Home</a></li>
      </ul>
    `;
    return nav;
  }

  // ── OBJECT / SURFACE BUILDERS ──────────────────────────────────────────────

  _buildObject(obj) {
    const wrap = document.createElement('div');
    wrap.className       = 'am-object';
    wrap.dataset.objectId = obj.id;

    // Object-level float animation (e.g. skull)
    if (obj.animate) {
      this._applyAnimation(wrap, obj.animate, '0s');
    }

    (obj.layers || []).forEach(layer => wrap.appendChild(this._buildLayer(layer)));
    return wrap;
  }

  _buildSurface(obj) {
    const wrap = document.createElement('div');
    wrap.className       = 'am-surface';
    wrap.dataset.objectId = obj.id;
    (obj.layers || []).forEach(layer => {
      const el = this._buildLayer(layer);
      el.style.display = 'block';
      wrap.appendChild(el);
    });
    return wrap;
  }

  // ── LAYER BUILDER ──────────────────────────────────────────────────────────

  _buildLayer(layer) {
    const el = document.createElement('span');
    el.className       = 'am-layer';
    el.dataset.layerId = layer.id || '';
    el.textContent     = layer.chars || '';

    const style = layer.style || {};
    Object.entries(style).forEach(([prop, val]) => {
      const resolved = this._resolve(val);
      const camel    = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      el.style[camel] = resolved;
    });

    if (layer.animate) {
      this._applyAnimation(el, layer.animate, layer['animate-delay'] || '0s');
    }

    return el;
  }

  // ── ANIMATION ──────────────────────────────────────────────────────────────

  _applyAnimation(el, name, delay) {
    const def = this.anims[name];
    if (!def) return;
    if (!this._kfDone.has(name)) {
      this._injectKeyframe(name, def);
      this._kfDone.add(name);
    }
    el.style.animation = [
      name,
      def.duration  || '1s',
      def.easing    || 'ease',
      delay,
      def.iteration || '1',
      def.direction || 'normal'
    ].join(' ');
    el.style.transformOrigin = 'bottom center';
  }

  _injectKeyframe(name, def) {
    const frames = (def.keyframes || []).map(f => {
      const props = Object.entries(f)
        .filter(([k]) => k !== 'pct')
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
      return `${f.pct}%{${props}}`;
    }).join('\n');
    const s = document.createElement('style');
    s.textContent = `@keyframes ${name}{${frames}}`;
    document.head.appendChild(s);
  }

  // ── UTILITIES ──────────────────────────────────────────────────────────────

  _resolve(val) {
    if (typeof val === 'string' && this.palette[val]) return this.palette[val];
    return val;
  }

  _esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}

if (typeof module !== 'undefined') module.exports = AltarMason;
else window.AltarMason = AltarMason;
