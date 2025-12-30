const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database Connection
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) console.error('Error connecting to database:', err.message);
    else console.log('Connected to SQLite database.');
});

// Helper for generic queries if needed, or just use db.all/db.get/db.run

// --- AUTH ROUTES ---

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    db.get("SELECT * FROM users WHERE email = ? AND password = ?", [email, password], (err, user) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (user) {
            res.json({ success: true, user });
        } else {
            res.json({ success: false, message: "Invalid credentials" });
        }
    });
});

app.post('/api/register', (req, res) => {
    const { name, email, password, role } = req.body;

    // Check existing
    db.get("SELECT id FROM users WHERE email = ?", [email], (err, row) => {
        if (err) return res.status(500).json({ success: false, message: "Database error" });
        if (row) return res.status(400).json({ success: false, message: "User already exists" });

        // Insert
        const newUser = {
            id: Date.now(),
            name, email, password, role,
            balance: role === 'student' ? 0 : undefined,
            bio: ''
        };

        db.run("INSERT INTO users (id, name, email, password, role, balance, bio) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [newUser.id, name, email, password, role, newUser.balance || 0, newUser.bio],
            function (err) {
                if (err) return res.status(500).json({ success: false, message: "Failed to register" });
                res.json({ success: true, user: newUser });
            }
        );
    });
});

app.put('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const { name, password, email } = req.body;

    // Build update query dynamically is safer, but for now fixed fields
    // If password provided update it, else just name/email/bio
    let query = "UPDATE users SET name = ?";
    let params = [name];

    if (password) {
        query += ", password = ?";
        params.push(password);
    }

    // Always update where ID
    query += " WHERE id = ?";
    params.push(userId);

    db.run(query, params, function (err) {
        if (err) return res.status(500).json({ success: false, message: "Update failed" });

        // Return updated user
        db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
            res.json({ success: true, user });
        });
    });
});

app.post('/api/balance/add', (req, res) => {
    const { userId, amount } = req.body;
    db.run("UPDATE users SET balance = balance + ? WHERE id = ?", [parseFloat(amount), userId], function (err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to add funds" });

        db.get("SELECT balance FROM users WHERE id = ?", [userId], (err, row) => {
            res.json({ success: true, newBalance: row ? row.balance : 0 });
        });
    });
});

// --- ADMIN ROUTES ---

app.get('/api/stats', (req, res) => {
    const stats = {
        uptime: '99.9%'
    };

    // Parallel queries
    db.serialize(() => {
        db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
            if (err) return res.status(500).json({ success: false });
            stats.totalUsers = row.count;

            db.get("SELECT COUNT(*) as count FROM courses", (err, row) => {
                if (err) return res.status(500).json({ success: false });
                stats.totalCourses = row.count;

                // Simple revenue calculation (price * students for all courses)
                db.all("SELECT price, students FROM courses", (err, rows) => {
                    if (err) return res.status(500).json({ success: false });
                    const revenue = rows.reduce((acc, c) => acc + ((c.price || 0) * (c.students || 0)), 0);
                    stats.totalRevenue = revenue;

                    res.json({ success: true, stats });
                });
            });
        });
    });
});

app.get('/api/users', (req, res) => {
    db.all("SELECT id, name, email, role, bio FROM users", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to fetch users" });
        // Add joinedDate mock if not in DB, assuming DB doesn't have it based on register logic
        // The register logic (line 53) doesn't insert a date.
        // We can mock it or leave it empty.
        const users = rows.map(u => ({ ...u, joinedDate: '2023-01-01' }));
        res.json(users);
    });
});

app.delete('/api/users/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM users WHERE id = ?", [id], function (err) {
        if (err) return res.status(500).json({ success: false, message: "Delete failed" });
        res.json({ success: true });
    });
});


app.get('/api/courses', (req, res) => {
    db.all("SELECT * FROM courses", [], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: "Failed to fetch courses" });
        // Parse videos JSON string back to array if needed on frontend,
        // but frontend might expect array.
        const courses = rows.map(c => {
            let videos = [];
            try { videos = c.videos ? JSON.parse(c.videos) : []; } catch (e) { }
            return { ...c, videos };
        });
        res.json(courses);
    });
});

app.get('/api/courses/:id', (req, res) => {
    db.get("SELECT * FROM courses WHERE id = ?", [req.params.id], (err, course) => {
        if (err) return res.status(500).json({ success: false, message: "Error fetching course" });
        if (!course) return res.status(404).json({ success: false, message: "Course not found" });

        try { course.videos = course.videos ? JSON.parse(course.videos) : []; } catch (e) { course.videos = []; }
        res.json({ success: true, course });
    });
});

