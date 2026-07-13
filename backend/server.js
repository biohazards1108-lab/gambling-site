// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- DB SETUP ----------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// helper
async function db(query, params = []) {
    const res = await pool.query(query, params);
    return res.rows;
}

app.use(cors());
app.use(express.json());

// ---------- HEALTH ----------
app.get("/", (req, res) => {
    res.json({ ok: true, service: "Lucky 13 Backend" });
});

// ---------- AUTH ----------
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// register
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
    }

    try {
        const existing = await db("SELECT id FROM users WHERE username=$1", [username]);
        if (existing.length) {
            return res.status(400).json({ error: "Username already taken" });
        }

        const rows = await db(
            "INSERT INTO users (username, password, balance, banned) VALUES ($1,$2,$3,false) RETURNING id",
            [username, password, 1000]
        );

        const token = jwt.sign({ id: rows[0].id }, JWT_SECRET);
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// login
app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
    }

    try {
        const rows = await db(
            "SELECT id, password, banned FROM users WHERE username=$1",
            [username]
        );
        if (!rows.length) return res.status(400).json({ error: "Invalid credentials" });
        const user = rows[0];

        if (user.banned) return res.status(403).json({ error: "Account banned" });
        if (user.password !== password) return res.status(400).json({ error: "Invalid credentials" });

        const token = jwt.sign({ id: user.id }, JWT_SECRET);
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// auth middleware
function auth(req, res, next) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.id;
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// ---------- PLAYER ROUTES ----------
app.get("/balance", auth, async (req, res) => {
    try {
        const rows = await db("SELECT balance FROM users WHERE id=$1", [req.userId]);
        if (!rows.length) return res.status(404).json({ error: "User not found" });
        res.json({ balance: rows[0].balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// simple bet example
app.post("/bet", auth, async (req, res) => {
    const { amount, result } = req.body; // result: "win" or "lose"
    if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid amount" });

    try {
        const rows = await db("SELECT balance FROM users WHERE id=$1", [req.userId]);
        if (!rows.length) return res.status(404).json({ error: "User not found" });

        let balance = rows[0].balance;
        if (balance < amount) return res.status(400).json({ error: "Insufficient balance" });

        if (result === "win") balance += amount;
        else balance -= amount;

        await db("UPDATE users SET balance=$1 WHERE id=$2", [balance, req.userId]);
        res.json({ balance });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ---------- ADMIN MIDDLEWARE ----------
const ADMIN_KEY = process.env.ADMIN_KEY;

app.use((req, res, next) => {
    if (req.path.startsWith("/admin")) {
        const key = req.headers["x-admin-key"];
        if (!key || key !== ADMIN_KEY) {
            return res.status(403).json({ error: "Invalid admin key" });
        }
    }
    next();
});

// ---------- ADMIN ROUTES ----------
app.get("/admin/stats", async (req, res) => {
    try {
        const totalUsers = await db("SELECT COUNT(*) FROM users");
        const totalBalance = await db("SELECT COALESCE(SUM(balance),0) FROM users");
        const activeGames = await db("SELECT COUNT(*) FROM games WHERE active=true");

        res.json({
            totalUsers: Number(totalUsers[0].count || 0),
            totalBalance: Number(totalBalance[0].coalesce || totalBalance[0].sum || 0),
            activeGames: activeGames.length ? Number(activeGames[0].count) : 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/admin/users", async (req, res) => {
    try {
        const users = await db(
            "SELECT id, username, balance, banned FROM users ORDER BY id ASC"
        );
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/admin/ban/:id", async (req, res) => {
    try {
        await db("UPDATE users SET banned=true WHERE id=$1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/admin/unban/:id", async (req, res) => {
    try {
        await db("UPDATE users SET banned=false WHERE id=$1", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/admin/toggle-game/:game", async (req, res) => {
    try {
        const name = req.params.game;
        await db("UPDATE games SET active = NOT active WHERE name=$1", [name]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

app.get("/admin/logs", async (req, res) => {
    try {
        const logs = await db(
            "SELECT timestamp, message FROM logs ORDER BY id DESC LIMIT 200"
        );
        const text = logs
            .map(l => `${l.timestamp} - ${l.message}`)
            .join("\n");
        res.send(text);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading logs");
    }
});

app.post("/admin/maintenance", async (req, res) => {
    try {
        await db("UPDATE settings SET maintenance = NOT maintenance");
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// ---------- START ----------
app.listen(PORT, () => {
    console.log(`Lucky 13 backend running on port ${PORT}`);
});
