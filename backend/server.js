import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: "https://biohazards1108-lab.github.io",
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Handle preflight OPTIONS requests
app.options("*", cors({
    origin: "https://biohazards1108-lab.github.io",
    credentials: true,
}));

// LOGIN ROUTE
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    if (username === "admin" && password === "1234") {
        res.cookie("session", "valid", {
            httpOnly: true,
            secure: true,
            sameSite: "none",
        });

        return res.json({ success: true });
    }

    res.json({ success: false });
});

// SESSION CHECK
app.get("/session", (req, res) => {
    const session = req.cookies.session;

    if (session === "valid") {
        return res.json({ valid: true });
    }

    res.json({ valid: false });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
