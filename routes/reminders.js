
const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const auth = require("../middleware/auth");

// GET: Fetch the logged-in user's reminders
router.get("/", auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT * FROM reminders
             WHERE user_id = $1
             ORDER BY reminder_time ASC`,
            [req.userId]
        );

        res.json({ reminders: result.rows });
    } catch (error) {
        console.error("Fetch reminders error:", error);
        res.status(500).json({ message: "Unable to fetch reminders." });
    }
});

// POST: Create a reminder
router.post("/", auth, async (req, res) => {
    try {
        const {
            title,
            reminder_type,
            reminder_time,
            repeat_days
        } = req.body;

        if (!title || !reminder_type || !reminder_time) {
            return res.status(400).json({
                message: "Title, reminder type and time are required."
            });
        }

        const result = await pool.query(
            `INSERT INTO reminders
             (user_id, title, reminder_type, reminder_time, repeat_days)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                req.userId,
                title,
                reminder_type,
                reminder_time,
                repeat_days || "Every day"
            ]
        );

        res.status(201).json({
            message: "Reminder created successfully!",
            reminder: result.rows[0]
        });
    } catch (error) {
        console.error("Create reminder error:", error);
        res.status(500).json({ message: "Unable to create reminder." });
    }
});

// DELETE: Delete a reminder
router.delete("/:id", auth, async (req, res) => {
    try {
        const result = await pool.query(
            `DELETE FROM reminders
             WHERE id = $1 AND user_id = $2
             RETURNING *`,
            [req.params.id, req.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Reminder not found."
            });
        }

        res.json({ message: "Reminder deleted successfully!" });
    } catch (error) {
        console.error("Delete reminder error:", error);
        res.status(500).json({ message: "Unable to delete reminder." });
    }
});

module.exports = router;