app.post('/api/courses', (req, res) => {
    const newCourse = {
        id: Date.now(),
        ...req.body,
        status: 'Active',
        students: 0,
        rating: 0
    };
    const videos = JSON.stringify(newCourse.videos || []);

    db.run("INSERT INTO courses (id, code, name, instructor, category, price, rating, students, image, description, videos, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [newCourse.id, newCourse.code || '', newCourse.name, newCourse.instructor, newCourse.category, newCourse.price, newCourse.rating, newCourse.students, newCourse.image, newCourse.description, videos, newCourse.status],
        function (err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Failed to create course" });
            }
            res.json({ success: true, course: newCourse });
        }
    );
});

app.put('/api/courses/:id', (req, res) => {
    const { name, category, price, image, description, videos } = req.body;
    const vids = JSON.stringify(videos || []); // array to string

    db.run("UPDATE courses SET name=?, category=?, price=?, image=?, description=?, videos=? WHERE id=?",
        [name, category, price, image, description, vids, req.params.id],
        function (err) {
            if (err) return res.status(500).json({ success: false, message: "Update failed" });
            res.json({ success: true });
        }
    );
});

app.delete('/api/courses/:id', (req, res) => {
    // Delete course and enrollments?
    db.run("DELETE FROM courses WHERE id = ?", [req.params.id], function (err) {
        if (err) return res.status(500).json({ success: false, message: "Delete failed" });
        if (this.changes === 0) return res.status(404).json({ success: false, message: "Course not found" });
        res.json({ success: true });
    });
});

// --- ENROLLMENT ROUTES ---

app.post('/api/enroll', (req, res) => {
    const { userId, courseId } = req.body;

    // Check validation (User balance, Course existence, Existing enrollment)
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, user) => {
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        db.get("SELECT * FROM courses WHERE id = ?", [courseId], (err, course) => {
            if (!course) return res.status(404).json({ success: false, message: "Course not found" });

            const price = parseFloat(course.price) || 0;
            if (price > 0 && (user.balance || 0) < price) {
                return res.status(400).json({ success: false, message: `Insufficient balance. Costs $${price}.` });
            }

            // Check existing
            db.get("SELECT * FROM enrollments WHERE userId = ? AND courseId = ?", [userId, courseId], (err, existing) => {
                if (existing) return res.status(400).json({ success: false, message: "User already enrolled" });

                // Transaction: Deduct balance, Add enrollment, Incr students
                db.serialize(() => {
                    if (price > 0) {
                        db.run("UPDATE users SET balance = balance - ? WHERE id = ?", [price, userId]);
                    }
                    db.run("INSERT INTO enrollments (userId, courseId, progress, enrollmentDate) VALUES (?, ?, ?, ?)",
                        [userId, courseId, 0, new Date().toISOString()]);

                    db.run("UPDATE courses SET students = students + 1 WHERE id = ?", [courseId]);

                    res.json({ success: true, message: "Enrolled", remainingBalance: user.balance - price });
                });
            });
        });
    });
});

app.put('/api/enrollment/progress', (req, res) => {
    const { userId, courseId, progress } = req.body;
    const prog = Math.min(100, Math.max(0, parseInt(progress)));

    db.run("UPDATE enrollments SET progress = ? WHERE userId = ? AND courseId = ?", [prog, userId, courseId], function (err) {
        if (err || this.changes === 0) return res.status(500).json({ success: false, message: "Update failed or not found" });
        res.json({ success: true, progress: prog });
    });
});

// --- RATING ROUTES ---

app.post('/api/courses/:id/rate', (req, res) => {
    const courseId = req.params.id;
    const { userId, rating } = req.body;
    const ratingVal = parseInt(rating);

    if (!ratingVal || ratingVal < 1 || ratingVal > 5) {
        return res.status(400).json({ success: false, message: "Invalid rating" });
    }

    db.run("INSERT OR REPLACE INTO ratings (userId, courseId, rating) VALUES (?, ?, ?)", [userId, courseId, ratingVal], function (err) {
        if (err) return res.status(500).json({ success: false, message: "Failed to rate" });

        // Recalculate average
        db.get("SELECT AVG(rating) as avgRating FROM ratings WHERE courseId = ?", [courseId], (err, row) => {
            const newAvg = parseFloat((row.avgRating || 0).toFixed(1));
            db.run("UPDATE courses SET rating = ? WHERE id = ?", [newAvg, courseId]);
            res.json({ success: true, newRating: newAvg });
        });
    });
});

// --- INSTRUCTOR ROUTES ---

app.get('/api/instructor/courses', (req, res) => {
    const name = req.query.name;
    db.all("SELECT * FROM courses WHERE instructor = ?", [name], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        // Parse videos json
        const courses = rows.map(c => {
            let videos = [];
            try { videos = c.videos ? JSON.parse(c.videos) : []; } catch (e) { }
            return { ...c, videos };
        });
        res.json(courses);
    });
});

