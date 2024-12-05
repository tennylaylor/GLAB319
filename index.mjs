import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import db from "./db/conn.mjs";

dotenv.config();

const PORT = 5050;
const app = express();

import grades from "./routes/grades.mjs";
import grades_agg from "./routes/grades_agg.mjs";
//middleware
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to the API.");
});

app.use("/grades", grades);
app.use("/grades-agg", grades_agg);

// Global error handling
app.use((err, _req, res, next) => {
  res.status(500).send("Seems like we messed up somewhere...");
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
