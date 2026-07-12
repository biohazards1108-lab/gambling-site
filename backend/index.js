const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ------------------------------
// PostgreSQL (Railway)
// ------------------------------
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // If Railway requires SSL, set to true; if it crashes, try false.
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected PG pool error:", err);
});

// Helper
async function query(sql, params) {
  const res = await pool.query(sql, params);
  return res.rows;
}

// ------------------------------
// Slot machine logic
// ------------------------------
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const symbols = [
  { name: "🍒", weight: 40, payout: 2 },
  { name: "🍋", weight: 30, payout: 3 },
  { name: "⭐", weight: 20, payout: 5 },
  { name: "💎", weight: 8, payout: 10 },
  { name: "👑", weight: 2, payout: 25 },
];

function spinReel() {
  const totalWeight = symbols.reduce((sum, s) => sum + s.weight, 0);
  const roll = randomInt(1, totalWeight);
  let acc = 0;
  for (const s of symbols) {
    acc += s.weight;
    if (roll <= acc) return s;
  }
  return symbols[symbols.length - 1];
}

function evaluateSpin(reels, bet) {
  const [r1, r2, r3] = reels;

  if (r1.name === r2.name && r2.name === r3.name) {
    return bet * r1.payout;
  }

  if (r1.name === r2.name || r1.name === r3.name || r2.name === r3.name) {
    return Math.floor(bet * 1.5);
  }

  return 0;
}

// ------------------------------
// Auth middleware (x-user-id)
// ------------------------------
async function auth(req, res, next) {
  try {
    const userId = req.header("x-user-id");
    if (!userId) return res.status(401).json({ error: "Missing userId" });

    const rows = await query("SELECT * FROM users WHERE id = $1", [userId]);
    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid userId" });

    req.user = rows[0];
    next();
  } catch (err) {
    console.error("AUTH ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
}

// ------------------------------
// Routes
// ------------------------------
app.get("/", (req, res) => {
  res.json({ status: "online", message: "Backend running" });
});

// Register
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ error: "Username and password required" });

    const existing = await query(
      "SELECT id FROM users WHERE LOWER(username) = LOWER($1)",
      [username]
    );
    if (existing.length > 0)
      return res.status(409).json({ error: "Username already taken" });

    const hash = await bcrypt.hash(password, 10);

    const rows = await query(
      "INSERT INTO users (username, password_hash, balance) VALUES ($1, $2, $3) RETURNING id, username, balance",
      [username, hash, 1000]
    );

    res.json({
      success: true,
      userId: rows[0].id,
      username: rows[0].username,
      balance: rows[0].balance,
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const rows = await query(
      "SELECT * FROM users WHERE LOWER(username) = LOWER($1)",
      [username]
    );

    if (rows.length === 0)
      return res.status(401).json({ error: "Invalid credentials" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);

    if (!match)
      return res.status(401).json({ error: "Invalid credentials" });

    res.json({
      success: true,
      userId: user.id,
      username: user.username,
      balance: user.balance,
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Balance
app.get("/balance", auth, async (req, res) => {
  res.json({
    success: true,
    userId: req.user.id,
    username: req.user.username,
    balance: req.user.balance,
  });
});

// Deposit
app.post("/deposit", auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid deposit amount" });

    const newBalance = req.user.balance + amount;

    await query("UPDATE users SET balance = $1 WHERE id = $2", [
      newBalance,
      req.user.id,
    ]);

    res.json({ success: true, balance: newBalance });
  } catch (err) {
    console.error("DEPOSIT ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Spin
app.post("/spin", auth, async (req, res) => {
  try {
    const { bet } = req.body;

    if (!bet || bet <= 0)
      return res.status(400).json({ error: "Invalid bet amount" });

    if (req.user.balance < bet)
      return res.status(400).json({ error: "Insufficient balance" });

    const reels = [spinReel(), spinReel(), spinReel()];
    const payout = evaluateSpin(reels, bet);

    const newBalance = req.user.balance - bet + payout;

    await query("UPDATE users SET balance = $1 WHERE id = $2", [
      newBalance,
      req.user.id,
    ]);

    res.json({
      success: true,
      reels: reels.map((r) => r.name),
      payout,
      balance: newBalance,
    });
  } catch (err) {
    console.error("SPIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ------------------------------
// Start server
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`Backend running on port ${PORT}`);

  // Test DB on startup so Railway logs show the real error
  try {
    const rows = await query("SELECT NOW() as now", []);
    console.log("DB OK, time:", rows[0].now);
  } catch (err) {
    console.error("DB CONNECTION ERROR ON STARTUP:", err);
  }
});
