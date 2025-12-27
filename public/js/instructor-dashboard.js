$(document).ready(function () {
    // 1. Check User Login Status & Role
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userJson);

    // Redirect if not instructor (basic protection)
    if (user.role !== 'instructor' && user.role !== 'admin') {
        alert('Access Denied. Instructor account required.');
        window.location.href = 'dashboard.html';
        return;
    }

    // Populate Sidebar/Header
    $('.user-name-display').text(user.name);
    $('.user-avatar-display').attr('src', 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=random');

    const API_BASE = 'http://localhost:3000/api';

    // 2. Fetch Stats
    $.ajax({
        url: `${API_BASE}/instructor/stats?name=${encodeURIComponent(user.name)}`,
        method: 'GET',
        success: function (stats) {
            $('#stat-total-students').text(stats.totalStudents.toLocaleString());
            $('#stat-total-earnings').text('$' + stats.totalEarnings.toLocaleString());
            $('#stat-active-courses').text(stats.activeCourses);
            $('#stat-rating').text(stats.rating);

            // Also update "Earnings" section stats
            $('#earn-this-month').text('$' + (stats.totalEarnings * 0.1).toFixed(2)); // Mock monthly
            $('#earn-lifetime').text('$' + stats.totalEarnings.toLocaleString());
        },
        error: function (err) {
            console.error('Failed to fetch stats', err);
        }
    });

    // Global variables
    let allCourses = [];

    // 3. Fetch My Courses
    refreshCourses();

    function refreshCourses() {
        $.ajax({
            url: `${API_BASE}/instructor/courses?name=${encodeURIComponent(user.name)}`,
            method: 'GET',
            success: function (courses) {
                allCourses = courses;
                renderCoursesTable(courses);
                refreshStats(); // Update stats when courses change
            }
        });
    }

    function refreshStats() {
        $.ajax({
            url: `${API_BASE}/instructor/stats?name=${encodeURIComponent(user.name)}`,
            method: 'GET',
            success: function (stats) {
                $('#stat-total-students').text(stats.totalStudents.toLocaleString());
                $('#stat-total-earnings').text('$' + stats.totalEarnings.toLocaleString());
                $('#stat-active-courses').text(stats.activeCourses);
                $('#stat-rating').text(stats.rating);
                $('#earn-this-month').text('$' + (stats.totalEarnings * 0.1).toFixed(2));
                $('#earn-lifetime').text('$' + stats.totalEarnings.toLocaleString());
            }
        });
    }

    // --- Course Management (Add/Edit) ---

    // Open Modal for Create
    $(document).on('click', '.create-course-btn', function (e) {
        e.preventDefault();
        $('#modal-title').text('Create New Course');
        $('#course-form')[0].reset();
        $('#course-id').val('');
        $('#course-modal').fadeIn().css('display', 'flex');
    });

    // Open Modal for Edit
    $(document).on('click', '.edit-course-btn', function (e) {
        e.preventDefault();
        const courseId = $(this).data('id');
        const course = allCourses.find(c => c.id == courseId);

        if (course) {
            $('#modal-title').text('Edit Course');
            $('#course-id').val(course.id);
            $('#course-name').val(course.name);
            $('#course-category').val(course.category);
            $('#course-price').val(course.price);
            $('#course-image').val(course.image);
            $('#course-description').val(course.description || '');
            $('#course-videos').val(course.videos ? course.videos.join('\n') : '');
            $('#course-modal').fadeIn().css('display', 'flex');
        }
    });

    // Handle Form Submit
    $('#course-form').on('submit', function (e) {
        e.preventDefault();
        const courseId = $('#course-id').val();
        const isEdit = !!courseId;

        const courseData = {
            name: $('#course-name').val(),
            category: $('#course-category').val(),
            price: parseFloat($('#course-price').val()),
            image: $('#course-image').val(),
            description: $('#course-description').val(),
            instructor: user.name, // Ensure instructor is set
            videos: $('#course-videos').val()
                .split('\n')
                .map(v => v.trim())
                .filter(v => v.length > 0) // Parse video URLs from textarea
        };

        const url = isEdit ? `${API_BASE}/courses/${courseId}` : `${API_BASE}/courses`;
        const method = isEdit ? 'PUT' : 'POST';

        $.ajax({
            url: url,
            method: method,
            contentType: 'application/json',
            data: JSON.stringify(courseData),
            success: function (res) {
                $('#course-modal').fadeOut();
                alert(isEdit ? 'Course updated successfully!' : 'Course created successfully!');
                refreshCourses();
            },
            error: function (err) {
                alert('Failed to save course. Please try again.');
                console.error(err);
            }
        });
    });

    // --- Course Management (Delete) ---

    // Handle Delete Course
    $(document).on('click', '.delete-course-btn', function (e) {
        e.preventDefault();
        const courseId = $(this).data('id');

        if (confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
            $.ajax({
                url: `${API_BASE}/courses/${courseId}`,
                method: 'DELETE',
                success: function (res) {
                    alert('Course deleted successfully!');
                    refreshCourses();
                },
                error: function (err) {
                    console.error(err);
                    alert('Failed to delete course.');
                }
            });
        }
    });

    // 4. Fetch Students
    $.ajax({
        url: `${API_BASE}/instructor/students?name=${encodeURIComponent(user.name)}`,
        method: 'GET',
        success: function (students) {
            renderStudentsTable(students);
        }
    });

    // 5. Fetch Transactions (New)
    refreshTransactions();

    function refreshTransactions() {
        $.ajax({
            url: `${API_BASE}/instructor/transactions?name=${encodeURIComponent(user.name)}`,
            method: 'GET',
            success: function (transactions) {
                renderTransactionsTable(transactions);
            }
        });
    }

    function renderTransactionsTable(transactions) {
        const tbody = $('#earnings table tbody');
        tbody.empty();

        if (transactions.length === 0) {
            tbody.html('<tr><td colspan="4" class="text-center">No recent transactions.</td></tr>');
            return;
        }

        transactions.forEach(t => {
            const row = `
                <tr>
                    <td>${new Date(t.date).toLocaleDateString()}</td>
                    <td>${t.courseName} <span style="font-size: 0.8rem; color: #64748b;">(Student: ${t.studentName})</span></td>
                    <td>$${t.amount.toFixed(2)}</td>
                    <td><span style="color: green;">${t.status}</span></td>
                </tr>
            `;
            tbody.append(row);
        });
    }

    // 6. Messaging Logic (New)

    // Fetch My Messages
    refreshMessages();

    function refreshMessages() {
        $.ajax({
            url: `${API_BASE}/messages?user=${encodeURIComponent(user.name)}`,
            method: 'GET',
            success: function (messages) {
                renderMessages(messages);
            },
            error: function () {
                $('#messages-container').html(`
                    <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                        <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e1;"></i>
                        <p>Failed to load messages.</p>
                    </div>
                `);
            }
        });
    }

    function renderMessages(messages) {
        const container = $('#messages-container');
        container.empty();

        if (messages.length === 0) {
            container.html(`
                <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                    <i class="fas fa-inbox" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e1;"></i>
                    <p>No messages yet.</p>
                </div>
            `);
            return;
        }

        messages.forEach(m => {
            const isFromMe = m.from === user.name;
            const item = `
                <div style="padding: 1.5rem; border-bottom: 1px solid var(--border-color); background: ${m.read ? 'transparent' : '#f8fafc'};">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div>
                            <span style="font-weight: 600; color: var(--text-primary);">
                                ${isFromMe ? '📤 To: ' + m.to : '📥 From: ' + m.from}
                            </span>
                            ${!m.read && !isFromMe ? '<span style="background: #3b82f6; color: white; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">New</span>' : ''}
                        </div>
                        <span style="font-size: 0.875rem; color: var(--text-secondary);">${new Date(m.date).toLocaleString()}</span>
                    </div>
                    <div style="font-weight: 500; color: var(--text-primary); margin-bottom: 0.5rem;">${m.subject}</div>
                    <p style="margin: 0; color: var(--text-secondary); line-height: 1.5;">${m.body}</p>
                </div>
            `;
            container.append(item);
        });
    }

    // Open Message Modal
    $(document).on('click', '.message-btn', function (e) {
        e.preventDefault();
        const studentName = $(this).data('student');
        $('#msg-recipient').val(studentName);
        $('#msg-subject').val('');
        $('#msg-body').val('');
        $('#message-modal').fadeIn().css('display', 'flex');
    });

    // Send Message
    $('#message-form').on('submit', function (e) {
        e.preventDefault();
        const msgData = {
            from: user.name,
            to: $('#msg-recipient').val(),
            subject: $('#msg-subject').val(),
            body: $('#msg-body').val()
        };

        $.ajax({
            url: `${API_BASE}/messages`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(msgData),
            success: function () {
                alert('Message sent successfully!');
                $('#message-modal').fadeOut();
                refreshMessages(); // Refresh the messages list
            },
            error: function () {
                alert('Failed to send message.');
            }
        });
    });

    // 5. Populate Settings
    $('#settings-name').val(user.name);
    $('#settings-bio').val(user.bio || '');

    // Handle Settings Save
    $('#settings-form').on('submit', function (e) {
        e.preventDefault();
        const updateData = {
            name: $('#settings-name').val(),
            bio: $('#settings-bio').val()
        };

        $.ajax({
            url: `${API_BASE}/users/${user.id}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(updateData),
            success: function (res) {
                alert('Settings saved!');
                const updatedUser = { ...user, ...res.user };
                if (updatedUser.password) delete updatedUser.password;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                $('.user-name-display').text(updatedUser.name);
            }
        });
    });

    // --- Helpers ---

    function renderCoursesTable(courses) {
        const tbody = $('#courses-table-body');
        const recentBody = $('#recent-courses-body');

        tbody.empty();
        recentBody.empty();

        if (courses.length === 0) {
            tbody.html('<tr><td colspan="6" class="text-center">No courses found.</td></tr>');
            recentBody.html('<tr><td colspan="5" class="text-center">No courses found.</td></tr>');
            return;
        }

        courses.forEach(course => {
            const row = `
                <tr>
                    <td>
                        <div class="flex items-center gap-2">
                            <div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <img src="${course.image || 'https://via.placeholder.com/40'}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                            <span style="font-weight: 500;">${course.name}</span>
                        </div>
                    </td>
                    <td>${course.category || 'General'}</td>
                    <td>$${(course.price || 0).toFixed(2)}</td>
                    <td>${course.students || 0}</td>
                    <td><span class="status-badge status-active">Active</span></td>
                    <td>
                        <button class="btn-outline edit-course-btn" data-id="${course.id}" style="padding: 0.25rem 0.5rem; margin-right: 0.5rem;">Edit</button>
                        <button class="btn-outline delete-course-btn" data-id="${course.id}" style="padding: 0.25rem 0.5rem; color: #ef4444; border-color: #ef4444;">Delete</button>
                    </td>
                </tr>
            `;
            tbody.append(row);

            // Add to overview recent (simplified but with image)
            const recentRow = `
                 <tr>
                    <td>
                        <div class="flex items-center gap-2">
                             <div style="width: 40px; height: 40px; background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                                <img src="${course.image || 'https://via.placeholder.com/40'}" style="width: 100%; height: 100%; object-fit: cover;">
                            </div>
                             <span style="font-weight: 500;">${course.name}</span>
                        </div>
                    </td>
                    <td>${course.students || 0}</td>
                    <td>${course.rating || 0}</td>
                    <td><span class="status-badge status-active">Active</span></td>
                    <td>
                        <button class="btn-outline edit-course-btn" data-id="${course.id}" style="padding: 0.25rem 0.5rem; margin-right: 0.5rem;">Edit</button>
                        <button class="btn-outline delete-course-btn" data-id="${course.id}" style="padding: 0.25rem 0.5rem; color: #ef4444; border-color: #ef4444;">Delete</button>
                    </td>
                </tr>
            `;
            recentBody.append(recentRow);
        });
    }

    function renderStudentsTable(students) {
        const tbody = $('#students-table-body');
        tbody.empty();

        if (students.length === 0) {
            tbody.html('<tr><td colspan="5" class="text-center">No students found.</td></tr>');
            return;
        }

        students.forEach(student => {
            // For each course they are enrolled in, we might show a row, or combine
            student.courses.forEach(c => {
                const row = `
                    <tr>
                        <td>
                            <div class="flex items-center gap-2">
                                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=random" 
                                    style="width: 32px; height: 32px; border-radius: 50%;">
                                <span>${student.name}</span>
                            </div>
                        </td>
                        <td>${c.name}</td>
                        <td>${c.progress}%</td>
                        <td>${c.joinedDate ? c.joinedDate.split('T')[0] : '-'}</td>
                        <td><button class="btn-outline message-btn" data-student="${student.name}" style="padding: 0.25rem 0.5rem;">Message</button></td>
                    </tr>
                 `;
                tbody.append(row);
            });
        });
    }

    // Logout
    $('.logout-btn').on('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });
});
