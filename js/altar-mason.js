/**
 * altar-mason.js
 * Renders an altar scene from a JSON definition.
 * No dependencies. Pure DOM + CSS.
 *
 * Usage:
 *   const mason = new AltarMason('#altar-root', 'first-altar.json');
 *   mason.build();
 */

class AltarMason {
  constructor(selector, jsonPath) {
    this.root = document.querySelector(selector);
    this.jsonPath = jsonPath;
    this.scene = null;
    this.palette = {};
    this.animations = {};
    this._injectedKeyframes = new Set();
  }

  // ─── ENTRY POINT ────────────────────────────────────────────────────────────

  async build() {
    try {
      const res = await fetch(this.jsonPath);
      this.scene = await res.json();
    } catch (e) {
      console.error('[AltarMason] Failed to load scene JSON:', e);
      return;
    }

    this.palette    = this.scene.palette    || {};
    this.animations = this.scene.animations || {};

    this._applyBodyStyles();
    this._injectBaseCSS();
    this._renderScene();
  }

  // ─── BODY + BASE STYLES ─────────────────────────────────────────────────────

  _applyBodyStyles() {
    const p = this.palette;
    document.body.style.background   = p.void  || '#0a0806';
    document.body.style.color        = p.bone  || '#d4c9a8';
    document.body.style.fontFamily   = "'IM Fell English', serif";
    document.body.style.minHeight    = '100vh';
    document.body.style.display      = 'flex';
    document.body.style.flexDirection = 'column';
    document.body.style.alignItems   = 'center';
    document.body.style.justifyContent = 'center';
    document.body.style.overflow     = 'hidden';
  }

