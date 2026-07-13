// server.js
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import fs from "fs";

const app = express();
app.use(express.json());
app.use(cors());

// Load admin credentials
const adminData = JSON.parse(fs.readFileSync("./admin/admin.db.json", "utf8"));
const SECRET = process.env.JWT_SECRET || "supersecretkey";

// LOGIN ROUTE
app.post("/admin/login", (req, res) => {
    const { username, password } = req.body;

    if (username === adminData.username && password === adminData.password) {
        const token = jwt.sign({ role: "admin" }, SECRET, { expiresIn: "2h" });
        return res.json({ success: true, token });
    }

    res.status(401).json({ success: false, message: "Invalid credentials" });
});

// VERIFY TOKEN ROUTE
app.post("/admin/verify", (req, res) => {
    const { token } = req.body;

    try {
        const decoded = jwt.verify(token, SECRET);
        res.json({ valid: true, decoded });
    } catch (err) {
        res.json({ valid: false });
    }
});

// LOGOUT ROUTE
app.post("/admin/logout", (req, res) => {
    res.json({ success: true });
});

// PROTECTED ROUTE EXAMPLE
app.get("/admin/data", (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];

    try {
        jwt.verify(token, SECRET);
        res.json({ message: "Protected admin data" });
    } catch {
        res.status(403).json({ message: "Unauthorized" });
    }
});

app.listen(3000, () => console.log("Backend running on port 3000"));
