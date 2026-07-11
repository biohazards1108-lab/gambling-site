const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({
  origin: "https://biohazards1108-lab.github.io"
}));

app.use(express.json());


// Root route
app.get("/", (req, res) => {
  res.send("Backend is live!");
});

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connection successful!" });
});

// Betting route
app.post("/api/bet", (req, res) => {
  const { amount } = req.body;

  // Validate bet amount
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid bet amount" });
  }

  // 50/50 win chance
  const win = Math.random() < 0.5;

  if (win) {
    res.json({ result: "win", payout: amount * 2 });
  } else {
    res.json({ result: "lose", payout: 0 });
  }
});

// Railway-compatible port
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
