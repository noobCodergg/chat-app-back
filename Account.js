const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  password: String,
});

module.exports = mongoose.model("accounts", accountSchema);
