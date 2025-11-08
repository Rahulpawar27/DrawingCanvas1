import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import { RoomManager } from './rooms.js';

const app = express();
app.use(compression());
app.use(cors());
app.use(morgan('dev'));
app.use(express.static('client'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;

const roomManager = new RoomManager(); // 🔹 Handles all rooms

io.on('connection', (socket) => {
  const roomId = 'default'; // for now one default room
  const room = roomManager.getRoom(roomId);
  room.handleConnection(socket, io);
});

server.listen(PORT, () => {
  console.log(`Collaborative Canvas running at http://localhost:${PORT}`);
});