  _injectBaseCSS() {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=IM+Fell+English:ital@0;1&display=swap');

      * { margin: 0; padding: 0; box-sizing: border-box; }

      body::before {
        content: '';
        position: fixed;
        inset: 0;
        background: radial-gradient(ellipse at center, transparent 40%, #000 100%);
        pointer-events: none;
        z-index: 100;
      }

      .am-scene-title {
        font-family: 'Cinzel', serif;
        color: ${this.palette.gold || '#c9a84c'};
        font-size: clamp(0.6rem, 1.4vw, 0.8rem);
        letter-spacing: 0.4em;
        text-transform: uppercase;
        margin-bottom: 2rem;
        opacity: 0.65;
      }

      .am-surface-row {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: 2.5rem;
        position: relative;
        padding-bottom: 0.5rem;
      }

      .am-atmosphere-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        max-width: 480px;
        margin-bottom: 0.5rem;
        opacity: 0.4;
      }

      .am-object {
        display: flex;
        flex-direction: column;
        align-items: center;
        position: relative;
        line-height: 1.15;
      }

      .am-layer {
        display: block;
        text-align: center;
        white-space: pre;
        position: relative;
      }

      .am-surface {
        font-family: 'Courier New', monospace;
        white-space: pre;
        line-height: 1.1;
        text-align: center;
      }

      .am-rule {
        width: 120px;
        height: 1px;
        background: linear-gradient(to right, transparent, ${this.palette.gold || '#c9a84c'}, transparent);
        margin: 1.5rem auto;
        opacity: 0.3;
      }

      .am-inscription {
        text-align: center;
        color: ${this.palette.ash || '#7a7060'};
        font-family: 'IM Fell English', serif;
        font-style: italic;
        font-size: clamp(0.75rem, 1.8vw, 0.95rem);
        letter-spacing: 0.06em;
        line-height: 1.8;
      }

      .am-inscription em {
        color: ${this.palette.gold || '#c9a84c'};
        font-style: normal;
      }

      .am-cta {
        display: block;
        margin-top: 1.8rem;
        font-family: 'Cinzel', serif;
        font-size: 0.7rem;
        letter-spacing: 0.35em;
        text-transform: uppercase;
        color: ${this.palette.ash || '#7a7060'};
        text-decoration: none;
        opacity: 0.5;
        transition: opacity 0.4s, color 0.4s;
      }
      .am-cta:hover {
        opacity: 1;
        color: ${this.palette.gold || '#c9a84c'};
      }
    `;
    document.head.appendChild(style);
  }

  // ─── SCENE RENDERER ─────────────────────────────────────────────────────────

  _renderScene() {
    if (!this.root) return;
    this.root.innerHTML = '';

    // Title
    if (this.scene.title) {
      const title = document.createElement('p');
      title.className = 'am-scene-title';
      title.textContent = this.scene.title;
      this.root.appendChild(title);
    }

    // Sort objects by order
    const objects = [...(this.scene.objects || [])].sort((a, b) => a.order - b.order);

    // Atmosphere row (role: atmosphere)
    const atmoObjs = objects.filter(o => o.role === 'atmosphere');
    if (atmoObjs.length) {
      const atmoRow = document.createElement('div');
      atmoRow.className = 'am-atmosphere-row';
      atmoObjs.forEach(obj => {
        obj.layers.forEach(layer => {
          const el = this._buildLayer(layer);
          atmoRow.appendChild(el);
        });
      });
      this.root.appendChild(atmoRow);
    }

    // Surface row (role: surface + objects)
    const surfaceObjs = objects.filter(o => o.role === 'surface');
    const sceneObjs   = objects.filter(o => o.role === 'object');

    const surfaceWrap = document.createElement('div');
    surfaceWrap.style.position = 'relative';
    surfaceWrap.style.display  = 'flex';
    surfaceWrap.style.flexDirection = 'column';
    surfaceWrap.style.alignItems    = 'center';

    // Object row sits above surface
    const objectRow = document.createElement('div');
    objectRow.className = 'am-surface-row';
    sceneObjs.forEach(obj => {
      const el = this._buildObject(obj);
      objectRow.appendChild(el);
    });
    surfaceWrap.appendChild(objectRow);

    // Surface (table) renders below objects
    surfaceObjs.forEach(obj => {
      const el = this._buildSurface(obj);
      surfaceWrap.appendChild(el);
    });

    this.root.appendChild(surfaceWrap);

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
      cta.className = 'am-cta';
      cta.href = this.scene.cta.href || '#';
      cta.textContent = this.scene.cta.text || 'Enter';
      this.root.appendChild(cta);
    }
  }

  // ─── OBJECT BUILDER ─────────────────────────────────────────────────────────

  _buildObject(obj) {
    const wrap = document.createElement('div');
    wrap.className = 'am-object';
    wrap.dataset.objectId = obj.id;

    (obj.layers || []).forEach(layer => {
      const el = this._buildLayer(layer);
      wrap.appendChild(el);
    });

    return wrap;
  }

  _buildSurface(obj) {
    const wrap = document.createElement('div');
    wrap.className = 'am-surface';
    wrap.dataset.objectId = obj.id;

    const lines = [];
    (obj.layers || []).forEach(layer => {
      lines.push(this._resolveColor(layer.chars || '', layer.style || {}));
    });

    // Render each surface layer as a line
    (obj.layers || []).forEach(layer => {
      const el = this._buildLayer(layer);
      el.style.display = 'block';
      wrap.appendChild(el);
    });

    return wrap;
  }

  // ─── LAYER BUILDER ──────────────────────────────────────────────────────────

  _buildLayer(layer) {
    const el = document.createElement('span');
    el.className = 'am-layer';
    el.dataset.layerId = layer.id || '';
    el.textContent = layer.chars || '';

    // Apply styles, resolving palette references
    const style = layer.style || {};
    Object.entries(style).forEach(([prop, val]) => {
      const resolved = this._resolveValue(val);
      // Convert kebab-case to camelCase for el.style
      const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      el.style[camel] = resolved;
    });

    // Font default for glyph layers
    if (!style['font-family']) {
      el.style.fontFamily = "'Courier New', monospace";
    }

    // Apply animation
    if (layer.animate) {
      this._applyAnimation(el, layer.animate, layer['animate-delay'] || '0s');
    }

    return el;
  }

  // ─── ANIMATION ──────────────────────────────────────────────────────────────

  _applyAnimation(el, animName, delay) {
    const def = this.animations[animName];
    if (!def) return;

    // Inject keyframe if not already done
    if (!this._injectedKeyframes.has(animName)) {
      this._injectKeyframe(animName, def);
      this._injectedKeyframes.add(animName);
    }

    el.style.animation = [
      `${animName}`,
      def.duration      || '1s',
      def.easing        || 'ease',
      delay,
      def.iteration     || '1',
      def.direction     || 'normal'
    ].join(' ');

    el.style.transformOrigin = 'bottom center';
  }

  _injectKeyframe(name, def) {
    const frames = (def.keyframes || []).map(f => {
      const props = Object.entries(f)
        .filter(([k]) => k !== 'pct')
        .map(([k, v]) => `${k}: ${v}`)
        .join('; ');
      return `${f.pct}% { ${props} }`;
    }).join('\n');

    const style = document.createElement('style');
    style.textContent = `@keyframes ${name} {\n${frames}\n}`;
    document.head.appendChild(style);
  }

  // ─── UTILITIES ──────────────────────────────────────────────────────────────

  // Resolve palette token or pass through raw value
  _resolveValue(val) {
    if (typeof val === 'string' && this.palette[val]) {
      return this.palette[val];
    }
    return val;
  }

  _resolveColor(chars, style) {
    return chars; // placeholder for future colored spans
  }

  _esc(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
}

// Auto-export for module or global use
if (typeof module !== 'undefined') module.exports = AltarMason;
else window.AltarMason = AltarMason;
