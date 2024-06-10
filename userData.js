const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  mail: String,
  pass: String,
  money: Number,
  holdings: Array
}, { strict: false });

const tradeSchema = new mongoose.Schema({
  symbol: String,
  qty: Number,
  price: Number,
  Total: Number,
  tradeType: String,
  uid:String
});

const userModel = mongoose.model("user", userSchema);
module.exports = userModel;

const tradeModel = mongoose.model("trade", tradeSchema);
module.exports = tradeModel;
