const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.db');
const jsonPath = path.resolve(__dirname, 'database.json');

// Initialize DB
const db = new sqlite3.Database(dbPath);

console.log('Migrating data from JSON to SQLite...');

db.serialize(() => {
    // 1. Create Tables
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT,
        password TEXT,
        role TEXT,
        balance REAL DEFAULT 0,
        bio TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY,
        code TEXT,
        name TEXT,
        instructor TEXT,
        category TEXT,
        price REAL,
        rating REAL,
        students INTEGER,
        image TEXT,
        description TEXT,
        videos TEXT,
        status TEXT DEFAULT 'Active'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS enrollments (
        userId INTEGER,
        courseId INTEGER,
        progress INTEGER,
        enrollmentDate TEXT,
        PRIMARY KEY (userId, courseId)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY,
        from_user TEXT,
        to_user TEXT,
        subject TEXT,
        body TEXT,
        date TEXT,
        is_read INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS ratings (
        userId INTEGER,
        courseId INTEGER,
        rating INTEGER,
        PRIMARY KEY (userId, courseId)
    )`);

    // 2. Read JSON Data
    if (fs.existsSync(jsonPath)) {
        const rawData = fs.readFileSync(jsonPath);
        const jsonData = JSON.parse(rawData);

        // 3. Insert Data
        const insertUser = db.prepare("INSERT OR REPLACE INTO users (id, name, email, password, role, balance, bio) VALUES (?, ?, ?, ?, ?, ?, ?)");
        jsonData.users.forEach(u => {
            insertUser.run(u.id, u.name, u.email, u.password, u.role, u.balance || 0, u.bio || '');
        });
        insertUser.finalize();

        const insertCourse = db.prepare("INSERT OR REPLACE INTO courses (id, code, name, instructor, category, price, rating, students, image, description, videos, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        jsonData.courses.forEach(c => {
            const videos = c.videos ? JSON.stringify(c.videos) : '[]';
            const status = c.status || 'Active';
            insertCourse.run(c.id, c.code || '', c.name, c.instructor, c.category, c.price, c.rating, c.students, c.image, c.description, videos, status);
        });
        insertCourse.finalize();

        const insertEnrollment = db.prepare("INSERT OR REPLACE INTO enrollments (userId, courseId, progress, enrollmentDate) VALUES (?, ?, ?, ?)");
        jsonData.enrollments.forEach(e => {
            insertEnrollment.run(e.userId, e.courseId, e.progress, e.enrollmentDate);
        });
        insertEnrollment.finalize();

        if (jsonData.messages) {
            const insertMessage = db.prepare("INSERT OR REPLACE INTO messages (id, from_user, to_user, subject, body, date, is_read) VALUES (?, ?, ?, ?, ?, ?, ?)");
            jsonData.messages.forEach(m => {
                insertMessage.run(m.id, m.from, m.to, m.subject, m.body, m.date, m.read ? 1 : 0);
            });
            insertMessage.finalize();
        }

        if (jsonData.ratings) {
            const insertRating = db.prepare("INSERT OR REPLACE INTO ratings (userId, courseId, rating) VALUES (?, ?, ?)");
            jsonData.ratings.forEach(r => {
                insertRating.run(r.userId, r.courseId, r.rating);
            });
            insertRating.finalize();
        }

        console.log('Migration completed successfully.');
    } else {
        console.log('No JSON database found to migrate.');
    }
});

db.close();