app.get('/api/instructor/students', (req, res) => {
    const instructorName = req.query.name;
    if (!instructorName) return res.status(400).json({ message: "Name required" });

    // Join query to get students of this instructor
    const query = `
        SELECT u.id, u.name, u.email, c.name as courseName, e.progress, e.enrollmentDate
        FROM users u
        JOIN enrollments e ON u.id = e.userId
        JOIN courses c ON e.courseId = c.id
        WHERE c.instructor = ?
    `;

    db.all(query, [instructorName], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        // Group by student to match previous structure if needed, or send flattened
        // Previous structure: array of students, each with array of courses
        // We'll simplistic transform
        const studentsMap = {};
        rows.forEach(row => {
            if (!studentsMap[row.id]) {
                studentsMap[row.id] = { id: row.id, name: row.name, email: row.email, courses: [] };
            }
            studentsMap[row.id].courses.push({ name: row.courseName, progress: row.progress, joinedDate: row.enrollmentDate });
        });

        res.json(Object.values(studentsMap));
    });
});

app.get('/api/instructor/stats', (req, res) => {
    const instructorName = req.query.name;

    // Total students (sum of course students)
    db.all("SELECT * FROM courses WHERE instructor = ?", [instructorName], (err, courses) => {
        if (err) return res.status(500).send();

        const totalStudents = courses.reduce((acc, c) => acc + (c.students || 0), 0);
        const totalEarnings = courses.reduce((acc, c) => acc + ((c.price || 0) * (c.students || 0)), 0);
        const totalRating = courses.reduce((acc, c) => acc + (c.rating || 0), 0);
        const avgRating = courses.length ? (totalRating / courses.length).toFixed(1) : 0;

        res.json({
            totalStudents,
            totalEarnings,
            activeCourses: courses.length,
            rating: avgRating
        });
    });
});

app.get('/api/instructor/transactions', (req, res) => {
    const instructorName = req.query.name;
    const query = `
        SELECT c.name as courseName, c.price as amount, u.name as studentName, e.enrollmentDate as date
        FROM enrollments e
        JOIN courses c ON e.courseId = c.id
        JOIN users u ON e.userId = u.id
        WHERE c.instructor = ?
        ORDER BY e.enrollmentDate DESC
    `;

    db.all(query, [instructorName], (err, rows) => {
        if (err) return res.json([]);
        const transactions = rows.map(r => ({
            date: r.date,
            courseName: r.courseName,
            amount: r.amount || 0,
            studentName: r.studentName,
            status: 'Completed'
        }));
        res.json(transactions);
    });
});

// --- MESSAGING ROUTES ---

app.get('/api/messages', (req, res) => {
    const user = req.query.user;
    db.all("SELECT * FROM messages WHERE from_user = ? OR to_user = ?", [user, user], (err, rows) => {
        rows = rows.map(r => ({ ...r, from: r.from_user, to: r.to_user, read: r.is_read === 1 }));
        res.json(rows || []);
    });
});

app.post('/api/messages', (req, res) => {
    const { from, to, subject, body } = req.body;
    const date = new Date().toISOString();

    db.run("INSERT INTO messages (from_user, to_user, subject, body, date, is_read) VALUES (?, ?, ?, ?, ?, 0)",
        [from, to, subject, body, date],
        function (err) {
            if (err) return res.json({ success: false });
            res.json({ success: true, message: "Sent" });
        }
    );
});

// --- EXISTING ROUTES ---

app.get('/api/my-courses', (req, res) => {
    const userId = req.query.userId;
    // Join courses and enrollments
    const query = `
        SELECT c.*, e.progress 
        FROM courses c
        JOIN enrollments e ON c.id = e.courseId
        WHERE e.userId = ?
    `;
    db.all(query, [userId], (err, rows) => {
        if (err) return res.status(500).json({ success: false });
        const courses = rows.map(c => {
            let videos = [];
            try { videos = c.videos ? JSON.parse(c.videos) : []; } catch (e) { }
            return { ...c, videos, progress: c.progress };
        });
        res.json(courses);
    });
});

// XML Endpoint
app.get('/api/courses.xml', (req, res) => {
    db.all("SELECT id, name, instructor FROM courses", [], (err, rows) => {
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<courses>';
        if (!err && rows) {
            rows.forEach(c => {
                xml += `\n  <course>\n    <id>${c.id}</id>\n    <name>${c.name}</name>\n    <instructor>${c.instructor}</instructor>\n  </course>`;
            });
        }
        xml += '\n</courses>';
        res.set('Content-Type', 'text/xml');
        res.send(xml);
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
