// ---------------------------------------------
// Lucky 13 Casino Backend (Railway Deployment)
// ---------------------------------------------

const express = require("express");
const cors = require("cors");
const app = express();

// ---------------------------------------------
// CORS — REQUIRED for GitHub Pages frontend
// ---------------------------------------------
app.use(cors({
  origin: "https://biohazards1108-lab.github.io",   // your GitHub Pages domain
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// ---------------------------------------------
// JSON Body Parsing
// ---------------------------------------------
app.use(express.json());

// ---------------------------------------------
// TEMPORARY BALANCE (until you add accounts)
// ---------------------------------------------
let balance = 1000;

// ---------------------------------------------
// ROOT ROUTE
// ---------------------------------------------
app.get("/", (req, res) => {
  res.send("Backend is live!");
});

// ---------------------------------------------
// TEST ROUTE
// ---------------------------------------------
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connection successful!" });
});

// ---------------------------------------------
// BALANCE ROUTE (Blackjack needs this)
// ---------------------------------------------
app.get("/balance", (req, res) => {
  res.json({ balance });
});

// ---------------------------------------------
// BET ROUTE (main casino logic)
// ---------------------------------------------
app.post("/api/bet", (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid bet amount" });
  }

  if (amount > balance) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  const win = Math.random() < 0.5; // 50/50 chance

  if (win) {
    const payout = amount * 2;
    balance += payout;
    return res.json({ result: "win", payout, balance });
  } else {
    balance -= amount;
    return res.json({ result: "lose", payout: 0, balance });
  }
});

// ---------------------------------------------
// START SERVER (Railway-compatible)
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lucky 13 Backend running on port ${PORT}`);
});
