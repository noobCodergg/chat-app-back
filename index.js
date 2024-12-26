const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { createServer } = require("http");
const accountModel = require("./Account.js");
const bcrypt = require("bcrypt");
const chatModel = require("./Chat.js");

const app = express();
const httpServer = createServer(app);

app.use(
  cors({
    origin: "http://localhost:3000",
    methods: ["POST", "GET", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());

mongoose
  .connect("mongodb://localhost:27017/Chat", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("New user connected with ID:", socket.id);

  socket.on("join", (id) => {
    console.log(`User joined room: ${id}`);
    socket.join(id);
  });

  socket.on("privateMsg", (data) => {
    const { content, sender, receiver } = data;
    console.log(`Message from ${sender} to ${receiver}: ${content}`);
    io.to(receiver).emit("newMsg", { content, sender });
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await accountModel.findOne({ email });
    if (!user) return res.status(404).json("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json("Wrong credentials");

    const token = jwt.sign({ email: user.email }, "json-web-token", {
      expiresIn: "1d",
    });
    res.cookie("token", token, { httpOnly: true });
    return res.json(user);
  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json("Server error");
  }
});

app.post("/register", async (req, res) => {
  const { id, name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await accountModel.create({ id, name, email, password: hashedPassword });
    res.json("User created");
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json("Server error");
  }
});

app.get("/getalluser", async (req, res) => {
  try {
    const users = await accountModel.find();
    res.json(users);
  } catch (err) {
    console.error("Fetch Users Error:", err);
    res.status(500).json("Server error");
  }
});

app.post("/sendmsg", async (req, res) => {
  const { sender, receiver, content } = req.body;

  if (!sender || !receiver || !content) {
    return res
      .status(400)
      .json({
        error: "All fields are required: sender, receiver, and content.",
      });
  }

  try {
    await chatModel.create({ sender, receiver, content });
    res.json({ message: "Message sent successfully!" });
  } catch (err) {
    console.error("Error while saving message:", err);
    res.status(500).json({ error: "Server error. Please try again later." });
  }
});

app.get("/getmessages/:uid/:id", async (req, res) => {
  const { uid, id } = req.params;

  try {
    const messages = await chatModel
      .find({
        $or: [
          { sender: uid, receiver: id },
          { sender: id, receiver: uid },
        ],
      })
      .sort({ timestamp: 1 });

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json("Server error");
  }
});

app.delete("/deletemsg", async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ error: "Message ID is required" });
  }

  try {
    const result = await chatModel.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ error: "Message not found" });
    }

    return res
      .status(200)
      .json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/updatemsg", async (req, res) => {
  const { id, content } = req.body;

  if (!id || !content) {
    return res
      .status(400)
      .json({ error: "Message ID and content are required" });
  }

  try {
    const result = await chatModel.findByIdAndUpdate(
      id,
      { content },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({ error: "Message not found" });
    }

    return res
      .status(200)
      .json({
        success: true,
        message: "Message updated successfully",
        updatedMessage: result,
      });
  } catch (error) {
    console.error("Error updating message:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

httpServer.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
});
