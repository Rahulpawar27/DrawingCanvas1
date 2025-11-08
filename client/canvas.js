
export class CanvasView {
  constructor(canvas, cursorsRoot, callbacks){
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buffer = document.createElement('canvas');
    this.bctx = this.buffer.getContext('2d');
    this.overlay = document.createElement('canvas');
    this.octx = this.overlay.getContext('2d');
    this.canvas.parentElement.appendChild(this.overlay);

    this.cursorsRoot = cursorsRoot;
    this.callbacks = callbacks;
    this.self = null;

    this.opts = { color:'#ff6b6b', size:6, tool:'brush' };
    this.down = false;
    this.tempId = null;
    this.localPoints = [];
    this.remoteActive = new Map(); // temp strokes by userId+tempId
    this.ops = []; // committed ops stack

    this._setupPointer();
    this._setupRAF();

    // 👇 Added line to initialize text tool
    this.initTextTool();
  }

  setSelf(self){ this.self = self; }
  setOptions(o){ this.opts = { ...this.opts, ...o }; }
  setColor(c){ this.opts.color = c; }
  setSize(s){ this.opts.size = s; }
  setTool(t){ this.opts.tool = t; }
  setPenType(type) {
    this.penType = type;
  }

  opCount(){ return this.ops.length; }

  applyFullOps(ops){
    this.ops = ops.slice();
    this._redrawBuffer();
  }

  remoteStrokeBegin({ userId, tempId, meta }){
    this.remoteActive.set(`${userId}:${tempId}`, { ...meta, points:[meta.start] });
  }
  remoteStrokePoint({ userId, tempId, p }){
    const key = `${userId}:${tempId}`;
    const s = this.remoteActive.get(key);
    if (!s) return;
    s.points.push(p);
    this._drawStroke(this.octx, s, false);
  }
  remoteStrokeCommit(op){
    // remove temp
    for (const k of Array.from(this.remoteActive.keys())){
      const s = this.remoteActive.get(k);
      if (s && s.userId === op.userId) this.remoteActive.delete(k);
    }
    this.ops.push(op);
    this._drawStroke(this.bctx, op, true);
    this._flushComposite();
  }

  revokeOp(id){
    const idx = this.ops.findIndex(o => o.id === id);
    if (idx !== -1){
      this.ops.splice(idx, 1);
      this._redrawBuffer();
    }
  }

  removeCursor(userId){
    const el = document.getElementById(`cursor-${userId}`);
    if (el) el.remove();
  }

  updateCursor({ userId, x, y, tool, color }){
    let el = document.getElementById(`cursor-${userId}`);
    if (!el){
      el = document.createElement('div');
      el.id = `cursor-${userId}`;
      el.className = 'cursor';
      el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24"><path d="M3 2l7 20 2-7 7-2L3 2z" fill="currentColor"/></svg><span class="badge"></span>`;
      this.cursorsRoot.appendChild(el);
    }
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    el.style.color = color;
    el.querySelector('.badge').textContent = tool;
  }

  onPointerMove(e){
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // send cursor (throttled by RAF via this._cursorPending)
    this._cursorPending = { x, y, tool: this.opts.tool, color: this.opts.color };

    if (!this.down) return;
    const p = [x, y];
    this.localPoints.push(p);
    this._drawLocalIncrement(p);
    this.callbacks.onLocalStroke?.({ type:'stroke:point', tempId: this.tempId, p, t: performance.now() });
  }

  _setupPointer(){
    const handlerDown = (e) => {
      e.preventDefault();
      this.down = true;
      this.tempId = Math.random().toString(36).slice(2);
      this.localPoints = [];
      const start = this._eventPoint(e);
      this.localPoints.push(start);
      this.callbacks.onLocalStroke?.({ type:'stroke:begin', tempId: this.tempId,
        tool: this.opts.tool, color: this.opts.color, size: this.opts.size, start, t: performance.now()
      });
    };
    const handlerUp = (e) => {
      if (!this.down) return;
      this.down = false;
      const op = {
        id: null, userId: this.self?.id, tool: this.opts.tool, color: this.opts.color,
        size: this.opts.size, points: this.localPoints.slice()
      };
      // Draw on buffer locally for optimistic feel
      this._drawStroke(this.bctx, op, true);
      this._flushComposite();
      this.callbacks.onLocalStroke?.({ type:'stroke:end', tempId: this.tempId,
        tool: this.opts.tool, color: this.opts.color, size: this.opts.size, points: op.points });
      this.tempId = null;
      this.localPoints = [];
    };

    const el = this.canvas;
    el.addEventListener('pointerdown', handlerDown);
    window.addEventListener('pointermove', (e)=>this.onPointerMove(e));
    window.addEventListener('pointerup', handlerUp);
    window.addEventListener('pointercancel', handlerUp);
  }

  _eventPoint(e) {
    // Get bounding box of canvas
    const rect = this.rect || this.canvas.getBoundingClientRect();

    // Convert CSS pixels → canvas pixels
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

    return [x, y];
  }

