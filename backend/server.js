import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 3000;

// CORS config for your GitHub Pages frontend
app.use(cors({
    origin: "https://biohazards1108-lab.github.io",
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// --- LOGIN ROUTE ---
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    // demo creds – change to real auth later
    if (username === "biohazards1109" && password === "1234") {
        res.cookie("session", "valid", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        return res.json({ success: true });
    }

    res.json({ success: false });
});

// --- SESSION CHECK ROUTE ---
app.get("/session", (req, res) => {
    const session = req.cookies.session;

    if (session === "valid") {
        return res.json({ valid: true });
    }

    res.json({ valid: false });
});

// --- ROOT TEST ---
app.get("/", (req, res) => {
    res.send("Casino backend running");
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
