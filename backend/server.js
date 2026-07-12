const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const JWT_SECRET = "SUPER_SECRET_KEY_CHANGE_THIS";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware: verify JWT
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(403).json({ error: "Invalid token" });
  }
}

// REGISTER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashed = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      [username, hashed]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: "Username already exists" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );

  if (result.rows.length === 0)
    return res.status(400).json({ error: "Invalid username" });

  const user = result.rows[0];

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Invalid password" });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

// GET BALANCE
app.get("/balance", auth, async (req, res) => {
  const result = await pool.query(
    "SELECT balance FROM users WHERE id = $1",
    [req.user.id]
  );
  res.json({ balance: result.rows[0].balance });
});

// BET (update balance)
app.post("/bet", auth, async (req, res) => {
  const { amount } = req.body;

  const result = await pool.query(
    "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
    [amount, req.user.id]
  );

  res.json({ balance: result.rows[0].balance });
});

app.listen(3000, () => console.log("Server running"));