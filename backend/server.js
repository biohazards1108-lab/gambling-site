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

// Preflight handler
app.options("*", cors({
    origin: "https://biohazards1108-lab.github.io",
    credentials: true
}));

// LOGIN ROUTE
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            "SELECT id FROM users WHERE username=$1 AND password=$2",
            [username, password]
        );

        if (result.rows.length === 1) {
            res.cookie("session", result.rows[0].id, {
                httpOnly: true,
                secure: true,
                sameSite: "none"
            });

            return res.json({ success: true });
        }

        res.json({ success: false, message: "Invalid login" });

    } catch (err) {
        console.error("DB error:", err);
        res.status(500).json({ success: false, message: "Database error" });
    }
});

// SESSION CHECK
app.get("/api/session", (req, res) => {
    const session = req.cookies.session;

    if (session) {
        return res.json({ valid: true });
    }

    res.json({ valid: false });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
