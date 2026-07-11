// ---------------------------------------------
// Lucky 13 Casino Backend (PostgreSQL Edition)
// ---------------------------------------------

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

// ---------------------------------------------
// CORS — allow GitHub Pages frontend
// ---------------------------------------------
app.use(cors({
  origin: "https://biohazards1108-lab.github.io",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

// ---------------------------------------------
// PostgreSQL Connection
// ---------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Railway auto-injects this
  ssl: { rejectUnauthorized: false }
});

// ---------------------------------------------
// JWT Secret
// ---------------------------------------------
const JWT_SECRET = "lucky13_secret_key"; // change later for security

// ---------------------------------------------
// Middleware: Verify Token
// ---------------------------------------------
function auth(req, res, next) {
  const token = req.headers.authorization;

  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // user.id, user.username
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ---------------------------------------------
// ROOT ROUTE
// ---------------------------------------------
app.get("/", (req, res) => {
  res.send("Lucky 13 Backend (PostgreSQL) is live!");
});

// ---------------------------------------------
// REGISTER
// ---------------------------------------------
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "Missing username or password" });

  const hashed = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id, username, balance",
      [username, hashed]
    );

    res.json({ message: "Account created", user: result.rows[0] });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: "Database error" });
  }
});

// ---------------------------------------------
// LOGIN
// ---------------------------------------------
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );

  if (result.rows.length === 0)
    return res.status(400).json({ error: "User not found" });

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ error: "Invalid password" });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ message: "Login successful", token });
});

// ---------------------------------------------
// GET BALANCE (Protected)
// ---------------------------------------------
app.get("/balance", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT balance FROM users WHERE id = $1",
    [req.user.id]
  );

  res.json({ balance: result.rows[0].balance });
});

// ---------------------------------------------
// BET ROUTE (Protected)
// ---------------------------------------------
app.post("/api/bet", auth, async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0)
    return res.status(400).json({ error: "Invalid bet amount" });

  const userResult = await pool.query(
    "SELECT balance FROM users WHERE id = $1",
    [req.user.id]
  );

  let balance = userResult.rows[0].balance;

  if (amount > balance)
    return res.status(400).json({ error: "Insufficient balance" });

  const win = Math.random() < 0.5;

  if (win) {
    const payout = amount * 2;
    balance += payout;

    await pool.query(
      "UPDATE users SET balance = $1 WHERE id = $2",
      [balance, req.user.id]
    );

    return res.json({ result: "win", payout, balance });
  } else {
    balance -= amount;

    await pool.query(
      "UPDATE users SET balance = $1 WHERE id = $2",
      [balance, req.user.id]
    );

    return res.json({ result: "lose", payout: 0, balance });
  }
});

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lucky 13 Backend (PostgreSQL) running on port ${PORT}`);
});
