// roll-text.js — composant maison dans le style KBR-UI (zéro dépendance).
// Grammaire de mouvement : seuls les caractères qui CHANGENT roulent
// (montée + flou + ressort), les autres restent parfaitement fixes.
// Usage : <roll-text text="4 500 F"></roll-text>
class RollText extends HTMLElement {
  static get observedAttributes() { return ["text", "stagger"]; }

  connectedCallback() {
    if (this.shadowRoot) return;
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `<style>
      :host{display:inline-flex;font:inherit;-webkit-font-smoothing:antialiased}
      .t{display:inline-flex;white-space:pre;font:inherit;font-variant-numeric:tabular-nums}
      .c{display:inline-block;transition:transform .34s cubic-bezier(.34,1.4,.64,1),opacity .2s ease,filter .24s ease}
      .in{opacity:0;transform:translateY(58%) scale(.55);filter:blur(5px);transition:none}
      @media (prefers-reduced-motion:reduce){
        .c{transition:none!important}
        .in{opacity:1;transform:none;filter:none}
      }
    </style><span class="t" role="text"></span>`;
    this._t = root.querySelector(".t");
    this._chars = [];
    this._set(this.getAttribute("text") ?? "");
  }

  attributeChangedCallback(name, oldV, newV) {
    if (name === "text" && this._t && oldV !== newV) this._set(newV ?? "");
  }

  _set(text) {
    const chars = [...text];
    const prev = this._chars;
    const next = [];
    for (let i = 0; i < chars.length; i++) {
      const keep = prev.findIndex((p) => p.ch === chars[i] && !p.used);
      if (keep >= 0 && Math.abs(keep - i) <= 1) {
        prev[keep].used = true;
        next.push(prev[keep]);
        continue;
      }
      const c = document.createElement("span");
      c.className = "c in";
      c.textContent = chars[i] === " " ? " " : chars[i];
      c.ch = chars[i];
      next.push(c);
    }
    this._t.textContent = "";
    next.forEach((c, i) => {
      this._t.appendChild(c);
      if (c.classList.contains("in")) {
        const delay = i * (parseFloat(this.getAttribute("stagger")) || 18);
        requestAnimationFrame(() =>
          setTimeout(() => c.classList.remove("in"), delay),
        );
      }
      delete c.used;
    });
    this._chars = next;
    this._t.setAttribute("aria-label", text);
  }

  set text(v) { this.setAttribute("text", v); }
  get text() { return this.getAttribute("text") ?? ""; }
}
customElements.define("roll-text", RollText);
