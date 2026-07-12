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

    const user = result.rows[0];

    // CREATE TOKEN
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Account created",
      token,
      user
    });

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
// ---------------------------------------------
// ADMIN AUTH (simple key-based auth)
// ---------------------------------------------
function adminAuth(req, res, next) {
  const key = req.header("x-admin-key");
  if (!key || key !== process.env.ADMIN_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// ---------------------------------------------
// ADMIN: SITE STATS
// ---------------------------------------------
app.get("/admin/stats", adminAuth, async (req, res) => {
  try {
    const totalUsers = await pool.query("SELECT COUNT(*) FROM users");
    const totalBalance = await pool.query("SELECT SUM(balance) FROM users");
    const activeGames = await pool.query("SELECT COUNT(*) FROM games WHERE enabled = true");

    res.json({
      totalUsers: totalUsers.rows[0].count,
      totalBalance: totalBalance.rows[0].sum,
      activeGames: activeGames.rows[0].count
    });
  } catch (err) {
    console.error("ADMIN /stats ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------
// ADMIN: USER LIST
// ---------------------------------------------
app.get("/admin/users", adminAuth, async (req, res) => {
  try {
    const users = await pool.query(
      "SELECT id, username, balance, banned FROM users ORDER BY id ASC"
    );
    res.json(users.rows);
  } catch (err) {
    console.error("ADMIN /users ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------
// ADMIN: TOGGLE GAME
// ---------------------------------------------
app.post("/admin/toggle-game/:game", adminAuth, async (req, res) => {
  try {
    await pool.query(
      "UPDATE games SET enabled = NOT enabled WHERE name = $1",
      [req.params.game]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN /toggle-game ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------
// ADMIN: BAN USER
// ---------------------------------------------
app.post("/admin/ban/:id", adminAuth, async (req, res) => {
  try {
    await pool.query("UPDATE users SET banned = true WHERE id = $1", [
      req.params.id
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN /ban ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------
// ADMIN: UNBAN USER
// ---------------------------------------------
app.post("/admin/unban/:id", adminAuth, async (req, res) => {
  try {
    await pool.query("UPDATE users SET banned = false WHERE id = $1", [
      req.params.id
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN /unban ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------
// ADMIN: LOGS
// ---------------------------------------------
app.get("/admin/logs", adminAuth, async (req, res) => {
  try {
    const logs = await pool.query(
      "SELECT * FROM logs ORDER BY timestamp DESC LIMIT 200"
    );
    res.send(
      logs.rows.map(l => `[${l.timestamp}] ${l.message}`).join("\n")
    );
  } catch (err) {
    console.error("ADMIN /logs ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------
// ADMIN: MAINTENANCE MODE
// ---------------------------------------------
app.post("/admin/maintenance", adminAuth, async (req, res) => {
  try {
    await pool.query("UPDATE settings SET maintenance = NOT maintenance");
    res.json({ success: true });
  } catch (err) {
    console.error("ADMIN /maintenance ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------
// ADMIN: CLEAR CACHE (placeholder)
// ---------------------------------------------
app.post("/admin/clear-cache", adminAuth, async (req, res) => {
  res.json({ success: true, message: "Cache cleared" });
});

// ---------------------------------------------
// ADMIN: RESTART BACKEND (Railway auto-restarts)
// ---------------------------------------------
app.post("/admin/restart", adminAuth, async (req, res) => {
  res.json({ success: true, message: "Restarting..." });
  setTimeout(() => process.exit(1), 1000);
});


// ---------------------------------------------
// START SERVER
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Lucky 13 Backend (PostgreSQL) running on port ${PORT}`);
});
