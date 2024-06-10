console.log("hello");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const userModel = require("./userData");
const tradeModel = require("./userData");

const app = express();
app.use(express.json());
app.use(cors());

const bodyParser = require("body-parser");
const { MongoClient, ObjectId } = require("mongodb");
const uri = "mongodb://localhost:27017";
const client = new MongoClient(uri);

const PORT = 4400;
const MONGODB_URI = "mongodb://localhost:27017/papertrade";
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/papertrade");

let db;

MongoClient.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then((client) => {
    console.log("Connected to MongoDB");
    db = client.db();
  })
  .catch((error) => console.error("Error connecting to MongoDB:", error));

app.post("/register", async (req, resp) => {
  let db = client.db('papertrade');
  
  let usersCollection = db.collection('users');

  try {
    let user = await usersCollection.findOne({ mail: req.body.mail })//.exec();
    if (user) {
      resp.json({
        msg: "user already exists with this mail!",
        status: "failed",
        user: user,
      });
    } else {
      console.log(req.body);
      usersCollection
        .insertOne(req.body)
        .then((userData) =>
          resp.json({ msg: "registered successfully!", status: "success" })
        )
        .catch((err) => resp.send(err));
    }
  } catch (error) {
    console.error("Error:", error);
    resp.status(500).json({ msg: "Internal Server Error" });
  }
});

app.post("/login", (req, resp) => {
  let db = client.db("papertrade");

  let usersCollection = db.collection("users");
  const { mail, pass } = req.body;
   const user= usersCollection.findOne({ mail: mail }).
  then((user) => {
    if (user) {
      console.log(user.pass + req.body.pass);
      if (user.pass === pass) {
        resp.json({ msg: "login successful !", status: "success", user: user });
        console.log("user logged in");
      } else {
        resp.json({ msg: "incorrect password !", status: "wrongpass" });
      }
    } else {
      console.log('user not found')
      resp.json({ msg: "no record!!", status: "no rec" });
    }
  });
});






app.post("/trade", async (req, resp) => {
  const { symbol, qty, price, total, tradeType, mail } = req.body;

  try {
    // Get the database and collections
    let db = client.db('papertrade');
    let tradesCollection = db.collection('trades');
    let usersCollection = db.collection('users');

    // Find the user by email
    const user = await usersCollection.findOne({ "mail": mail });

    if (!user) {
      return resp.status(404).json({ msg: "User not found", status: "error" });
    }

    // Find existing holding index by symbol
    const existingIndex = user.holdings.findIndex((holding) => holding.symbol === symbol);

    // If holding exists, update quantity based on trade type
    if (existingIndex !== -1) {
      const existingHolding = user.holdings[existingIndex];
      if (existingHolding.tradeType === "Sell" && tradeType === "Buy") {
        // Cancel out the existing holding if the old trade type is "Sell" and the new trade type is "Buy"
        user.holdings.splice(existingIndex, 1);
      } else {
        // Otherwise, update quantity of existing holding
        const updatedQty = tradeType === "Buy" ? parseInt(existingHolding.qty) + parseInt(qty) : parseInt(existingHolding.qty) - parseInt(qty);

        // If updated quantity is 0 or negative, remove the holding
        if (updatedQty <= 0) {
          user.holdings.splice(existingIndex, 1);
        } else {
          user.holdings[existingIndex].qty = updatedQty.toString();
        }
      }
    } else {
      // Create a new holding if it doesn't exist
      user.holdings.push({ symbol, qty, price, total, tradeType });
    }

    // Update the user document in the collection with modified holdings
    await usersCollection.updateOne({ "mail": mail }, { $set: { holdings: user.holdings } });

    // Create the trade
    const trade = {
      symbol,
      qty,
      price,
      total,
      tradeType,
      mail,
    };

    // Insert the trade into trades collection
    await tradesCollection.insertOne(trade);
    console.log("Trade successful!");

    // Respond with the updated user
    resp.json({ msg: "Trade successful!", status: "success", user });

  } catch (error) {
    console.error("Error creating trade:", error);
    resp.status(500).json({ msg: "Server error", status: "error" });
  }
});



