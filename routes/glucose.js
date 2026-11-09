
const express = require("express");
const pool = require("../config/db");
const verifyToken = require("../middleware/auth");

const router = express.Router();

// SAVE A GLUCOSE READING
router.post("/", verifyToken, async (req, res) => {
    try {
        const { reading_type, glucose_value, notes } = req.body;

        const value = Number(glucose_value);

        if (
            !reading_type ||
            !Number.isFinite(value) ||
            value <= 0 ||
            value > 1000
        ) {
            return res.status(400).json({
                message: "Please provide a valid reading type and glucose value."
            });
        }

        const result = await pool.query(
            `INSERT INTO glucose_readings
             (user_id, reading_type, glucose_value, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                req.userId,
                reading_type.trim(),
                value,
                notes || null
            ]
        );

        res.status(201).json({
            message: "Glucose reading saved successfully!",
            reading: result.rows[0]
        });

    } catch (error) {
        console.error("Save reading error:", error.message);

        res.status(500).json({
            message: "Unable to save glucose reading."
        });
    }
});

// GET LOGGED-IN USER'S READINGS
router.get("/", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT *
             FROM glucose_readings
             WHERE user_id = $1
             ORDER BY measured_at DESC`,
            [req.userId]
        );

        res.json({
            message: "Glucose readings retrieved successfully!",
            readings: result.rows
        });

    } catch (error) {
        console.error("Fetch readings error:", error.message);

        res.status(500).json({
            message: "Unable to retrieve glucose readings."
        });
    }
});
// DELETE A GLUCOSE READING
router.delete(
    "/:id",
    (req, res, next) => {
        console.log("DELETE ROUTE HIT:", req.params.id);
        next();
    },
    verifyToken,
    async (req, res) => {
                console.log("DELETE REQUEST RECEIVED:", req.params.id);
    try {
        const readingId = Number(req.params.id);

        if (!Number.isInteger(readingId) || readingId <= 0) {
            return res.status(400).json({
                message: "Invalid reading ID."
            });
        }

        const result = await pool.query(
            `DELETE FROM glucose_readings
             WHERE id = $1 AND user_id = $2
             RETURNING id`,
            [readingId, req.userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({
                message: "Reading not found."
            });
        }

        res.json({
            message: "Reading deleted successfully!",
            id: result.rows[0].id
        });

    } catch (error) {
        console.error("Delete reading error:", error.message);

        res.status(500).json({
            message: "Unable to delete reading."
        });
    }
});
module.exports = router;
