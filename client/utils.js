export const now = () => Date.now();
export const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

export const throttleRAF = (fn) => {
  let queued = false, lastArgs;
  return (...args) => {
    lastArgs = args;
    if (!queued) {
      queued = true;
      requestAnimationFrame(() => { queued = false; fn(...lastArgs); });
    }
  };
};

export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const palette = [
  "#1f8ef1", "#f39c12", "#e74c3c", "#2ecc71", "#9b59b6", "#16a085", "#ff6b6b", "#e84393"
];

export const fitCanvasToParent = (canvas) => {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
};
