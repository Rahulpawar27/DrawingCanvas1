import { CanvasView } from './canvas.js';
import { WS } from './websocket.js';

const canvasEl = document.getElementById('canvas');
const cursorsEl = document.getElementById('cursors');
const usersList = document.getElementById('users');
const fpsEl = document.getElementById('fps');
const latencyEl = document.getElementById('latency');
const opsCountEl = document.getElementById('opsCount');

const colorInput = document.getElementById('color');
const sizeInput = document.getElementById('size');
const sizeDecreaseBtn = document.getElementById('size-decrease');
const sizeIncreaseBtn = document.getElementById('size-increase');

sizeDecreaseBtn.addEventListener('click', () => {
  let newSize = Math.max(1, Number(sizeInput.value) - 1);
  sizeInput.value = newSize;
  view.setSize(newSize);
});

sizeIncreaseBtn.addEventListener('click', () => {
  let newSize = Math.min(50, Number(sizeInput.value) + 1);
  sizeInput.value = newSize;
  view.setSize(newSize);
});

const undoBtn = document.getElementById('undo');
const redoBtn = document.getElementById('redo');
const clearBtn = document.getElementById('clear');

const toolButtons = [...document.querySelectorAll('.tool-btn')];
let currentTool = 'brush';
toolButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toolButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTool = btn.dataset.tool;
    view.setTool(currentTool);
  });
});

const brushBtn = document.getElementById("brush-btn");
const penMenu = document.querySelector(".pen-menu");
let currentPen = "pencil";

if (brushBtn && penMenu) {
  brushBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    penMenu.classList.toggle("hidden");
  });

  document.addEventListener("click", () => penMenu.classList.add("hidden"));

  penMenu.querySelectorAll(".pen-option").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      currentPen = btn.dataset.pen;
      brushBtn.textContent = btn.textContent + " ▾";
      penMenu.classList.add("hidden");
      view.setPenType(currentPen);
    });
  });
}

const view = new CanvasView(canvasEl, cursorsEl, {
  onLocalStroke: (evt) => ws.sendStrokeEvent(evt),
  onCursor: (pos) => ws.sendCursor(pos),
  onMetrics: (m) => { fpsEl.textContent = m.fps.toFixed(0); }
});

const ws = new WS({
  onInit({ self, users, ops }) {
    view.setSelf(self);
    users.forEach(addUser);
    view.applyFullOps([]);
    opsCountEl.textContent = "0";
  },

  onUserJoin({ user }) { addUser(user); },
  onUserLeave({ userId }) { removeUser(userId); view.removeCursor(userId); },
  onCursor(msg) { view.updateCursor(msg); },
  onStrokeBegin(msg) { view.remoteStrokeBegin(msg); },
  onStrokePoint(msg) { view.remoteStrokePoint(msg); },
  onStrokeCommit({ op }) {
    view.remoteStrokeCommit(op);
    opsCountEl.textContent = String(view.opCount());
  },
  onRevoke({ id }) {
    view.revokeOp(id);
    opsCountEl.textContent = String(view.opCount());
  },
  onReapply({ op }) {
    view.remoteStrokeCommit(op);
    opsCountEl.textContent = String(view.opCount());
  },
  onLatency(ms) { latencyEl.textContent = String(ms); }
});

function addUser(user) {
  const li = document.createElement('li');
  li.id = `user-${user.id}`;
  const dot = document.createElement('span');
  dot.className = 'dot';
  dot.style.color = user.color;
  li.appendChild(dot);
  const name = document.createElement('span');
  name.textContent = user.name;
  li.appendChild(name);
  usersList.appendChild(li);
}

function removeUser(userId) {
  const li = document.getElementById(`user-${userId}`);
  if (li) li.remove();
}

view.setOptions({
  color: colorInput.value,
  size: Number(sizeInput.value),
  tool: currentTool
});

colorInput.addEventListener('input', () => {
  view.setColor(colorInput.value);
  updateSliderThumbColor(colorInput.value);
});

sizeInput.addEventListener('input', () => view.setSize(Number(sizeInput.value)));

undoBtn.addEventListener('click', () => ws.emit('undo'));
redoBtn.addEventListener('click', () => ws.emit('redo'));
clearBtn.addEventListener('click', () => view.clearLocal());

function updateSliderThumbColor(color) {
  sizeInput.style.setProperty("--thumb-color", color);
}
updateSliderThumbColor(colorInput.value);

const resize = () => {
  view.resizeToParent();
  view.rect = view.canvas.getBoundingClientRect();
};
window.addEventListener('resize', resize);
resize();

(function() {
  const root = document.querySelector('.app-root');
  const toggle = document.getElementById('sidebar-toggle');
  if (!root || !toggle) return;

  const saved = localStorage.getItem('sidebar_state');
  if (saved === 'collapsed') root.classList.add('sidebar-collapsed');

  toggle.addEventListener('click', () => {
    root.classList.toggle('sidebar-collapsed');
    const state = root.classList.contains('sidebar-collapsed') ? 'collapsed' : 'open';
    localStorage.setItem('sidebar_state', state);
  });

  // === Auto-resize canvas when sidebar toggles ===
const observer = new MutationObserver(() => {
  // Delay a bit so CSS transition finishes first
  setTimeout(() => {
    if (typeof view !== 'undefined' && view.resizeToParent) {
      view.resizeToParent();
    }
  }, 400);
});

observer.observe(document.querySelector('.app-root'), {
  attributes: true,
  attributeFilter: ['class']
});
// === EXPORT / PRINT FEATURE ===
const exportBtn = document.getElementById("export");
const exportMenu = document.getElementById("export-menu");
const downloadPNG = document.getElementById("download-png");
const downloadPDF = document.getElementById("download-pdf");
const printCanvas = document.getElementById("print-canvas");

// Toggle menu visibility
exportBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  exportMenu.classList.toggle("hidden");
});

// Hide menu when clicking elsewhere
document.addEventListener("click", () => {
  exportMenu.classList.add("hidden");
});

// Download as PNG
downloadPNG.addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "canvas_drawing.png";
  link.href = canvasEl.toDataURL("image/png");
  link.click();
});

// Download as PDF (requires html2canvas + jsPDF)
downloadPDF.addEventListener("click", async () => {
  const canvas = canvasEl;
  const imgData = canvas.toDataURL("image/png");
  const pdf = new window.jspdf.jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [canvas.width / 2, canvas.height / 2]
  });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
  pdf.save("canvas_drawing.pdf");
});

// Print directly
printCanvas.addEventListener("click", () => {
  const dataUrl = canvasEl.toDataURL("image/png");
  const windowContent = `
    <!DOCTYPE html>
    <html>
      <head><title>Print Canvas</title></head>
      <body style="margin:0; display:flex; justify-content:center; align-items:center; background:#fff;">
        <img src="${dataUrl}" style="max-width:100%; max-height:100%;"/>
        <script>window.onload = () => window.print();</script>
      </body>
    </html>`;
  const printWin = window.open("", "", "width=800,height=600");
  printWin.document.open();
  printWin.document.write(windowContent);
  printWin.document.close();
});

})();
