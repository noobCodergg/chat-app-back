const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  sender: String,
  receiver: String,
  content: String,
});

module.exports = mongoose.model("chats", accountSchema);
