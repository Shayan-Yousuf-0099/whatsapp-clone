import mongoose from "mongoose";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import Chat from "./models/chat.js";
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
main()
  .then(() => {
    console.log("connection successful");
  })
  .catch((err) => {
    console.log(err);
  });
async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/whatsapp");
}

app.get("/chats", async (req, res) => {
  try {
    let chats = await Chat.find();
    res.send(chats);
  } catch (err) {
    res.send(err);
  }
});

app.get("/chats/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let chats = await Chat.findById(id);
    res.send(chats);
  } catch (err) {
    console.log(err);
  }
});

app.post("/chats", async (req, res) => {
  try {
    const { from, to, msg } = req.body;

    if (!from || !to || !msg?.trim()) {
      return res.status(400).json({
        error: "from, to aur msg required hain",
      });
    }

    const newChat = await Chat.create({
      from,
      to,
      msg: msg.trim(),
      created_at: new Date(),
    });
    io.emit("newMessage", newChat);

    res.status(201).json(newChat);
  } catch (error) {
    console.error("POST /chats error:", error);

    res.status(500).json({
      error: "Message save nahi hua",
    });
  }
});

app.patch("/chats/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let { from, to, msg } = req.body;
    let chats = await Chat.findByIdAndUpdate(
      id,
      {
        from: from,
        to: to,
        msg: msg,
      },
      {
        new: true,
        runValidators: true,
      },
    );
    if (chats) {
      io.emit("messageUpdated", chats);
    }
    res.send(chats);
  } catch (err) {
    console.log(err);
  }
});

app.delete("/chats/:id", async (req, res) => {
  try {
    let { id } = req.params;
    let chats = await Chat.findByIdAndDelete(id);
    if (chats) {
      io.emit("messageDeleted", { id: chats._id });
    }
    res.send(chats);
  } catch (err) {
    console.log(err);
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("typing", ({ from, to }) => {
    console.log("Typing event received:", { from, to });
    socket.broadcast.emit("userTyping", { from, to });
  });

  socket.on("stopTyping", ({ from, to }) => {
    console.log("Stop typing event received:", { from, to });
    socket.broadcast.emit("userStoppedTyping", { from, to });
  });
});
const onlineUsers = new Map();

function broadcastOnlineUsers() {
  io.emit("onlineUsers", Array.from(onlineUsers.keys()));
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("registerUser", (username) => {
    if (typeof username !== "string" || !username.trim()) return;

   
    const previousUser = socket.data.username;

    if (previousUser) {
      const previousSockets = onlineUsers.get(previousUser);
      previousSockets?.delete(socket.id);

      if (previousSockets?.size === 0) {
        onlineUsers.delete(previousUser);
      }
    }

    const user = username.trim().toLowerCase();
    socket.data.username = user;

    if (!onlineUsers.has(user)) {
      onlineUsers.set(user, new Set());
    }

    onlineUsers.get(user).add(socket.id);

    console.log("Online users:", Array.from(onlineUsers.keys()));
    broadcastOnlineUsers();
  });

  socket.on("typing", ({ from, to }) => {
    console.log("Typing event received:", { from, to });
    socket.broadcast.emit("userTyping", { from, to });
  });

  socket.on("stopTyping", ({ from, to }) => {
    console.log("Stop typing event received:", { from, to });
    socket.broadcast.emit("userStoppedTyping", { from, to });
  });

  socket.on("markSeen", async ({ from, to }) => {
    try {
      if (!from || !to) return;

      const result = await Chat.updateMany(
        {
          from: to,
          to: from,
          seen: { $ne: true },
        },
        {
          $set: { seen: true },
        },
      );

      if (result.modifiedCount > 0) {
        io.emit("messagesSeen", { from, to });
      }
    } catch (err) {
      console.error("Mark seen error:", err);
    }
  });
  socket.on("disconnect", () => {
    const user = socket.data.username;

    if (!user) return;

    const userSockets = onlineUsers.get(user);
    userSockets?.delete(socket.id);

    if (userSockets?.size === 0) {
      onlineUsers.delete(user);
    }

    console.log("User disconnected:", user);
    broadcastOnlineUsers();
  });
});


server.listen(8080, () => {
  console.log("Express + Socket.IO server listening on port 8080");
});