app.post("/historyuser", async (req, res) => {
  try {
    // Get the user email from the request body
    const userEmail = req.body.mail;

    // Fetch trade history for the user from the trades collection
    const userTradeHistory = await tradeModel.find({ mail: userEmail });

    // Respond with the trade history for the user
    res.json({ tradeHistory: userTradeHistory });
  } catch (error) {
    console.error("Error fetching trade history:", error);
    res.status(500).json({ msg: "Server error", status: "error" });
  }
});



app.post("/userholdings", async (req, resp) => {
  const { mail } = req.body;

  try {
    // Get the database and collection
    let db = client.db("papertrade");
    let usersCollection = db.collection("users");

    // Find the user by email
    const user = await usersCollection.findOne({ mail: mail });

    if (!user) {
      return resp.status(404).json({ msg: "User not found", status: "error" });
    }

    console.log(user.holdings)
    // Respond with the user's holdings
    resp.json({
      msg: "User holdings retrieved successfully!",
      status: "success",
      holdings: user.holdings,
    });

    console.log("User holdings retrieved:", user.holdings);
  } catch (error) {
    console.error("Error retrieving user holdings:", error);
    resp.status(500).json({ msg: "Server error", status: "error" });
  }
});

app.post("/allhistory", async (req, res) => {
  try {
    // Check if admin parameter is set to true
    const isAdmin = req.body.admin === true;

    // If not an admin, return unauthorized error
    if (!isAdmin) {
      return res.status(401).json({ msg: "Unauthorized", status: "error" });
    }

    // Fetch all trades from the trades collection
    const allTrades = await tradeModel.find();

    // Respond with the array of all trades
    res.json({ trades: allTrades });
  } catch (error) {
    console.error("Error fetching all trades:", error);
    res.status(500).json({ msg: "Server error", status: "error" });
  }
});

app.post("/setpro", async (req, res) => {
  try {
    // Extract email and paid status from request body
    const { mail, paid } = req.body;

    // Find the user by email
    const user = await db.collection("users").findOne({ mail });

    // Check if user exists
    if (!user) {
      return res.status(404).json({ msg: "User not found", status: "error" });
    }

    // Update the pro status based on the paid parameter
    user.pro = paid;

    // Save the updated user object
    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { pro: user.pro } });

    res.json({ msg: "Pro status updated successfully", status: "success" });
  } catch (error) {
    console.error("Error updating pro status:", error);
    res.status(500).json({ msg: "Server error", status: "error" });
  }
});

app.post("/holdingstotal", async (req, resp) => {
  try {
    // Get the database and collections
    let db = client.db('papertrade');
    let usersCollection = db.collection('users');

    // Find the user by email
    const user = await usersCollection.findOne({ "mail": req.body.mail });

    if (!user) {
      return resp.status(404).json({ msg: "User not found", status: "error" });
    }

    // Calculate total value for each holding
    const holdingsTotal = user.holdings.map((holding) => {
      return { [holding.symbol]: parseInt(holding.qty) * parseFloat(holding.price) };
    });

    // Respond with the array of holdings totals
    resp.json({ msg: "Holdings total retrieved successfully", status: "success", holdingsTotal });

  } catch (error) {
    console.error("Error retrieving holdings total:", error);
    resp.status(500).json({ msg: "Server error", status: "error" });
  }
});

app.get("/users", async (req, res) => {
  try {
    // Get the database and collection
    let db = client.db('papertrade');
    let usersCollection = db.collection('users');

    // Find all users
    const users = await usersCollection.find({}).toArray();

    // Respond with the list of users
    res.json({ msg: "Users list retrieved successfully", status: "success", users });
  } catch (error) {
    console.error("Error retrieving users list:", error);
    res.status(500).json({ msg: "Server error", status: "error" });
  }
});


app.listen(4400, () => {
  console.log("server run");
});

// http://localhost:4400/register
