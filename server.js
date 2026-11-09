const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");

const app = express();

app.use(cors());
app.use(express.json());
const authRoutes = require("./routes/auth");
const glucoseRoutes = require("./routes/glucose");
const reminderRoutes = require("./routes/reminders");

console.log(
    "Loaded authentication routes:",
    authRoutes.stack.map(route => route.route.path)
);

app.use("/api/auth", authRoutes);
app.use("/api/glucose", glucoseRoutes);
app.use("/api/reminders", reminderRoutes);

app.get("/", (req, res) => {
    res.json({ message: "Welcome to Sweety API!" });
});

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT current_database()");

        res.json({
            status: "success",
            database: result.rows[0].current_database
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Database connection failed"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Sweety server running on port ${PORT}`);
});