// ---------------------------------------------
// Lucky 13 Casino Backend (Full Admin + Games)
// ---------------------------------------------

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const app = express();

// ---------------------------------------------
// Middleware
// ---------------------------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"]
}));

// ---------------------------------------------
// PostgreSQL
// ---------------------------------------------
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function db(sql, params) {
    const result = await pool.query(sql, params);
    return result.rows;
}

// ---------------------------------------------
// Config
// ---------------------------------------------
const JWT_SECRET = process.env.JWT_SECRET || "lucky13_secret_key";
const ADMIN_KEY = process.env.ADMIN_KEY || "lucky13kai07";

// ---------------------------------------------
// Root
// ---------------------------------------------
app.get("/", (req, res) => {
    res.send("Lucky 13 Backend is running.");
});

// ---------------------------------------------
// Auth middleware
// ---------------------------------------------
function auth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "No token provided" });

    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: "Invalid token" });
    }
}

// ---------------------------------------------
// Admin middleware
// ---------------------------------------------
function adminAuth(req, res, next) {
    const key = req.headers["x-admin-key"];
    if (!key || key !== ADMIN_KEY) {
        return res.status(403).json({ error: "Invalid admin key" });
    }
    next();
}

// ---------------------------------------------
// USER AUTH
// ---------------------------------------------
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Missing username or password" });

    try {
        const hashed = await bcrypt.hash(password, 10);

        const rows = await db(
            "INSERT INTO users (username, password, balance, active, banned_until, current_game, wins, losses) " +
            "VALUES ($1, $2, $3, false, NULL, NULL, 0, 0) RETURNING id, username, balance",
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
        if (err.code === "23505") {
            return res.status(400).json({ error: "Username already exists" });
        }
        res.status(500).json({ error: "Database error" });
    }
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const rows = await db("SELECT * FROM users WHERE username = $1", [username]);

        if (rows.length === 0)
            return res.status(400).json({ error: "User not found" });

        const user = rows[0];

        // ban check
        if (user.banned_until && new Date(user.banned_until) > new Date()) {
            return res.status(403).json({ error: "User is banned until " + user.banned_until });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid)
            return res.status(400).json({ error: "Invalid password" });

        await db("UPDATE users SET active = true WHERE id = $1", [user.id]);

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({ message: "Login successful", token });

    } catch {
        res.status(500).json({ error: "Server error" });
    }
});

app.post("/api/logout", auth, async (req, res) => {
    await db("UPDATE users SET active = false, current_game = NULL WHERE id = $1", [req.user.id]);
    res.json({ message: "Logged out" });
});

// ---------------------------------------------
// BALANCE + BET
// ---------------------------------------------
app.get("/api/balance", auth, async (req, res) => {
    try {
        const rows = await db("SELECT balance FROM users WHERE id = $1", [req.user.id]);
        res.json({ balance: rows[0].balance });
    } catch {
        res.status(500).json({ error: "Server error" });
    }
});

// generic bet endpoint (for simple games)
app.post("/api/bet", auth, async (req, res) => {
    const { amount, game } = req.body;

    if (!amount || amount <= 0)
        return res.status(400).json({ error: "Invalid bet amount" });

    try {
        const rows = await db("SELECT balance FROM users WHERE id = $1", [req.user.id]);
        let balance = rows[0].balance;

        if (amount > balance)
            return res.status(400).json({ error: "Insufficient balance" });

        const win = Math.random() < 0.5;

        let won = 0;
        let lost = 0;

        if (win) {
            const payout = amount * 2;
            balance += payout;
            won = payout;
            await db("UPDATE users SET balance = $1 WHERE id = $2", [balance, req.user.id]);
            res.json({ result: "win", payout, balance });
        } else {
            balance -= amount;
            lost = amount;
            await db("UPDATE users SET balance = $1 WHERE id = $2", [balance, req.user.id]);
            res.json({ result: "lose", payout: 0, balance });
        }

        // log game result
        await db(
            "INSERT INTO game_logs (user_id, game, won, lost, created_at) VALUES ($1, $2, $3, $4, NOW())",
            [req.user.id, game || "generic", won, lost]
        );

        // update user wins/losses
        await db(
            "UPDATE users SET wins = wins + $1, losses = losses + $2 WHERE id = $3",
            [won, lost, req.user.id]
        );

    } catch {
        res.status(500).json({ error: "Server error" });
    }
});

