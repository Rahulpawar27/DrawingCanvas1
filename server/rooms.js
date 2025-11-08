import { DrawingState } from './drawing-state.js';
import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 10);

export class Room {
  constructor(id) {
    this.id = id;
    this.state = new DrawingState();
    this.palette = [
      '#ff6b6b', '#feca57', '#48dbfb', '#1dd1a1', '#5f27cd',
      '#ff9ff3', '#54a0ff', '#00d2d3', '#c8d6e5', '#576574'
    ];
  }

  handleConnection(socket, io) {
    const user = {
      id: nanoid(),
      name: 'User-' + (this.state.users.size + 1),
      color: this.palette[this.state.users.size % this.palette.length]
    };
    this.state.users.set(socket.id, user);

    // Send initial data
    socket.emit('init', {
      self: user,
      users: Array.from(this.state.users.values()),
      ops: []
    });

    socket.broadcast.emit('user:join', { user });

    // === Cursor handling ===
    socket.on('cursor', (payload) => {
      const { x, y, tool, color } = payload || {};
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      this.state.cursors.set(user.id, { x, y, tool, color });
      socket.broadcast.emit('cursor', { userId: user.id, x, y, tool, color });
    });

    // === Drawing logic ===
    socket.on('stroke:begin', (msg = {}) => {
      const meta = {
        tool: msg.tool === 'eraser' ? 'eraser' : 'brush',
        color: msg.color || user.color,
        size: Math.max(1, Math.min(100, msg.size || 4)),
        start: Array.isArray(msg.start) ? msg.start.slice(0, 2) : [0, 0],
        t: Date.now()
      };
      socket.broadcast.emit('stroke:begin', { userId: user.id, tempId: msg.tempId, meta });
    });

    socket.on('stroke:point', (msg = {}) => {
      const p = Array.isArray(msg.p) ? msg.p.slice(0, 2) : null;
      if (!p) return;
      socket.broadcast.emit('stroke:point', { userId: user.id, tempId: msg.tempId, p, t: Date.now() });
    });

    socket.on('stroke:end', (msg = {}) => {
      const op = this.state.createOperation(user, msg);
      io.emit('stroke:commit', { userId: user.id, id: op.id, tempId: msg.tempId, op });
    });

    // === Undo / Redo ===
    socket.on('undo', () => {
      const op = this.state.undo();
      if (op) io.emit('revoke', { id: op.id });
    });

    socket.on('redo', () => {
      const op = this.state.redo();
      if (op) io.emit('reapply', { op });
    });

    // === Disconnect ===
    socket.on('disconnect', () => {
      this.state.users.delete(socket.id);
      this.state.cursors.delete(user.id);
      io.emit('user:leave', { userId: user.id });

      if (this.state.users.size === 0) {
        this.state.reset();
      }
    });
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  getRoom(id) {
    if (!this.rooms.has(id)) {
      this.rooms.set(id, new Room(id));
    }
    return this.rooms.get(id);
  }
}
