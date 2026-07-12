// ------------------------------
//   Gambling Site Backend API
// ------------------------------

const express = require("express");
const cors = require("cors");

// Create express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check (Railway uses this)
app.get("/", (req, res) => {
  res.json({ status: "online", message: "Backend is running" });
});

// ------------------------------
//   Example Gambling Logic
// ------------------------------

// Utility: safe random integer
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// POST /spin — simulate a slot machine spin
app.post("/spin", async (req, res) => {
  try {
    const { bet } = req.body;

    if (!bet || bet <= 0) {
      return res.status(400).json({ error: "Invalid bet amount" });
    }

    // Example slot results
    const result = {
      reel1: randomInt(1, 5),
      reel2: randomInt(1, 5),
      reel3: randomInt(1, 5),
    };

    // Simple win condition
    const win =
      result.reel1 === result.reel2 && result.reel2 === result.reel3;

    const payout = win ? bet * 5 : 0;

    res.json({
      success: true,
      result,
      win,
      payout,
    });
  } catch (err) {
    console.error("Error in /spin:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------------------
//   Global Error Handler
// ------------------------------
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ------------------------------
//   Start Server
// ------------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
