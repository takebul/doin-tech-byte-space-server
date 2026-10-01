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
  }),
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

// 1. GET /api/courses - List courses with optional filters (category, level, search, limit, page, sortBy)
app.get("/api/courses", async (req, res) => {
  try {
    const { category, level, search, limit, page, sortBy } = req.query;
    const filter = {};

    if (category && category !== "Featured" && category !== "All") {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    if (level && level !== "All Level" && level !== "All") {
      filter.level = { $regex: new RegExp(`^${level.trim()}$`, "i") };
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

    let sortObj = { id: 1 };
    if (sortBy === "Highest Rated") {
      sortObj = { rating: -1, id: 1 };
    } else if (sortBy === "Price: Low to High") {
      sortObj = { price: 1, id: 1 };
    } else if (sortBy === "Price: High to Low") {
      sortObj = { price: -1, id: 1 };
    }

    const total = await coursesCollection.countDocuments(filter);
    let query = coursesCollection.find(filter).sort(sortObj);

    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : null;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10) || 6) : null;

    if (pageNum || limitNum) {
      const p = pageNum || 1;
      const l = limitNum || 6;
      const skip = (p - 1) * l;
      const totalPages = Math.ceil(total / l) || 1;
      const courses = await query.skip(skip).limit(l).toArray();

      return res.json({
        success: true,
        count: courses.length,
        total,
        page: p,
        limit: l,
        totalPages,
        courses,
      });
    }

    const courses = await query.toArray();

    res.json({
      success: true,
      count: courses.length,
      total: courses.length,
      page: 1,
      limit: courses.length,
      totalPages: 1,
      courses,
    });
  } catch (error) {
    console.warn(
      "MongoDB query failed, using local courses.json fallback:",
      error.message,
    );
    try {
      const raw = fs.readFileSync(
        path.join(__dirname, "data", "courses.json"),
        "utf8",
      );
      let allCourses = JSON.parse(raw);
      const { category, level, search, limit, page, sortBy } = req.query;

      if (category && category !== "Featured" && category !== "All") {
        allCourses = allCourses.filter(
          (c) =>
            (c.category || "").toLowerCase() === category.trim().toLowerCase(),
        );
      }
      if (level && level !== "All Level" && level !== "All") {
        allCourses = allCourses.filter(
          (c) => (c.level || "").toLowerCase() === level.trim().toLowerCase(),
        );
      }
      if (search && search.trim()) {
        const s = search.trim().toLowerCase();
        allCourses = allCourses.filter(
          (c) =>
            (c.title || "").toLowerCase().includes(s) ||
            (c.author || "").toLowerCase().includes(s) ||
            (c.category || "").toLowerCase().includes(s) ||
            (c.description || "").toLowerCase().includes(s),
        );
      }

      if (sortBy === "Highest Rated") {
        allCourses.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === "Price: Low to High") {
        allCourses.sort((a, b) => (a.price || 0) - (b.price || 0));
      } else if (sortBy === "Price: High to Low") {
        allCourses.sort((a, b) => (b.price || 0) - (a.price || 0));
      } else {
        allCourses.sort((a, b) => (a.id || 0) - (b.id || 0));
      }

      const total = allCourses.length;
      const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : null;
      const limitNum = limit ? Math.max(1, parseInt(limit, 10) || 9) : null;

      if (pageNum || limitNum) {
        const p = pageNum || 1;
        const l = limitNum || 9;
        const skip = (p - 1) * l;
        const totalPages = Math.ceil(total / l) || 1;
        const courses = allCourses.slice(skip, skip + l);
        return res.json({
          success: true,
          count: courses.length,
          total,
          page: p,
          limit: l,
          totalPages,
          courses,
        });
      }

      res.json({
        success: true,
        count: allCourses.length,
        total,
        page: 1,
        limit: allCourses.length,
        totalPages: 1,
        courses: allCourses,
      });
    } catch (fallbackErr) {
      console.error("Fatal fallback error:", fallbackErr);
      res
        .status(500)
        .json({
          success: false,
          message: "Error fetching courses",
          error: error.message,
        });
    }
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
      return res
        .status(404)
        .json({ success: false, message: "Course not found" });
    }

    res.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching course",
        error: error.message,
      });
  }
});