  _setupRAF(){
    let last = performance.now();
    const loop = () => {
      // Cursor broadcast once per frame
      if (this._cursorPending){
        this.callbacks.onCursor?.(this._cursorPending);
        this._cursorPending = null;
      }
      // Blit buffer + overlay
      this._flushComposite();

      // FPS
      const now = performance.now();
      const dt = now - last;
      last = now;
      const fps = 1000 / dt;
      this.callbacks.onMetrics?.({ fps });
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _flushComposite(){
    // Resize overlay to canvas size
    if (this.overlay.width !== this.canvas.width || this.overlay.height !== this.canvas.height){
      this.overlay.width = this.canvas.width;
      this.overlay.height = this.canvas.height;
    }
    // Paint buffer onto visible canvas then overlay
    this.ctx.clearRect(0,0,this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.buffer, 0, 0);
    this.ctx.drawImage(this.overlay, 0, 0);
  }

  _redrawBuffer(){
    this.bctx.clearRect(0,0,this.buffer.width, this.buffer.height);
    for (const op of this.ops){
      this._drawStroke(this.bctx, op, true);
    }
    this._flushComposite();
  }

  _drawLocalIncrement(p){
    const s = {
      tool: this.opts.tool, color: this.opts.color, size: this.opts.size,
      points: this.localPoints
    };
    // Draw current segment on overlay for responsiveness
    this.octx.clearRect(0,0,this.overlay.width, this.overlay.height);
    this._drawStroke(this.octx, s, false);
  }

  _drawStroke(ctx, s, commit){
    if (!s.points || s.points.length < 1) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s.size || 4;
    ctx.strokeStyle = s.color || '#fff';
    ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';

    const pts = s.points;
    ctx.beginPath();
    if (pts.length === 1){
      const [x,y] = pts[0];
      ctx.moveTo(x,y); ctx.lineTo(x+0.01, y+0.01);
    } else {
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i=1; i<pts.length-1; i++){
        const [x0,y0] = pts[i];
        const [x1,y1] = pts[i+1];
        const cx = (x0 + x1)/2;
        const cy = (y0 + y1)/2;
        ctx.quadraticCurveTo(x0, y0, cx, cy);
      }
      const [lx,ly] = pts[pts.length-1];
      ctx.lineTo(lx, ly);
    }
    ctx.stroke();
    ctx.restore();

    if (commit){
      // committed strokes are on buffer; clear overlay remnants
      this.octx.clearRect(0,0,this.overlay.width, this.overlay.height);
    }
  }

  sendLatencyPing(){ /* handled by WS */ }

  resizeToParent() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth;
    const h = Math.max(420, parent.clientHeight);

    const scale = window.devicePixelRatio || 1;

    // Set canvas internal resolution
    this.canvas.width = w * scale;
    this.canvas.height = h * scale;
    this.buffer.width = w * scale;
    this.buffer.height = h * scale;
    this.overlay.width = w * scale;
    this.overlay.height = h * scale;

    // Match visible size
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.buffer.style.width = `${w}px`;
    this.buffer.style.height = `${h}px`;
    this.overlay.style.width = `${w}px`;
    this.overlay.style.height = `${h}px`;

    // Apply scale correctly
    this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.bctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.octx.setTransform(scale, 0, 0, scale, 0, 0);

    // Store for coordinate fix later
    this.scale = scale;
    this.rect = this.canvas.getBoundingClientRect();

    this._redrawBuffer();
  }

  clearLocal() {
    this.bctx.clearRect(0, 0, this.buffer.width, this.buffer.height);
    this.octx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    this.ops = [];
    this._flushComposite();
  }

  // === TEXT TOOL SUPPORT ===
  initTextTool() {
    this.canvas.addEventListener("click", (e) => {
      if (this.opts.tool !== "text") return;

      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const textInput = document.createElement("div");
      textInput.contentEditable = true;
      textInput.className = "text-box";
      textInput.style.left = `${x}px`;
      textInput.style.top = `${y}px`;
      textInput.style.color = this.opts.color;
      textInput.style.fontSize = `${this.opts.size * 3}px`;
      textInput.style.fontFamily = "Poppins, sans-serif";
      textInput.style.position = "absolute";
      textInput.style.minWidth = "40px";
      textInput.style.outline = "none";
      textInput.style.cursor = "text";
      textInput.style.background = "transparent";
      textInput.style.border = "1px dashed rgba(0,0,0,0.2)";
      textInput.style.whiteSpace = "pre";

      textInput.addEventListener("keydown", (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          this.commitTextToCanvas(textInput.innerText, x, y);
          textInput.remove();
        }
      });

      this.canvas.parentElement.appendChild(textInput);
      textInput.focus();
    });
  }

  commitTextToCanvas(text, x, y) {
    if (!text.trim()) return;
    this.ctx.save();
    this.ctx.font = `${this.opts.size * 3}px Poppins`;
    this.ctx.fillStyle = this.opts.color;
    this.ctx.fillText(text, x, y);
    this.ctx.restore();
  }
}
