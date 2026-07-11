const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();
app.use(express.json());
app.use(cors());

// -------------------------------
// CONFIG
// -------------------------------
const JWT_SECRET = "CHANGE_THIS_SECRET_KEY";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// -------------------------------
// AUTH MIDDLEWARE
// -------------------------------
function auth(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ error: "Missing token" });

    const token = header.split(" ")[1];
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ error: "Invalid token" });
    }
}

// -------------------------------
// REGISTER
// -------------------------------
app.post("/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Missing fields" });

    try {
        const hashed = await bcrypt.hash(password, 10);

        await pool.query(
            "INSERT INTO users (username, password, balance) VALUES ($1, $2, 1000)",
            [username, hashed]
        );

        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: "Username already exists" });
    }
});

// -------------------------------
// LOGIN
// -------------------------------
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

    if (!match)
        return res.status(400).json({ error: "Invalid password" });

    const token = jwt.sign(
        {
            id: user.id,
            username: user.username,
            admin: user.username === "admin"
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );

    res.json({ token });
});

// -------------------------------
// GET BALANCE
// -------------------------------
app.get("/balance", auth, async (req, res) => {
    const result = await pool.query(
        "SELECT balance FROM users WHERE id = $1",
        [req.user.id]
    );

    res.json({ balance: result.rows[0].balance });
});

// -------------------------------
// BET (update balance)
// amount can be positive (win) or negative (loss)
// -------------------------------
app.post("/bet", auth, async (req, res) => {
    const { amount } = req.body;

    if (typeof amount !== "number")
        return res.status(400).json({ error: "Invalid amount" });

    const result = await pool.query(
        "UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING balance",
        [amount, req.user.id]
    );

    res.json({ balance: result.rows[0].balance });
});

// -------------------------------
// ADMIN — GET ALL USERS
// -------------------------------
app.get("/admin/users", auth, async (req, res) => {
    if (!req.user.admin)
        return res.status(403).json({ error: "Forbidden" });

    const result = await pool.query(
        "SELECT id, username, balance FROM users ORDER BY id ASC"
    );

    res.json(result.rows);
});

// -------------------------------
// SERVER START
// -------------------------------
app.listen(3000, () => {
    console.log("Backend running on port 3000");
});