// 3. GET /api/creators - List creators with pagination and filters
app.get("/api/creators", async (req, res) => {
  try {
    const { category, search, limit, page, sortBy } = req.query;
    const filter = {};

    if (category && category !== "Featured" && category !== "All") {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, "i") };
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: searchRegex },
        { subtitle: searchRegex },
        { category: searchRegex },
        { skills: searchRegex },
      ];
    }

    let sortObj = { _id: 1 };
    if (sortBy === "Highest Rated") {
      sortObj = { rating: -1, followerCount: -1 };
    } else if (sortBy === "Most Followers" || sortBy === "Most Popular") {
      sortObj = { followerCount: -1 };
    } else if (sortBy === "Most Products") {
      sortObj = { productsCount: -1 };
    }

    const total = await creatorsCollection.countDocuments(filter);
    let query = creatorsCollection.find(filter).sort(sortObj);

    const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : null;
    const limitNum = limit ? Math.max(1, parseInt(limit, 10) || 6) : null;

    if (pageNum || limitNum) {
      const p = pageNum || 1;
      const l = limitNum || 6;
      const skip = (p - 1) * l;
      const totalPages = Math.ceil(total / l) || 1;
      const creators = await query.skip(skip).limit(l).toArray();

      return res.json({
        success: true,
        count: creators.length,
        total,
        page: p,
        limit: l,
        totalPages,
        creators,
      });
    }

    const creators = await query.toArray();

    res.json({
      success: true,
      count: creators.length,
      total: creators.length,
      page: 1,
      limit: creators.length,
      totalPages: 1,
      creators,
    });
  } catch (error) {
    console.warn(
      "MongoDB creators query failed, using local creators.json fallback:",
      error.message,
    );
    try {
      const raw = fs.readFileSync(
        path.join(__dirname, "data", "creators.json"),
        "utf8",
      );
      let allCreators = JSON.parse(raw);
      const { category, search, limit, page, sortBy } = req.query;

      if (category && category !== "Featured" && category !== "All") {
        allCreators = allCreators.filter(
          (c) =>
            (c.category || "").toLowerCase() === category.trim().toLowerCase(),
        );
      }

      if (search && search.trim()) {
        const s = search.trim().toLowerCase();
        allCreators = allCreators.filter(
          (c) =>
            (c.name || "").toLowerCase().includes(s) ||
            (c.subtitle || "").toLowerCase().includes(s) ||
            (c.category || "").toLowerCase().includes(s) ||
            (Array.isArray(c.skills) &&
              c.skills.some((sk) => sk.toLowerCase().includes(s))),
        );
      }

      if (sortBy === "Highest Rated") {
        allCreators.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === "Most Followers" || sortBy === "Most Popular") {
        allCreators.sort(
          (a, b) => (b.followerCount || 0) - (a.followerCount || 0),
        );
      } else if (sortBy === "Most Products") {
        allCreators.sort(
          (a, b) => (b.productsCount || 0) - (a.productsCount || 0),
        );
      }

      const total = allCreators.length;
      const pageNum = page ? Math.max(1, parseInt(page, 10) || 1) : null;
      const limitNum = limit ? Math.max(1, parseInt(limit, 10) || 6) : null;

      if (pageNum || limitNum) {
        const p = pageNum || 1;
        const l = limitNum || 6;
        const skip = (p - 1) * l;
        const totalPages = Math.ceil(total / l) || 1;
        const creators = allCreators.slice(skip, skip + l);
        return res.json({
          success: true,
          count: creators.length,
          total,
          page: p,
          limit: l,
          totalPages,
          creators,
        });
      }

      res.json({
        success: true,
        count: allCreators.length,
        total,
        page: 1,
        limit: allCreators.length,
        totalPages: 1,
        creators: allCreators,
      });
    } catch (fallbackErr) {
      console.error("Fatal creators fallback error:", fallbackErr);
      res
        .status(500)
        .json({
          success: false,
          message: "Error fetching creators",
          error: error.message,
        });
    }
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
      return res
        .status(404)
        .json({ success: false, message: "Creator not found" });
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
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching creator",
        error: error.message,
      });
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
      fs.readFileSync(path.join(__dirname, "data", "categories.json"), "utf8"),
    );
    res.json({ success: true, categories: defaultCategories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error fetching categories",
        error: error.message,
      });
  }
});

// 6. POST /api/seed - Helper endpoint to re-seed MongoDB database
app.post("/api/seed", async (req, res) => {
  try {
    const coursesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "courses.json"), "utf8"),
    );
    const creatorsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "creators.json"), "utf8"),
    );
    const categoriesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "categories.json"), "utf8"),
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
    res
      .status(500)
      .json({
        success: false,
        message: "Error seeding database",
        error: error.message,
      });
  }
});

app.listen(PORT, () => {
  console.log(`ByteSpace server running on port ${PORT}`);
});
