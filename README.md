# ByteSpace Server API

RESTful API backend for the **ByteSpace** online learning platform, built with Node.js, Express, and MongoDB Atlas.

## Features
- **Courses API**: Dynamic filtering by category, search queries, pagination, and detail lookups.
- **Creators API**: Creator profiles, statistics, and course attributions.
- **Categories API**: Categorization taxonomy for catalog exploration.
- **Automated Seeding Pipeline**: Fully populated database seeder with authentic courses, lessons, curriculum modules, and student reviews.

## Setup & Running

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `.env` (refer to `.env.example`):
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   DB_NAME=byte-space
   CLIENT_ORIGIN=http://localhost:3000
   ```

3. Seed database:
   ```bash
   node seed.js
   ```

4. Start development server:
   ```bash
   npm run dev
   ```
