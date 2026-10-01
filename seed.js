const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "byte-space";

if (!uri) {
  console.error("MONGODB_URI is not defined in .env!");
  process.exit(1);
}

async function seed() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`Connected to MongoDB database: "${dbName}"`);
    const db = client.db(dbName);

    // Read JSON seed files
    const coursesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "courses.json"), "utf8")
    );
    const creatorsData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "creators.json"), "utf8")
    );
    const categoriesData = JSON.parse(
      fs.readFileSync(path.join(__dirname, "data", "categories.json"), "utf8")
    );

    // 1. Seed courses
    const coursesCol = db.collection("courses");
    await coursesCol.deleteMany({});
    const coursesResult = await coursesCol.insertMany(coursesData);
    console.log(`Seeded ${coursesResult.insertedCount} courses into "courses" collection.`);

    // 2. Seed creators
    const creatorsCol = db.collection("creators");
    await creatorsCol.deleteMany({});
    const creatorsResult = await creatorsCol.insertMany(creatorsData);
    console.log(`Seeded ${creatorsResult.insertedCount} creators into "creators" collection.`);

    // 3. Seed categories
    const categoriesCol = db.collection("categories");
    await categoriesCol.deleteMany({});
    await categoriesCol.insertOne(categoriesData);
    console.log(`Seeded categories into "categories" collection.`);

    console.log("Seeding completed successfully!");
  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

seed();
