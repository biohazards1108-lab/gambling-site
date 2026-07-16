// backend/index.js
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import pkg from "pg";

const { Pool } = pkg;

// 1. Create Express app
const app = express();

// 2. Create HTTP server
const server = http.createServer(app);

// 3. Create Socket.IO server
const io = new Server(server, {
    cors: {
        origin: "https://biohazards1108-lab.github.io",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"]
    }
});

// 4. Middleware
app.use(cors({
    origin: "https://biohazards1108-lab.github.io",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"]
}));

app.use(express.json());
app.use(express.static("public"));


// --- Database (Railway) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// --- Auth Middleware ---
async function auth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    try {
        const result = await pool.query(
            "SELECT id, username, role FROM users WHERE token = $1",
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid token" });
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        console.error("Auth error:", err);
        res.status(500).json({ error: "Auth error" });
    }
}

// --- Admin Auth ---
function adminAuth(req, res, next) {
    const key = req.headers["x-admin-key"];
    if (key !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: "Admins only" });
    }
    next();
}

// --- Emit Admin Stats ---
async function emitAdminStats() {
    try {
        const users = await pool.query(
            "SELECT id, username, balance FROM users ORDER BY id ASC"
        );

        const stats = await pool.query(
            "SELECT game, COALESCE(SUM(profit),0) AS total_profit FROM game_stats GROUP BY game"
        );

        io.to("admin-room").emit("adminUsersUpdate", users.rows);
        io.to("admin-room").emit("adminGameStats", stats.rows);
    } catch (err) {
        console.error("emitAdminStats error:", err);
    }
}

// --- LOGIN ---
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Missing username or password" });
    }

    try {
        const result = await pool.query(
            "SELECT id, username, password, token FROM users WHERE username = $1",
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: "Invalid username" });
        }

        const user = result.rows[0];

        if (user.password !== password) {
            return res.status(400).json({ error: "Invalid password" });
        }

        res.json({ token: user.token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Login error" });
    }
});

// --- BALANCE ---
app.get("/api/balance", auth, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT balance FROM users WHERE id = $1",
            [req.user.id]
        );

        res.json({ balance: result.rows[0].balance });
    } catch (err) {
        console.error("Balance error:", err);
        res.status(500).json({ error: "Balance error" });
    }
});

// --- REFILL ---
app.post("/api/refill", auth, async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT balance FROM users WHERE id = $1",
            [req.user.id]
        );

        const current = result.rows[0].balance;
        const newBalance = 1000;

        await pool.query(
            "UPDATE users SET balance = $1 WHERE id = $2",
            [newBalance, req.user.id]
        );

        await pool.query(
            "INSERT INTO game_stats (game, profit) VALUES ($1, $2)",
            ["refill", -(newBalance - current)]
        );

        await emitAdminStats();

        res.json({
            balance: newBalance,
            message: "Refilled to 1000 tokens"
        });
    } catch (err) {
        console.error("Refill error:", err);
        res.status(500).json({ error: "Refill error" });
    }
});

// --- BET ---
app.post("/api/bet", auth, async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
    }

    try {
        const result = await pool.query(
            "SELECT balance FROM users WHERE id = $1",
            [req.user.id]
        );

        let balance = result.rows[0].balance;

        if (balance < amount) {
            return res.status(400).json({ error: "Insufficient balance" });
        }

        balance -= amount;

        const win = Math.random() < 0.4;
        let payout = 0;
        let profit = amount;

        if (win) {
            payout = amount * 2;
            balance += payout;
            profit = amount - payout;
        }

        await pool.query(
            "UPDATE users SET balance = $1 WHERE id = $2",
            [balance, req.user.id]
        );

        await pool.query(
            "INSERT INTO game_stats (game, profit) VALUES ($1, $2)",
            ["slots", profit]
        );

        await emitAdminStats();

        res.json({
            balance,
            result: win ? "win" : "lose",
            payout
        });
    } catch (err) {
        console.error("Bet error:", err);
        res.status(500).json({ error: "Bet error" });
    }
});

// --- ADMIN: Change Balance ---
app.post("/api/admin/balance/:id", adminAuth, async (req, res) => {
    const { id } = req.params;
    const { balance } = req.body;

    try {
        await pool.query(
            "UPDATE users SET balance = $1 WHERE id = $2",
            [balance, id]
        );

        await emitAdminStats();

        res.json({ message: "Balance updated" });
    } catch (err) {
        console.error("Admin balance error:", err);
        res.status(500).json({ error: "Admin balance error" });
    }
});

// --- Socket.IO ---
io.on("connection", socket => {
    socket.on("joinAdmin", () => {
        socket.join("admin-room");
        emitAdminStats();
    });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
