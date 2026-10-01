const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

dotenv.config();

const uri = process.env.MONGODB_URI;
const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration to allow requests from Next.js frontend
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in development
    },
    credentials: true,
  })
);

app.use(express.json());

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const db = client.db(process.env.DB_NAME || "byte-space");
const usersCollection = db.collection("user");
const coursesCollection = db.collection("courses");
const creatorsCollection = db.collection("creators");
const categoriesCollection = db.collection("categories");

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "ByteSpace server is running fine!",
    database: process.env.DB_NAME || "byte-space",
    endpoints: [
      "/api/courses",
      "/api/courses/:id",
      "/api/creators",
      "/api/creators/:id",
      "/api/categories",
      "/api/seed",
    ],
  });
});

// 1. GET /api/courses - List courses with optional filters (category, level, search, limit)
app.get("/api/courses", async (req, res) => {
  try {
    const { category, level, search, limit } = req.query;
    const filter = {};

    if (category && category !== "Featured" && category !== "All") {
      filter.category = category;
    }

    if (level && level !== "All Level" && level !== "All") {
      filter.level = level;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { title: searchRegex },
        { author: searchRegex },
        { category: searchRegex },
        { description: searchRegex },
      ];
    }

    let query = coursesCollection.find(filter).sort({ id: 1 });

    if (limit && !isNaN(parseInt(limit, 10))) {
      query = query.limit(parseInt(limit, 10));
    }

    const courses = await query.toArray();

    res.json({
      success: true,
      count: courses.length,
      courses,
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    res.status(500).json({ success: false, message: "Error fetching courses", error: error.message });
  }
});

// 2. GET /api/courses/:id - Single course by numeric ID, slug, or MongoDB ObjectId
app.get("/api/courses/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const conditions = [];

    // Try numeric id
    const numId = Number(id);
    if (!isNaN(numId)) {
      conditions.push({ id: numId });
    }

    // Try string id or slug
    conditions.push({ id: id });
    conditions.push({ slug: id });

    // Try MongoDB ObjectId if valid format
    if (ObjectId.isValid(id)) {
      conditions.push({ _id: new ObjectId(id) });
    }

    const course = await coursesCollection.findOne({ $or: conditions });

    if (!course) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }

    res.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    res.status(500).json({ success: false, message: "Error fetching course", error: error.message });
  }
});

// 3. GET /api/creators - List creators
app.get("/api/creators", async (req, res) => {
  try {
    const creators = await creatorsCollection.find({}).toArray();
    res.json({
      success: true,
      count: creators.length,
      creators,
    });
  } catch (error) {
    console.error("Error fetching creators:", error);
    res.status(500).json({ success: false, message: "Error fetching creators", error: error.message });
  }
});

// 4. GET /api/creators/:id - Single creator with their courses
app.get("/api/creators/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const conditions = [{ id: id }, { slug: id }];

    if (ObjectId.isValid(id)) {
      conditions.push({ _id: new ObjectId(id) });
    }

    const creator = await creatorsCollection.findOne({ $or: conditions });

    if (!creator) {
      return res.status(404).json({ success: false, message: "Creator not found" });
    }

    // Fetch creator's courses
    const courses = await coursesCollection
      .find({
        $or: [{ authorId: creator.id }, { authorId: creator.slug }],
      })
      .toArray();

    res.json({
      success: true,
      creator,
      courses,
    });
  } catch (error) {
    console.error("Error fetching creator:", error);
    res.status(500).json({ success: false, message: "Error fetching creator", error: error.message });
  }
});

// 5. GET /api/categories - Categories matrix
app.get("/api/categories", async (req, res) => {
  try {
    const categoryDoc = await categoriesCollection.findOne({});
    if (categoryDoc) {
      return res.json({ success: true, categories: categoryDoc });
    }

    // Fallback to reading categories.json directly
    const defaultCategories = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "categories.json"), "utf8")
    );
    res.json({ success: true, categories: defaultCategories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({ success: false, message: "Error fetching categories", error: error.message });
  }
});

// 6. POST /api/seed - Helper endpoint to re-seed MongoDB database
app.post("/api/seed", async (req, res) => {
  try {
    const coursesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "courses.json"), "utf8")
    );
    const creatorsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "creators.json"), "utf8")
    );
    const categoriesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "categories.json"), "utf8")
    );

    await coursesCollection.deleteMany({});
    const coursesResult = await coursesCollection.insertMany(coursesData);

    await creatorsCollection.deleteMany({});
    const creatorsResult = await creatorsCollection.insertMany(creatorsData);

    await categoriesCollection.deleteMany({});
    await categoriesCollection.insertOne(categoriesData);

    res.json({
      success: true,
      message: "Database seeded successfully!",
      coursesCount: coursesResult.insertedCount,
      creatorsCount: creatorsResult.insertedCount,
    });
  } catch (error) {
    console.error("Error seeding database:", error);
    res.status(500).json({ success: false, message: "Error seeding database", error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`ByteSpace server running on port ${PORT}`);
});
