require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const mongoose = require("mongoose");
const { connectDB } = require("./db");
const conversationsRouter = require("./routes/conversations");
const usersRouter = require("./routes/users");

const DEFAULT_PORT = 3000;
const PORT = parseInt(process.env.PORT, 10) || DEFAULT_PORT;

async function main() {
  try {
    await connectDB();
    console.log("Database connected.");

    const app = express();
    app.use(cors());
    app.use(morgan("dev"));
    app.use(express.json({ limit: "1mb" }));

    app.get("/", (req, res) => res.json({ ok: true, service: "bot-gpt" }));

    app.use("/conversations", conversationsRouter);

    app.use("/users", usersRouter);

    // Centralized error handler (must have 4 args)
    app.use((err, req, res, next) => {
      console.error("ERROR HANDLER:", err && err.stack ? err.stack : err);
      res.status(err && err.status ? err.status : 500).json({
        error: err && err.message ? err.message : "Internal Server Error",
      });
    });

    const server = app.listen(PORT, () => {
      console.log(`Server listening on ${PORT}`);
    });
  } catch (err) {
    console.error("Fatal start error:", err && err.stack ? err.stack : err);
    process.exit(1);
  }
}

main();
