// ---------------------------------------------
// Lucky 13 Casino Backend (Unified API Edition)
// ---------------------------------------------

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

// ---------------------------------------------
// REQUIRED: JSON BODY PARSER (Fixes your crash)
// ---------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------
// CORS — GitHub Pages + Railway
// ---------------------------------------------
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"]
}));

// ---------------------------------------------
// PostgreSQL Connection
// ---------------------------------------------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// ---------------------------------------------
// JWT Secret
// ---------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || "lucky13_secret_key";

// ---------------------------------------------
// Helper: Query Wrapper
// ---------------------------------------------
async function db(sql, params) {
    const result = await pool.query(sql, params);
    return result.rows;
}

// ---------------------------------------------
// ROOT ROUTE
// ---------------------------------------------
app.get("/", (req, res) => {
    res.send("Lucky 13 Backend is running.");
});

// ---------------------------------------------
// REGISTER
// ---------------------------------------------
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Missing username or password" });

    try {
        const hashed = await bcrypt.hash(password, 10);

        const rows = await db(
            "INSERT INTO users (username, password, balance) VALUES ($1, $2, $3) RETURNING id, username, balance",
            [username, hashed, 1000]
        );

        const user = rows[0];

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ message: "Account created", token, user });

    } catch (err) {
        console.error("REGISTER ERROR:", err);
        if (err.code === "23505") {
            return res.status(400).json({ error: "Username already exists" });
        }
        res.status(500).json({ error: "Database error" });
    }
});

// ---------------------------------------------
// LOGIN
// ---------------------------------------------
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const rows = await db("SELECT * FROM users WHERE username = $1", [username]);

        if (rows.length === 0)
            return res.status(400).json({ error: "User not found" });

        const user = rows[0];

        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
            return res.status(400).json({ error: "Invalid password" });

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ message: "Login successful", token });

    } catch (err) {
        console.error("LOGIN ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ---------------------------------------------
// AUTH MIDDLEWARE
// ---------------------------------------------
function auth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// ---------------------------------------------
// GET BALANCE
// ---------------------------------------------
app.get("/api/balance", auth, async (req, res) => {
    try {
        const rows = await db("SELECT balance FROM users WHERE id = $1", [req.user.id]);
        res.json({ balance: rows[0].balance });
    } catch (err) {
        console.error("BALANCE ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ---------------------------------------------
// BET ROUTE
// ---------------------------------------------
app.post("/api/bet", auth, async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0)
        return res.status(400).json({ error: "Invalid bet amount" });

    try {
        const rows = await db("SELECT balance FROM users WHERE id = $1", [req.user.id]);
        let balance = rows[0].balance;

        if (amount > balance)
            return res.status(400).json({ error: "Insufficient balance" });

        const win = Math.random() < 0.5;

        if (win) {
            const payout = amount * 2;
            balance += payout;
            await db("UPDATE users SET balance = $1 WHERE id = $2", [balance, req.user.id]);
            return res.json({ result: "win", payout, balance });
        } else {
            balance -= amount;
            await db("UPDATE users SET balance = $1 WHERE id = $2", [balance, req.user.id]);
            return res.json({ result: "lose", payout: 0, balance });
        }

    } catch (err) {
        console.error("BET ERROR:", err);
        res.status(500).json({ error: "Server error" });
    }
});

// ---------------------------------------------
// ADMIN SYSTEM
// ---------------------------------------------
const ADMIN_KEY = process.env.ADMIN_KEY || "lucky13kai07";

function adminAuth(req, res, next) {
    const key = req.headers["x-admin-key"];
    if (!key || key !== ADMIN_KEY) {
        return res.status(403).json({ error: "Invalid admin key" });
    }
    next();
}

app.get("/api/admin/login", adminAuth, (req, res) => {
    res.json({ message: "Admin authenticated" });
});

app.get("/api/admin/stats", adminAuth, async (req, res) => {
    const users = await db("SELECT COUNT(*) FROM users");
    const totalBalance = await db("SELECT SUM(balance) FROM users");

    res.json({
        users: users[0].count,
        totalBalance: totalBalance[0].sum
    });
});

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lucky 13 Backend running on port ${PORT}`);
});
