const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    sender: String,
    receiver: String,
    content: String,
  },
  { timestamps: true } 
);

module.exports = mongoose.model("chats", accountSchema);
