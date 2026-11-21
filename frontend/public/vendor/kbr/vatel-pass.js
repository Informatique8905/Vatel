// vatel-pass.js — champ mot de passe maison, animations KBR-UI dans le look
// des maquettes : champ identique à .fld input, chaque caractère tapé « pop »,
// la bascule œil décompose les points en lettres (flip en cascade), jauge
// optionnelle Faible → Fort. Usage : <vatel-pass meter placeholder="…"></vatel-pass>
const STYLE = `<style>
  :host{display:block;font:inherit}
  .wrap{position:relative;display:flex}
  input{height:56px;width:100%;box-sizing:border-box;border:1px solid #E3E3E3;border-radius:14px;
    padding:0 56px 0 16px;font:inherit;font-size:17px;color:transparent;caret-color:#1D1D1B;
    background:#fff;outline:none;transition:border-color .18s ease,box-shadow .25s ease}
  input:focus{border-color:#2B85BB}
  input::placeholder{color:#9a9a9a}
  .disp{position:absolute;left:17px;top:0;bottom:0;right:56px;display:flex;align-items:center;
    pointer-events:none;font-size:17px;color:#1D1D1B;overflow:hidden;white-space:pre}
  .c{display:inline-block;transition:transform .32s cubic-bezier(.34,1.4,.64,1),opacity .18s ease,filter .2s ease}
  .in{opacity:0;transform:translateY(60%) scale(.5);filter:blur(4px);transition:none}
  .eye{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:40px;height:40px;
    border:0;background:transparent;color:#5C5C5C;display:flex;align-items:center;justify-content:center;
    cursor:pointer;border-radius:20px;transition:background-color .18s ease,color .18s ease}
  .eye:hover{background:#F2F2F2;color:#1D1D1B}
  .eye:focus-visible{outline:2px solid #2B85BB;outline-offset:2px}
  .eye svg{display:block;animation:vp-pop .38s cubic-bezier(.34,1.6,.64,1)}
  @keyframes vp-pop{0%{transform:scale(.5)}60%{transform:scale(1.18)}100%{transform:scale(1)}}
  .wrap.pulse input{box-shadow:0 0 0 3px #E8F3FC}
  .meter{display:flex;align-items:center;gap:10px;margin-top:10px}
  .bar{flex:1;height:6px;border-radius:3px;background:#EDEDED;overflow:hidden}
  .fill{display:block;height:100%;border-radius:3px;width:0;
    transition:width .5s cubic-bezier(.25,.7,.25,1),background-color .5s ease}
  .mlab{font-size:13px;font-weight:700;font-variant-numeric:tabular-nums;min-width:44px;text-align:right;
    transition:color .4s ease}
  @media (prefers-reduced-motion:reduce){
    .c{transition:none!important}
    .in{opacity:1;transform:none;filter:none}
    .eye svg{animation:none}
    .fill,.mlab{transition:none}
  }
</style>`;

const EYE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7c2 0 3.8.8 5.3 1.8M22 12s-3.5 7-10 7c-2 0-3.8-.8-5.3-1.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/><path d="m3 3 18 18"/></svg>';

const COLORS = ["#FF5959", "#FF5959", "#FDCA12", "#67B2E8", "#1E7F4F"];
const LABELS = ["", "Faible", "Moyen", "Bon", "Fort"];

class VatelPass extends HTMLElement {
  static get observedAttributes() { return ["placeholder", "meter", "label"]; }

  connectedCallback() {
    if (this._ready) return;
    this._ready = true;
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `${STYLE}
      <div class="wrap">
        <input type="password"/>
        <div class="disp" aria-hidden="true"></div>
        <button type="button" class="eye" aria-label="Afficher le mot de passe">${EYE}</button>
      </div>
      <div class="meter" hidden>
        <span class="bar"><span class="fill"></span></span><span class="mlab"></span>
      </div>`;
    this._wrap = root.querySelector(".wrap");
    this._in = root.querySelector("input");
    this._disp = root.querySelector(".disp");
    this._eye = root.querySelector(".eye");
    this._meter = root.querySelector(".meter");
    this._fill = root.querySelector(".fill");
    this._mlab = root.querySelector(".mlab");
    this._show = false;
    this._val = "";
    this._chars = [];
    this._apply();
    this._in.addEventListener("input", () => {
      this._val = this._in.value;
      this._render(false);
      this._meterUpd();
      this.dispatchEvent(new CustomEvent("input", { bubbles: true, composed: true, detail: { value: this._val } }));
    });
    this._in.addEventListener("change", () => {
      this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true, detail: { value: this._val } }));
    });
    this._eye.addEventListener("click", () => this._toggle());
  }

  attributeChangedCallback() { if (this._ready) this._apply(); }

  _apply() {
    this._in.placeholder = this.getAttribute("placeholder") ?? "";
    this._in.setAttribute("aria-label", this.getAttribute("label") ?? "Mot de passe");
    this._meter.hidden = !this.hasAttribute("meter");
  }

  _toggle() {
    this._show = !this._show;
    this._in.type = this._show ? "text" : "password";
    this._eye.innerHTML = this._show ? EYE_OFF : EYE;
    this._eye.setAttribute("aria-label", this._show ? "Masquer le mot de passe" : "Afficher le mot de passe");
    this._wrap.classList.add("pulse");
    setTimeout(() => this._wrap.classList.remove("pulse"), 400);
    this._render(true); // décomposition : les points basculent en lettres en cascade
  }

  _render(flip) {
    const chars = [...this._val];
    const prev = this._chars;
    const next = [];
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      const glyph = this._show ? ch : "•";
      if (!flip && prev[i] && prev[i].ch === ch && prev[i].glyph === glyph) { next.push(prev[i]); continue; }
      const c = document.createElement("span");
      c.className = "c in";
      c.textContent = glyph;
      c.ch = ch;
      c.glyph = glyph;
      next.push(c);
    }
    this._disp.textContent = "";
    next.forEach((c, i) => {
      this._disp.appendChild(c);
      if (c.classList.contains("in")) {
        const delay = flip ? i * 32 : 0;
        requestAnimationFrame(() => setTimeout(() => c.classList.remove("in"), delay));
      }
    });
    this._chars = next;
    this.setAttribute("aria-valuetext", `${chars.length} caractères`);
  }

  _meterUpd() {
    if (this._meter.hidden) return;
    const v = this._val;
    const s = !v.length ? 0 : Math.min(4,
      (v.length >= 8) + ((/[a-z]/.test(v) && /[A-Z]/.test(v)) ? 1 : 0)
      + (/\d/.test(v) ? 1 : 0) + (/[^A-Za-z0-9]/.test(v) ? 1 : 0) + (v.length >= 12 ? 1 : 0));
    this._fill.style.width = `${s * 25}%`;
    this._fill.style.background = COLORS[s];
    this._mlab.textContent = LABELS[s];
    this._mlab.style.color = COLORS[s];
  }

  get value() { return this._val; }
  set value(v) { this._in.value = v ?? ""; this._val = this._in.value; this._render(false); this._meterUpd(); }
}
customElements.define("vatel-pass", VatelPass);
