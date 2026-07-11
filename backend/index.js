const express = require("express");
const app = express();

// allow JSON body parsing
app.use(express.json());

// test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend connection successful!" });
});

// root route
app.get("/", (req, res) => {
  res.send("Backend is live!");
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
