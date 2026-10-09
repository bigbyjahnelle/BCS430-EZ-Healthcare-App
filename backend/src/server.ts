import "dotenv/config";
import express from "express";
import pg from "pg";

const { Pool } = pg;

const app = express();
const port = Number(process.env.PORT ?? 3001);

// Reads the PostgreSQL connection settings from .env.
const pool = new Pool({
    connectionTimeoutMillis: 5000,
});

app.use(express.json());

pool.on("error", (error) => {
    console.error("Unexpected database connection error:", error.message);
});

// Check that the backend can communicate with PostgreSQL.
app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            status: "ok",
            message: "EZ Healthcare backend is running!",
            database: "connected",
        });
    } catch (error) {
        console.error("Database health check failed:", error);

        res.status(503).json({
            status: "error",
            database: "disconnected",
        });
    }
});

// Demo endpoint: only returns Matt's fictional sample medication.
// Real patient access will require authentication later.
app.get("/api/demo/medications", async (_req, res) => {
    try {
        const result = await pool.query(
            `
        SELECT
          m.id,
          m.name,
          m.dosage,
          m.frequency,
          m.instructions,
          m.source,
          m.last_synced_at
        FROM medications AS m
        JOIN users AS u ON u.id = m.user_id
        WHERE u.email = $1
          AND m.source = $2
        ORDER BY m.id
      `,
            ["matt@example.test", "sample"]
        );

        res.json({
            medications: result.rows,
        });
    } catch (error) {
        console.error("Could not retrieve medications:", error);

        res.status(500).json({
            error: "Unable to retrieve medications.",
        });
    }
});

async function startServer() {
    try {
        await pool.query("SELECT 1");
        console.log("Connected to PostgreSQL!");

        // Keep this demo server accessible only from this computer.
        const server = app.listen(port, "127.0.0.1", () => {
            console.log(`EZ Healthcare backend: http://localhost:${port}`);
            console.log(`Health check: http://localhost:${port}/api/health`);
            console.log(
                `Medications: http://localhost:${port}/api/demo/medications`
            );
        });

        server.on("error", (error) => {
            console.error("Could not start backend:", error.message);
            process.exit(1);
        });
    } catch (error) {
        console.error("Could not connect to PostgreSQL:", error);
        await pool.end();
        process.exitCode = 1;
    }
}

startServer();