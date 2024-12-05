import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */

// Get the weighted average of a specified learner's grades, per class
router.get("/learner/:id/avg-class", async (req, res) => {
  let collection = await db.collection("grades");

  let result = await collection
    .aggregate([
      {
        $match: { learner_id: Number(req.params.id) },
      },
      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$class_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          class_id: "$_id",
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
    ])
    .toArray();
  if (!result) res.status(404).send("Not found");
  else res.status(200).send(result);
});
// Aggregate statistics for all learners
router.get("/stats", async (req, res) => {
  try {
    const collection = await db.collection("grades");
    const stats = await collection
      .aggregate([
        {
          $project: {
            learner_id: 1,
            class_id: 1,
            weightedAverage: { $avg: "$scores.score" },
          },
        },
        {
          $group: {
            _id: null,
            totalLearners: { $sum: 1 },
            above70Count: {
              $sum: { $cond: [{ $gt: ["$weightedAverage", 70] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            _id: 0,
            totalLearners: 1,
            above70Count: 1,
            above70Percentage: {
              $multiply: [
                { $divide: ["$above70Count", "$totalLearners"] },
                100,
              ],
            },
          },
        },
      ])
      .toArray();
    res.status(200).send(stats[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Failed to calculate statistics" });
  }
});
//Part 2 GET /grades-agg/stats/:id
/* 
  Create a GET route at /grades/stats/:id
  Within this route, mimic the above aggregation pipeline, 
  but only for learners within a class that has a class_id equal to the specified :id.
  */
router.get("/stats/:id", async (req, res) => {
  const classId = Number(req.params.id); // Convert class_id to number
  if (isNaN(classId)) {
    return res.status(400).send({ error: "Invalid class ID format" });
  }
  try {
    const stats = await db
      .collection("grades")
      .aggregate([
        { $match: { class_id: classId } }, // Filter by class_id
        {
          $project: {
            learner_id: 1,
            class_id: 1,
            weightedAverage: { $avg: "$scores.score" },
          },
        },
        {
          $group: {
            _id: null,
            totalLearners: { $sum: 1 },
            above70Count: {
              $sum: { $cond: [{ $gt: ["$weightedAverage", 70] }, 1, 0] },
            },
          },
        },
        {
          $project: {
            totalLearners: 1,
            above70Count: 1,
            above70Percentage: {
              $multiply: [
                { $divide: ["$above70Count", "$totalLearners"] },
                100,
              ],
            },
          },
        },
      ])
      .toArray();
    if (!stats.length) {
      return res.status(404).send({ error: "No data found for this class" });
    }
    res.status(200).send(stats[0]);
  } catch (error) {
    console.error("Failed to calculate class stats:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});
//Part 2.A
//http://localhost:5050/grades-agg/create-indexes
//Create a single-field index on class_id.
router.post(`/create-indexes`, async (req, res) => {
  try {
    const collection = await db.collection(`grades`);
    //Create single-field index on class_id
    await collection.createIndex({ class_id: 1 });
    //Create single-field index on learner_id
    await collection.createIndex({ learner_id: 1 });
    //Create single-field index on learner_id and class_id
    await collection.createIndex({ learner_id: 1, class_id: 1 });
    res.status(200).send({ message: `Indexes created successfully` });
  } catch (error) {
    console.error(`Error creating indexes`, error);
    res.status(500).send({ error: `Failed to create indexes` });
  }
});

export default router;
