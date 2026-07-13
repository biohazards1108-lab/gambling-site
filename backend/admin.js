// -----------------------------
// ADMIN MIDDLEWARE
// -----------------------------
app.use((req, res, next) => {
    if (req.path.startsWith("/admin")) {
        const key = req.headers["x-admin-key"];
        if (!key || key !== process.env.ADMIN_KEY) {
            return res.status(403).json({ error: "Invalid admin key" });
        }
    }
    next();
});

// -----------------------------
// ADMIN: SITE STATS
// -----------------------------
app.get("/admin/stats", async (req, res) => {
    try {
        const totalUsers = await db("SELECT COUNT(*) FROM users");
        const totalBalance = await db("SELECT SUM(balance) FROM users");
        const activeGames = await db("SELECT COUNT(*) FROM games WHERE active = true");

        res.json({
            totalUsers: totalUsers[0].count,
            totalBalance: totalBalance[0].sum,
            activeGames: activeGames[0].count
        });
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// -----------------------------
// ADMIN: USERS
// -----------------------------
app.get("/admin/users", async (req, res) => {
    const users = await db("SELECT id, username, balance, banned FROM users ORDER BY id ASC");
    res.json(users);
});

// BAN USER
app.post("/admin/ban/:id", async (req, res) => {
    await db("UPDATE users SET banned = true WHERE id = $1", [req.params.id]);
    res.json({ success: true });
});

// UNBAN USER
app.post("/admin/unban/:id", async (req, res) => {
    await db("UPDATE users SET banned = false WHERE id = $1", [req.params.id]);
    res.json({ success: true });
});

// -----------------------------
// ADMIN: GAME TOGGLE
// -----------------------------
app.post("/admin/toggle-game/:game", async (req, res) => {
    const game = req.params.game;
    await db("UPDATE games SET active = NOT active WHERE name = $1", [game]);
    res.json({ success: true });
});

// -----------------------------
// ADMIN: LOGS
// -----------------------------
app.get("/admin/logs", async (req, res) => {
    const logs = await db("SELECT * FROM logs ORDER BY id DESC LIMIT 200");
    res.send(logs.map(l => `${l.timestamp} - ${l.message}`).join("\n"));
});

// -----------------------------
// ADMIN: MAINTENANCE MODE
// -----------------------------
app.post("/admin/maintenance", async (req, res) => {
    await db("UPDATE settings SET maintenance = NOT maintenance");
    res.json({ success: true });
});
