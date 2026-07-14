// ---------------------------------------------
// Lucky 13 Casino Backend (Unified API + Socket.IO)
// ---------------------------------------------

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

// ---------------------------------------------
// CORS
// ---------------------------------------------
const corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"]
};
app.use(cors(corsOptions));
app.use(express.json());

// ---------------------------------------------
// Socket.IO
// ---------------------------------------------
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

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
    res.send("Lucky 13 Backend + Socket.IO is running.");
});

// ---------------------------------------------
// API TEST ROUTE
// ---------------------------------------------
app.get("/api/test", (req, res) => {
    res.json({ message: "API is working" });
});

// ---------------------------------------------
// REGISTER
// ---------------------------------------------
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password)
        return res.status(400).json({ error: "Missing username or password" });

    const hashed = await bcrypt.hash(password, 10);

    try {
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
// BET ROUTE (generic)
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
    const key = req.get("x-admin-key");
    if (!key || key !== ADMIN_KEY) {
        return res.status(403).json({ error: "Invalid admin key" });
    }
    next();
}

// Admin login
app.get("/api/admin/login", adminAuth, (req, res) => {
    res.json({ message: "Admin authenticated" });
});

// Admin stats
app.get("/api/admin/stats", adminAuth, async (req, res) => {
    const users = await db("SELECT COUNT(*) FROM users");
    const totalBalance = await db("SELECT SUM(balance) FROM users");

    res.json({
        users: users[0].count,
        totalBalance: totalBalance[0].sum
    });
});

// Get all users
app.get("/api/admin/users", adminAuth, async (req, res) => {
    const rows = await db("SELECT id, username, balance, banned FROM users ORDER BY id ASC");
    res.json(rows);
});

// Update balance
app.post("/api/admin/balance/:id", adminAuth, async (req, res) => {
    const { id } = req.params;
    const { balance } = req.body;

    await db("UPDATE users SET balance = $1 WHERE id = $2", [balance, id]);
    res.json({ message: "Balance updated" });
});

// Unban user
app.post("/api/admin/unban/:id", adminAuth, async (req, res) => {
    await db("UPDATE users SET banned = false WHERE id = $1", [req.params.id]);
    res.json({ message: "User unbanned" });
});

// Games table (optional)
app.get("/api/admin/games", adminAuth, async (req, res) => {
    const games = await db("SELECT name, enabled FROM games");
    res.json(games);
});

app.post("/api/admin/games", adminAuth, async (req, res) => {
    const { name, enabled } = req.body;
    await db("UPDATE games SET enabled = $1 WHERE name = $2", [enabled, name]);
    res.json({ message: "Game updated" });
});

// ---------------------------------------------
// SOCKET.IO MULTIPLAYER BLACKJACK
// ---------------------------------------------
const rooms = {}; // roomId -> { players: [], deck, dealer, state }

function createDeck() {
    const suits = ["S","H","D","C"];
    const values = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
    const deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push({ value: v, suit: s });
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function handValue(hand) {
    let total = 0, aces = 0;
    hand.forEach(card => {
        if (card.value === "A") { aces++; total += 11; }
        else if (["K","Q","J"].includes(card.value)) total += 10;
        else total += parseInt(card.value);
    });
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return total;
}

socket.on("joinRoom", ({ roomId, username }) => {
    if (!rooms[roomId]) {
        rooms[roomId] = {
            deck: createDeck(),
            dealer: [],
            players: [],
            state: "waiting"
        };
    }

    const room = rooms[roomId];

    // find first free seat 0–4
    const usedSeats = room.players.map(p => p.seat);
    let seat = 0;
    while (usedSeats.includes(seat) && seat < 5) seat++;

    room.players.push({
        id: socket.id,
        username,
        hand: [],
        done: false,
        seat
    });

    socket.join(roomId);
    io.to(roomId).emit("roomUpdate", room);
});


    socket.on("startGame", roomId => {
        const room = rooms[roomId];
        if (!room) return;

        room.deck = createDeck();
        room.dealer = [room.deck.pop(), room.deck.pop()];
        room.players.forEach(p => {
            p.hand = [room.deck.pop(), room.deck.pop()];
            p.done = false;
        });
        room.state = "playing";

        io.to(roomId).emit("roomUpdate", room);
    });

    socket.on("hit", roomId => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player || player.done) return;

        player.hand.push(room.deck.pop());

        if (handValue(player.hand) > 21) {
            player.done = true;
        }

        io.to(roomId).emit("roomUpdate", room);
    });

    socket.on("stand", roomId => {
        const room = rooms[roomId];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (!player) return;

        player.done = true;

        if (room.players.every(p => p.done)) {
            while (handValue(room.dealer) < 17) {
                room.dealer.push(room.deck.pop());
            }
            room.state = "finished";
        }

        io.to(roomId).emit("roomUpdate", room);
    });

    socket.on("chat", ({ roomId, message, username }) => {
        io.to(roomId).emit("chatMessage", { username, message });
    });

    socket.on("disconnect", () => {
        for (const roomId in rooms) {
            rooms[roomId].players = rooms[roomId].players.filter(p => p.id !== socket.id);
            io.to(roomId).emit("roomUpdate", rooms[roomId]);
        }
        console.log("Socket disconnected:", socket.id);
    });
});

// ---------------------------------------------
// START SERVER
// ---------------------------------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Lucky 13 Backend + Socket.IO running on port ${PORT}`);
});
