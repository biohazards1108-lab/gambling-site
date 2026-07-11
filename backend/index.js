const express = require("express");
const app = express();

// allow JSON body parsing
app.use(express.json());

// test route
app.get("/api/test", (req, res) => {
app.post("/api/bet", (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: "Invalid bet amount" });
  }

  const win = Math.random() < 0.5; // 50/50 chance

  if (win) {
    res.json({ result: "win", payout: amount * 2 });
  } else {
    res.json({ result: "lose", payout: 0 });
  }
});



// root route
app.get("/", (req, res) => {
  res.send("Backend is live!");
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
