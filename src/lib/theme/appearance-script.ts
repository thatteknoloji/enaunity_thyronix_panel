/** Inline script applied before paint so theme works on all devices (incl. slow mobile). */
export const APPEARANCE_BLOCKING_SCRIPT = `(function(){try{var VALID=${JSON.stringify([
  "dark",
  "light",
  "sunset",
  "forest",
  "aurora-glass",
  "midnight-neon",
  "executive-white",
  "obsidian-gold",
])};var ACCENTS=${JSON.stringify(["red", "blue", "purple", "emerald", "orange"])};var theme="dark",accent="orange",compact=false,reduced=false;var raw=localStorage.getItem("ena-appearance");if(raw){var p=JSON.parse(raw);if(p.theme&&VALID.indexOf(p.theme)!==-1)theme=p.theme;if(p.accent&&ACCENTS.indexOf(p.accent)!==-1)accent=p.accent;compact=!!p.compactMode;reduced=!!p.reducedMotion;}else{var legacy=localStorage.getItem("theme");if(legacy&&VALID.indexOf(legacy)!==-1)theme=legacy;}var el=document.documentElement;el.setAttribute("data-theme",theme);el.setAttribute("data-accent",accent);el.classList.toggle("acc-compact",compact);el.classList.toggle("acc-reduced-motion",reduced);var light=theme==="light"||theme==="executive-white";el.style.colorScheme=light?"light":"dark";}catch(e){}})();`;
