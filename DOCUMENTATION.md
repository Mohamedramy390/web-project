# LearnSpace Project Documentation

## 1. Project Overview
LearnSpace is a web-based educational platform designed to manage courses, students, and instructors. It provides a comprehensive dashboard for tracking progress, viewing announcements, and managing account details.

## 2. Stakeholders
- **Admin**: Manages the platform, users, and courses.
- **Instructor**: Creates and manages courses, views student progress.
- **Student**: Enrolls in courses, tracks progress, views announcements.

## 3. Requirements

### Functional Requirements
- **Authentication**: Users must be able to Login and Register (Client & Server Validation).
- **Dashboard**: Personalized view for students with course progress.
- **Course Management**: Ability to view list of courses (AJAX JSON).
- **Announcements**: System to broadcast messages (AJAX XML).
- **Responsive Design**: UI must adapt to mobile and desktop screens.

### Non-Functional Requirements
- **Compatibility**: Valid XHTML syntax, Cross-browser support.
- **Performance**: Fast loading resources using external CSS/JS.
- **Security**: Basic validation to prevent invalid data entry.
- **Maintainability**: Modular code (Separation of HTML, CSS, JS).

## 4. Technical Implementation
- **Frontend**: XHTML, CSS (Float + Flexbox/Grid), JavaScript (jQuery), AJAX.
- **Backend**: Node.js (Express), JSON-based Database (Simple Flat File).
- **Data Exchange**: JSON (Core API), XML (Announcements).

## 5. System Architecture
- **Client**: Browser sends AJAX requests to Node.js server.
- **Server**: Express app handles routes `/api/login`, `/api/courses` and serves static files.
- **Database**: `database.json` stores user and course data.

## 6. Diagrams

### Use Case Diagram (Textual)
- **Actor: Student**
  - Use Case: Login
  - Use Case: View Dashboard
  - Use Case: resume Course
  - Use Case: View Announcements

### Class Diagram (UML Concept)
```
+---------------+        +---------------+
|     User      |        |    Course     |
+---------------+        +---------------+
| - id: int     |        | - id: int     |
| - name: string|        | - code: string|
| - role: string|        | - name: string|
+---------------+        +---------------+
       ^                        ^
       |                        |
+---------------+               |
|   Student     |---------------+
+---------------+
```

## 7. How to Run
1. Ensure Node.js is installed.
2. Run `npm install` to install dependencies.
3. Run `npm start` or `node server.js` to start the server.
4. Open `http://localhost:3000` in your browser.