// ---------------------------------------------
// GAME ACTIVITY (for frontend to set current game)
// ---------------------------------------------
app.post("/api/game/activity", auth, async (req, res) => {
    const { game } = req.body;
    await db("UPDATE users SET current_game = $1 WHERE id = $2", [game, req.user.id]);
    res.json({ message: "Game activity updated" });
});

// ---------------------------------------------
// ADMIN ROUTES
// ---------------------------------------------

// Admin login
app.get("/api/admin/login", adminAuth, (req, res) => {
    res.json({ message: "Admin authenticated" });
});

// Casino stats
app.get("/api/admin/stats", adminAuth, async (req, res) => {
    const users = await db("SELECT COUNT(*) FROM users");
    const totalBalance = await db("SELECT SUM(balance) FROM users");
    const totals = await db("SELECT SUM(wins) AS total_won, SUM(losses) AS total_lost FROM users");

    res.json({
        users: users[0].count,
        totalBalance: totalBalance[0].sum,
        totalWon: totals[0].total_won || 0,
        totalLost: totals[0].total_lost || 0
    });
});

// All users
app.get("/api/admin/users", adminAuth, async (req, res) => {
    const rows = await db(
        "SELECT id, username, balance, active, current_game, wins, losses, banned_until " +
        "FROM users ORDER BY id ASC"
    );
    res.json(rows);
});

// Active users
app.get("/api/admin/active-users", adminAuth, async (req, res) => {
    const rows = await db(
        "SELECT id, username, balance, current_game, wins, losses, banned_until " +
        "FROM users WHERE active = true ORDER BY id ASC"
    );
    res.json(rows);
});

// Game activity log
app.get("/api/admin/game-activity", adminAuth, async (req, res) => {
    const rows = await db(
        "SELECT gl.id, u.username, gl.game, gl.won, gl.lost, gl.created_at " +
        "FROM game_logs gl JOIN users u ON gl.user_id = u.id " +
        "ORDER BY gl.id DESC LIMIT 100"
    );
    res.json(rows);
});

// Update balance
app.post("/api/admin/balance/:id", adminAuth, async (req, res) => {
    const { balance } = req.body;
    await db("UPDATE users SET balance = $1 WHERE id = $2", [balance, req.params.id]);
    res.json({ message: "Balance updated" });
});

// Ban user (minutes)
app.post("/api/admin/ban/:id", adminAuth, async (req, res) => {
    const { minutes } = req.body;
    const until = minutes === "9999"
        ? new Date("2999-01-01")
        : new Date(Date.now() + Number(minutes) * 60000);

    await db("UPDATE users SET banned_until = $1 WHERE id = $2", [until, req.params.id]);
    res.json({ message: "User banned", until });
});

// Unban user
app.post("/api/admin/unban/:id", adminAuth, async (req, res) => {
    await db("UPDATE users SET banned_until = NULL WHERE id = $1", [req.params.id]);
    res.json({ message: "User unbanned" });
});

// Games table (enable/disable)
app.get("/api/admin/games", adminAuth, async (req, res) => {
    const rows = await db("SELECT name, enabled FROM games ORDER BY name ASC");
    res.json(rows);
});

app.post("/api/admin/games", adminAuth, async (req, res) => {
    const { name, enabled } = req.body;
    await db("UPDATE games SET enabled = $1 WHERE name = $2", [enabled, name]);
    res.json({ message: "Game updated" });
});

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Lucky 13 Backend running on port ${PORT}`);
});
