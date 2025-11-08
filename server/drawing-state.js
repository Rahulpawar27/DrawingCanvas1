import { customAlphabet } from 'nanoid';
const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

export class DrawingState {
  constructor() {
    this.users = new Map();
    this.ops = [];
    this.undone = [];
    this.cursors = new Map();
    this.seq = 0;
  }

  createOperation(user, msg) {
    const id = `${Date.now()}-${this.seq++}-${nanoid()}`;
    const op = {
      id,
      userId: user.id,
      tool: msg.tool === 'eraser' ? 'eraser' : 'brush',
      color: msg.color || user.color,
      size: Math.max(1, Math.min(100, msg.size || 4)),
      points: Array.isArray(msg.points) ? msg.points : [],
      committedAt: Date.now()
    };
    this.ops.push(op);
    return op;
  }

  undo() {
    if (this.ops.length === 0) return null;
    const op = this.ops.pop();
    this.undone.push(op);
    return op;
  }

  redo() {
    if (this.undone.length === 0) return null;
    const op = this.undone.pop();
    this.ops.push(op);
    return op;
  }

  reset() {
    this.ops = [];
    this.undone = [];
    this.seq = 0;
  }
}
