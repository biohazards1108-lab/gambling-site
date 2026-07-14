// server/index.js
import express from "express";
import http from "http";
import { Server } from "socket.io";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.json());
app.use(express.static("public");

// --- DB (Railway) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

// --- Auth middleware ---
async function auth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const { rows } = await pool.query(
            "SELECT id, username, role FROM users WHERE token = $1",
            [token]
        );
        if (!rows.length) return res.status(401).json({ error: "Invalid token" });
        req.user = rows[0];
        next();
    } catch (e) {
        res.status(500).json({ error: "Auth error" });
    }
}

function adminAuth(req, res, next) {
    const key = req.headers["x-admin-key"];
    if (key !== process.env.ADMIN_KEY) {
        return res.status(403).json({ error: "Admins only" });
    }
    next();
}

// --- Helper: emit live admin stats ---
async function emitAdminStats() {
    try {
        const usersRes = await pool.query(
            "SELECT id, username, balance FROM users ORDER BY id ASC"
        );
        const gameRes = await pool.query(
            "SELECT game, COALESCE(SUM(profit),0) AS total_profit FROM game_stats GROUP BY game"
        );

        io.to("admin-room").emit("adminUsersUpdate", usersRes.rows);
        io.to("admin-room").emit("adminGameStats", gameRes.rows);
    } catch (e) {
        console.error("emitAdminStats error", e);
    }
}

// --- API: balance ---
app.get("/api/balance", auth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT balance FROM users WHERE id = $1",
            [req.user.id]
        );
        res.json({ balance: rows[0].balance });
    } catch {
        res.status(500).json({ error: "Balance error" });
    }
});

// --- API: refill (max 1000) ---
app.post("/api/refill", auth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            "SELECT balance FROM users WHERE id = $1",
            [req.user.id]
        );
        const current = rows[0].balance;
        const newBalance = current >= 1000 ? 1000 : 1000;

        await pool.query(
            "UPDATE users SET balance = $1 WHERE id = $2",
            [newBalance, req.user.id]
        );

        await pool.query(
            "INSERT INTO game_stats (game, profit) VALUES ($1, $2)",
            ["refill", - (newBalance - current)]
        );

        await emitAdminStats();

        res.json({ balance: newBalance, message: "Refilled to 1000 tokens" });
    } catch {
        res.status(500).json({ error: "Refill error" });
    }
});

// --- API: bet (slots example) ---
app.post("/api/bet", auth, async (req, res) => {
    const { amount } = req.body;
    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
    }

    try {
        const userRes = await pool.query(
            "SELECT balance FROM users WHERE id = $1",
            [req.user.id]
        );
        let balance = userRes.rows[0].balance;

        if (balance < amount) {
            return res.status(400).json({ error: "Insufficient balance" });
        }

        balance -= amount;

        // simple win/lose
        const win = Math.random() < 0.4;
        let payout = 0;
        let profit = amount;

        if (win) {
            payout = amount * 2;
            balance += payout;
            profit = amount - payout; // casino profit (negative if paying out more)
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
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Bet error" });
    }
});

// --- API: admin change balance ---
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
    } catch {
        res.status(500).json({ error: "Admin balance error" });
    }
});

// --- Socket.IO ---
io.on("connection", socket => {
    socket.on("joinAdmin", () => {
        socket.join("admin-room");
        emitAdminStats();
    });

    // you can add game rooms, chat, etc. here
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server running on port", PORT);
});
