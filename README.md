# 🖊️ Real-Time Collaborative Drawing Canvas  
### _Developed for FLAM Assessment — Full Stack Live Application Module_

This project is a **real-time collaborative drawing platform** built using **Vanilla JavaScript, HTML5 Canvas, Node.js, and Socket.IO**.  
It enables multiple users to draw **simultaneously** on a shared canvas with **instant real-time synchronization** and smooth, low-latency updates.

---

## ✨ Key Highlights

- 🎨 **Canvas API Mastery** — Smooth and optimized stroke rendering  
- ⚡ **Live Synchronization** — Real-time WebSocket updates across clients  
- 🌀 **Global Undo/Redo** — Shared operation stack across all users  
- 💎 **Modern UI** — Elegant glassmorphism-based design  
- 🌐 **Scalable Architecture** — Efficient multi-user event handling  

---

## 🚀 Project Overview

**🧠 Objective:**  
To demonstrate end-to-end full-stack capability by building a **multi-user, real-time web application** without using front-end frameworks.

**⚙️ Tech Stack:**
- **Frontend:** Vanilla JavaScript, HTML5 Canvas, CSS3 (Glassmorphism)  
- **Backend:** Node.js, Express.js, Socket.IO  
- **Real-time Communication:** WebSockets  
- **Optional Libraries:** jsPDF (for Export to PDF)

---

## 🎯 Core Features

| Feature | Description |
|----------|-------------|
| ✏️ **Drawing Tools** | Pencil, Marker, Calligraphy, Highlighter, Paint, and Stylus |
| 🧽 **Eraser Tool** | Clears parts of the canvas locally and globally |
| 🎨 **Color Picker** | Live color updates for brush tools |
| 📏 **Stroke Width Slider** | Adjustable pen size with + / − buttons |
| 🧠 **Global Undo/Redo** | Synced across all connected users |
| 👥 **Online Users Panel** | Live user list with dynamic color badges |
| 🧭 **Cursors** | Real-time remote cursor tracking |
| 📄 **Export Options** | Save canvas as PNG, JPEG, or PDF |
| 🖨 **Print Feature** | Directly print the current canvas |
| 🧩 **Sidebar Animation** | Expand/collapse sidebar for users list |
| 📊 **Performance Metrics** | FPS counter, latency, and operation count display |

---

## 💎 UI / UX Design

- **Theme:** Modern glassmorphism  
- **Layout:** Responsive two-panel interface (Users Panel + Drawing Stage)  
- **Animations:** Smooth transitions and hover effects  
- **Accessibility:** Clear contrast, dynamic sizing, keyboard-friendly controls  

---

## 🧩 FLAM Assessment Learning Outcomes

- ✅ Implemented **real-time bidirectional WebSocket communication**  
- 🧩 Designed **synchronized client-server state architecture**  
- 🎨 Demonstrated **Canvas API proficiency** with smooth stroke rendering  
- ⚙️ Applied **efficient memory management** with offscreen buffers  
- 🧾 Delivered a **production-quality, responsive UI**  
- 🧠 Showcased strong **problem-solving and full-stack integration** skills  

---

## 🧠 Architecture Summary

- **Client:**  
  - Handles user input, drawing logic, and rendering.  
  - Sends serialized stroke data to the server.  
  - Listens for broadcasted updates from other clients.  

- **Server (Node.js + Socket.IO):**  
  - Manages rooms, user sessions, and drawing operations.  
  - Maintains a global operation stack for undo/redo.  
  - Broadcasts updates to all connected users in real-time.  

- **Data Flow:**  
## 📦 Deployment

- 🌐 **Deployed on Render** (supports WebSockets)  
- **Live Demo:** [https://your-app-name.onrender.com](https://drawingcanvas1.onrender.com)  
- **GitHub Repo:** [https://github.com/yourusername/collaborative-canvas](https://github.com/Rahulpawar27/DrawingCanvas1)


