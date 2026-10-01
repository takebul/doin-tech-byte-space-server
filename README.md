# ByteSpace Server API

<div align="center">

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B%20%7C%20v20%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express 5](https://img.shields.io/badge/Express-5.x-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-47a248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

**High-performance, RESTful API backend for the [ByteSpace](https://byte-space-black.vercel.app) digital learning platform.**  
Engineered with Express.js 5 and MongoDB Atlas, featuring resilient dual-layer data persistence, comprehensive query filtering, enrollment tracking, and automated seeding.

[Live Frontend](https://byte-space-black.vercel.app) • [Client Repo](https://github.com/takebul/doin-tech-byte-space) • [Server Repo](https://github.com/takebul/doin-tech-byte-space-server)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [Architecture & Resilience](#-architecture--resilience)
- [Tech Stack](#-tech-stack)
- [Environment Variables](#-environment-variables)
- [Installation & Setup](#-installation--setup)
- [API Endpoints Documentation](#-api-endpoints-documentation)
  - [Health & Diagnostics](#1-health--diagnostics)
  - [Courses API](#2-courses-api)
  - [Creators API](#3-creators-api)
  - [Categories API](#4-categories-api)
  - [Enrollments API](#5-enrollments-api)
  - [Database Seeder API](#6-database-seeder-api)
- [Folder Structure](#-folder-structure)
- [Database Seeding](#-database-seeding)
- [License & Attribution](#-license--attribution)

---

## 🌟 Overview

The **ByteSpace Server** powers the backend operations for the ByteSpace e-learning ecosystem. It provides robust, secure endpoints for querying courses, managing creator profiles, retrieving taxonomy categories, and managing user course enrollments with real-time persistence and unenrollment handling.

---

## 🚀 Key Features

- **Full Course Lifecycle API**: Search across titles, instructors, and descriptions; filter by category and difficulty level; sort by price and ratings; and paginate dynamically.
- **Creator & Instructor Directory**: Profiles with stats (ratings, student counts, follower numbers, active course catalogs) and attributed course lookups.
- **User Enrollment Management**: Enroll users in courses, prevent duplicate enrollments, query personalized enrollment history, and unenroll/delete enrollments.
- **Dual-Layer Persistence & Offline Fallback**: Primary operations read and write to **MongoDB Atlas**. If MongoDB is temporarily unreachable or undergoing maintenance, handlers seamlessly fall back to synchronized local JSON storage (`data/`), ensuring zero downtime.
- **CORS Configured**: Built-in support for multiple origins, credentials, and local/production frontend environments.
- **Automated Database Seeder**: One-command pipeline (`seed.js` or `POST /api/seed`) to reset and populate authentic course, creator, and category datasets.

---

## 🛡️ Architecture & Resilience

```
                     ┌─────────────────────────────┐
                     │     Next.js 16 Frontend     │
                     └──────────────┬──────────────┘
                                    │ HTTP / REST (CORS)
                                    ▼
                     ┌─────────────────────────────┐
                     │    Express 5 Server (:5000) │
                     └──────┬───────────────┬──────┘
                            │               │
               (Primary)    │               │  (Fallback)
                            ▼               ▼
                   ┌────────────────┐ ┌─────────────────┐
                   │ MongoDB Atlas  │ │ Local JSON Data │
                   │  - courses     │ │ - courses.json  │
                   │  - creators    │ │ - creators.json │
                   │  - categories  │ │ - categories.js │
                   │  - enrollments │ │ - enrollments.js│
                   └────────────────┘ └─────────────────┘
```

When MongoDB queries succeed, changes are persisted immediately. If a database connection error occurs, the server gracefully switches to local file system fallbacks in `./data/`, preserving read and write capabilities.

---

## 💻 Tech Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v18.18+ or v20+)
- **Framework**: [Express.js 5](https://expressjs.com/)
- **Database**: [MongoDB Atlas](https://www.mongodb.com/atlas) (native `mongodb` v7 driver)
- **Security & Utilities**:
  - `cors`: Cross-Origin Resource Sharing with credentials support
  - `dotenv`: Environment variable management
  - Native Node.js `fs` & `path` modules for fallback data synchronization

---

## ⚙️ Environment Variables

Create a `.env` file in the root of `byte-space-server` based on `.env.example`:

```env
# Server Port
PORT=5000

# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/?retryWrites=true&w=majority

# Target Database Name
DB_NAME=byte-space

# Allowed Frontend Origins (comma-separated or single)
CLIENT_URL=http://localhost:3000
CLIENT_ORIGIN=http://localhost:3000
```

---

## 🛠️ Installation & Setup

### 1. Clone & Navigate
```bash
git clone https://github.com/takebul/doin-tech-byte-space-server.git
cd doin-tech-byte-space-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure `.env`
```bash
cp .env.example .env
# Edit .env with your MongoDB Atlas connection URI
```

### 4. Seed the Database
Populate courses, instructors, and categories into MongoDB Atlas:
```bash
node seed.js
```

### 5. Start the Server
```bash
# Development mode (with file watching)
npm run dev

# Production mode
npm start
```
Server will be listening on `http://localhost:5000`.

---

## 📖 API Endpoints Documentation

### 1. Health & Diagnostics

#### `GET /`
Returns the operational status, current database name, and available endpoints.

- **Response `(200 OK)`**:
```json
{
  "status": "ok",
  "message": "ByteSpace server is running fine!",
  "database": "byte-space",
  "endpoints": [
    "/api/courses",
    "/api/courses/:id",
    "/api/creators",
    "/api/creators/:id",
    "/api/categories",
    "/api/enrollments",
    "/api/seed"
  ]
}
```

---

### 2. Courses API

#### `GET /api/courses`
Retrieve courses with optional multi-attribute filtering, sorting, and pagination.

- **Query Parameters**:
  | Parameter | Type | Description | Default |
  |---|---|---|---|
  | `search` | string | Keyword search matching title, instructor, category, or description | — |
  | `category` | string | Filter by category name (e.g. `UI/UX Design`, `Web Development`) | `All` |
  | `level` | string | Difficulty level (`Beginner`, `Intermediate`, `Advanced`) | `All` |
  | `sortBy` | string | `Highest Rated`, `Price: Low to High`, `Price: High to Low` | Default ID |
  | `page` | integer | Active page number | `1` |
  | `limit` | integer | Items per page | `6` |

- **Sample Request**:
  ```http
  GET /api/courses?category=UI%2FUX%20Design&level=Beginner&page=1&limit=6&sortBy=Highest%20Rated
  ```

- **Sample Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "count": 6,
    "total": 18,
    "page": 1,
    "limit": 6,
    "totalPages": 3,
    "courses": [
      {
        "id": 1,
        "title": "Learn Figma from Basic",
        "slug": "learn-figma-from-basic",
        "author": "purepearl studio",
        "category": "UI/UX Design",
        "level": "Beginner",
        "rating": 4.5,
        "price": 25,
        "badge": "Popular",
        "image": "/course-1.png",
        "lessonsCount": 24,
        "duration": "14h 30m"
      }
    ]
  }
  ```

#### `GET /api/courses/:id`
Retrieve detailed course information by numeric ID, slug, or MongoDB `ObjectId`.

- **Parameters**:
  - `id`: Numeric ID (e.g. `1`), slug string (e.g. `learn-figma-from-basic`), or 24-character hex `ObjectId`.

- **Sample Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "course": {
      "id": 1,
      "title": "Learn Figma from Basic",
      "slug": "learn-figma-from-basic",
      "author": "purepearl studio",
      "curriculum": [...],
      "learningOutcomes": [...],
      "reviews": [...]
    }
  }
  ```

- **Error Response `(404 Not Found)`**:
  ```json
  { "success": false, "message": "Course not found" }
  ```

---

### 3. Creators API

#### `GET /api/creators`
Retrieve creator and instructor profiles with filtering, sorting, and pagination.

- **Query Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `search` | string | Keyword search matching name, subtitle, category, or skills |
  | `category` | string | Filter by creator topic |
  | `sortBy` | string | `Highest Rated`, `Most Followers`, `Most Popular`, `Most Products` |
  | `page` | integer | Page number |
  | `limit` | integer | Number of creators per page (e.g. `6`) |

#### `GET /api/creators/:id`
Fetch a specific creator profile along with all courses created by that instructor.

- **Sample Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "creator": {
      "id": "purepearl-studio",
      "name": "Purepearl Studio",
      "category": "Design & UI/UX",
      "rating": 4.9,
      "followerCount": 28400,
      "productsCount": 12
    },
    "courses": [...]
  }
  ```

---

### 4. Categories API

#### `GET /api/categories`
Retrieve the categorization matrix, featuring icons, topic titles, and metadata tags used for catalog navigation.

---

### 5. Enrollments API

#### `POST /api/enrollments`
Enroll an authenticated user into a specific course. Automatically handles duplicate detection and persists to MongoDB with JSON fallback.

- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "userEmail": "student@example.com",
    "userId": "usr_12345",
    "userName": "Jane Doe",
    "courseId": 1,
    "courseTitle": "Learn Figma from Basic",
    "courseSlug": "learn-figma-from-basic",
    "courseImage": "/course-1.png",
    "courseAuthor": "purepearl studio",
    "coursePrice": 25,
    "category": "UI/UX Design"
  }
  ```

- **Success Response (New Enrollment) `(201 Created)`**:
  ```json
  {
    "success": true,
    "alreadyEnrolled": false,
    "message": "Enrolled in course successfully!",
    "enrollment": {
      "id": "enr_1727829910_a1b2c",
      "userId": "usr_12345",
      "userEmail": "student@example.com",
      "userName": "Jane Doe",
      "courseId": 1,
      "courseTitle": "Learn Figma from Basic",
      "progress": 0,
      "status": "In Progress",
      "enrolledAt": "2026-10-01T22:45:10.000Z"
    }
  }
  ```

- **Already Enrolled Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "alreadyEnrolled": true,
    "message": "You are already enrolled in this course.",
    "enrollment": { ... }
  }
  ```

#### `GET /api/enrollments`
Fetch all enrolled courses for a specific user, sorted newest first.

- **Query Parameters**:
  | Parameter | Type | Required | Description |
  |---|---|---|---|
  | `userEmail` | string | Recommended | User's normalized email address |
  | `userId` | string | Optional | User's internal ID |

- **Sample Request**:
  ```http
  GET /api/enrollments?userEmail=student@example.com
  ```

- **Sample Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "count": 2,
    "enrollments": [
      {
        "id": "enr_1727829910_a1b2c",
        "courseId": 1,
        "courseTitle": "Learn Figma from Basic",
        "courseImage": "/course-1.png",
        "progress": 0,
        "status": "In Progress",
        "enrolledAt": "2026-10-01T22:45:10.000Z"
      }
    ]
  }
  ```

#### `DELETE /api/enrollments/:id`
Remove an enrollment (unenroll from a course). Supports matching by enrollment unique ID (`enr_...`), MongoDB `ObjectId`, or course numeric ID, with user verification.

- **Query Parameters**:
  | Parameter | Type | Description |
  |---|---|---|
  | `userEmail` | string | Verifies that the deleting user owns the enrollment |
  | `userId` | string | Secondary user identity check |
  | `courseId` | string/number | Optional course ID fallback |

- **Sample Request**:
  ```http
  DELETE /api/enrollments/enr_1727829910_a1b2c?userEmail=student@example.com
  ```

- **Sample Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "message": "Enrolled course removed successfully.",
    "deletedCount": 1
  }
  ```

---

### 6. Database Seeder API

#### `POST /api/seed`
Programmatically reset and re-seed the MongoDB database using the seed documents in `./data/`.

- **Sample Response `(200 OK)`**:
  ```json
  {
    "success": true,
    "message": "Database seeded successfully!",
    "coursesCount": 18,
    "creatorsCount": 8
  }
  ```

---

## 📁 Folder Structure

```
byte-space-server/
├── data/
│   ├── categories.json      # Category matrix & taxonomies
│   ├── courses.json         # 18 comprehensive courses with modules & reviews
│   ├── creators.json        # Creator profiles, bios, metrics & skills
│   └── enrollments.json     # Synced local enrollment store
├── index.js                 # Express application & route handlers
├── seed.js                  # Standalone MongoDB Atlas seeder script
├── .env.example             # Environment configuration template
├── package.json             # Dependencies and scripts
└── README.md                # Server documentation
```

---

## 💾 Database Seeding

To seed your MongoDB Atlas database with the complete dataset:

```bash
# Standalone CLI seeder
node seed.js

# Or trigger via REST endpoint
curl -X POST http://localhost:5000/api/seed
```

The seeder initializes:
- `18` Courses across 8 categories with syllabus modules and reviews
- `8` Creator profiles with follower statistics and skill tags
- Topic category taxonomy documents

---

## 📄 License & Attribution

Part of the **ByteSpace** digital learning platform assessment project.  
Designed for reliability, high performance, and zero-downtime operation.
