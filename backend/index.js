// backend/index.js
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import pkg from "pg";
import blackjack from "./blackjack.js";

const { Pool } = pkg;

// EXPRESS APP
const app = express();

// HTTP SERVER
const server = http.createServer(app);

// DATABASE (Railway)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// SOCKET.IO
const io = new Server(server, {
    cors: {
        origin: "https://biohazards1108-lab.github.io",
        methods: ["GET", "POST"],
        allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"]
    }
});

// LOAD BLACKJACK GAME
blackjack(io, pool);

// MIDDLEWARE
app.use(cors({
    origin: "https://biohazards1108-lab.github.io",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"]
}));

app.use(express.json());
app.use(express.static("public"));


// AUTH MIDDLEWARE
async function auth(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
        const result = await pool.query(
            "SELECT id, username, role FROM users WHERE token = $1",
            [token]
        );

        if (result.rows.length === 0)
            return res.status(401).json({ error: "Invalid token" });

        req.user = result.rows[0];
        next();
    } catch (err) {
        console.error("Auth error:", err);
        res.status(500).json({ error: "Auth error" });
    }
}

// ADMIN AUTH
function adminAuth(req, res, next) {
    const key = req.headers["x-admin-key"];
    if (key !== process.env.ADMIN_KEY)
        return res.status(403).json({ error: "Admins only" });
    next();
}

// /api/me (REQUIRED BY DASHBOARD + ALL GAMES)
app.get("/api/me", auth, (req, res) => {
    res.json({
        id: req.user.id,
        username: req.user.username,
        role: req.user.role
    });
});

// REGISTER
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Missing username or password" });

    try {
        const exists = await pool.query(
            "SELECT id FROM users WHERE username = $1",
            [username]
        );

        if (exists.rows.length > 0)
            return res.status(400).json({ error: "Username already taken" });

        const tokenResult = await pool.query("SELECT gen_random_uuid() AS token");
        const token = tokenResult.rows[0].token;

        await pool.query(
            "INSERT INTO users (username, password, token, balance) VALUES ($1, $2, $3, $4)",
            [username, password, token, 1000]
        );

        res.json({ message: "Account created", token });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ error: "Register error" });
    }
});

// LOGIN
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Missing username or password" });

    try {
        const result = await pool.query(
            "SELECT id, username, password, token FROM users WHERE username = $1",
            [username]
        );

        if (result.rows.length === 0)
            return res.status(400).json({ error: "Invalid username" });

        const user = result.rows[0];

        if (user.password !== password)
            return res.status(400).json({ error: "Invalid password" });

        res.json({ token: user.token });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Login error" });
    }
});

// BALANCE
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

// REFILL
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

        res.json({
            balance: newBalance,
            message: "Refilled to 1000 tokens"
        });
    } catch (err) {
        console.error("
