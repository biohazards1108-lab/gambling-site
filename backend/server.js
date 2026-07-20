import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pkg from "pg";

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// CORS for GitHub Pages
app.use(cors({
    origin: "https://biohazards1108-lab.github.io",
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// Preflight
app.options("*", cors({
    origin: "https://biohazards1108-lab.github.io",
    credentials: true
}));

// LOGIN — THIS IS THE PART THAT WORKED BEFORE
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            "SELECT id FROM users WHERE username=$1 AND password=$2",
            [username, password]
        );

        if (result.rows.length === 1) {
            // Set login cookie
            res.cookie("session", result.rows[0].id, {
                httpOnly: true,
                secure: true,
                sameSite: "none"
            });

            return res.json({ success: true });
        }

        res.json({ success: false, message: "Invalid login" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// SESSION CHECK — REQUIRED FOR DASHBOARD
app.get("/api/session", (req, res) => {
    const session = req.cookies.session;

    if (session) {
        return res.json({ valid: true });
    }

    res.json({ valid: false });
});

// USER INFO — FIX BALANCE LATER
app.get("/api/me", async (req, res) => {
    const session = req.cookies.session;

    if (!session) return res.json({ error: "Not logged in" });

    const result = await pool.query(
        "SELECT username FROM users WHERE id=$1",
        [session]
    );

    res.json({ username: result.rows[0].username });
});

// BALANCE — WE WILL FIX THIS AFTER LOGIN WORKS
app.get("/api/balance", async (req, res) => {
    const session = req.cookies.session;

    if (!session) return res.json({ error: "Not logged in" });

    const result = await pool.query(
        "SELECT balance FROM users WHERE id=$1",
        [session]
    );

    res.json({ balance: result.rows[0].balance });
});

// LOGOUT
app.post("/api/logout", (req, res) => {
    res.clearCookie("session");
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
