$(document).ready(function () {
    // 1. Check User Login Status
    const userJson = localStorage.getItem('user');
    if (!userJson) {
        window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userJson);
    $('#user-name').text(user.name);
    $('#user-avatar').attr('src', 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=random');

    $('#user-name').text(user.name);
    $('#user-avatar').attr('src', 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.name) + '&background=random');

    // Populate Settings Form
    $('#settings-name').val(user.name);
    $('#settings-email').val(user.email);

    // Handle Settings Update
    $('#settings-form').on('submit', function (e) {
        e.preventDefault();
        const newName = $('#settings-name').val();
        const newPassword = $('#settings-password').val();

        const updateData = { name: newName };
        if (newPassword) updateData.password = newPassword;

        $.ajax({
            url: `http://localhost:3000/api/users/${user.id}`,
            method: 'PUT',
            contentType: 'application/json',
            data: JSON.stringify(updateData),
            success: function (res) {
                alert('Settings updated successfully!');
                const updatedUser = { ...user, ...res.user };
                // Keep password out of local storage if returned (API doesn't return it usually but safe side)
                if (updatedUser.password) delete updatedUser.password;

                localStorage.setItem('user', JSON.stringify(updatedUser));
                $('#user-name').text(updatedUser.name);
                // Update avatar if name changed
                $('#user-avatar').attr('src', 'https://ui-avatars.com/api/?name=' + encodeURIComponent(updatedUser.name) + '&background=random');
            },
            error: function () {
                alert('Failed to update settings');
            }
        });
    });

    // Fetch Real Messages
    fetchMessages();

    function fetchMessages() {
        $.ajax({
            url: `http://localhost:3000/api/messages?user=${encodeURIComponent(user.name)}`,
            method: 'GET',
            success: function (messages) {
                renderMessages(messages);
            },
            error: function () {
                $('#messages-list').html('<div class="stat-card"><p>Failed to load messages.</p></div>');
            }
        });
    }

    function renderMessages(messages) {
        const messagesContainer = $('#messages-list');
        messagesContainer.empty();

        if (messages.length === 0) {
            messagesContainer.html('<div class="stat-card"><p>No new messages.</p></div>');
            return;
        }

        messages.forEach(msg => {
            const isFromMe = msg.from === user.name;
            const displayName = isFromMe ? msg.to : msg.from;
            const label = isFromMe ? 'To' : 'From';

            messagesContainer.append(`
                <div class="stat-card" style="display: block; margin-bottom: 1rem; background: ${msg.read ? 'transparent' : '#f0f9ff'};">
                    <div class="flex justify-between items-center mb-2">
                        <h5 style="margin:0; color:var(--primary-color)">${msg.subject}</h5>
                        <small class="text-secondary">${new Date(msg.date).toLocaleDateString()}</small>
                    </div>
                    <p style="font-size: 0.9rem; margin-bottom: 0.5rem;">
                        <strong>${label}:</strong> ${displayName}
                        ${!msg.read && !isFromMe ? '<span style="background: #3b82f6; color: white; padding: 0.125rem 0.5rem; border-radius: 0.25rem; font-size: 0.75rem; margin-left: 0.5rem;">New</span>' : ''}
                    </p>
                    <p style="color: #475569;">${msg.body}</p>
                </div>
            `);
        });
    }

    // Wallet Logic
    $('#current-balance').text('$' + (user.balance || 0).toLocaleString());

    $('#add-funds-form').on('submit', function (e) {
        e.preventDefault();
        const amount = $('#fund-amount').val();

        $.ajax({
            url: 'http://localhost:3000/api/balance/add',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ userId: user.id, amount: amount }),
            success: function (res) {
                alert('Funds added!');
                user.balance = res.newBalance;
                localStorage.setItem('user', JSON.stringify(user));
                $('#current-balance').text('$' + user.balance.toLocaleString());
                $('#fund-amount').val('');
            },
            error: function () {
                alert('Failed to add funds');
            }
        });
    });

    // Sidebar Navigation Logic
    $('.nav-item').on('click', function (e) {
        e.preventDefault();

        // Remove active class from all nav items and sections
        $('.nav-item').removeClass('active');
        $('.dashboard-section').removeClass('active');

        // Add active class to clicked item and corresponding section
        $(this).addClass('active');
        const target = $(this).data('target');
        $('#' + target).addClass('active');
    });

    // Logout logic
    $('#logout-btn').on('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // 2. Fetch Enrolled Courses via JSON AJAX
    $.ajax({
        url: `http://localhost:3000/api/my-courses?userId=${user.id}`,
        method: 'GET',
        dataType: 'json',
        success: function (courses) {
            const overviewContainer = $('#course-list-overview');
            const allCoursesContainer = $('#course-list-all');

            overviewContainer.empty();
            allCoursesContainer.empty();
            console.log('Fetched My Courses:', courses);

            // Update Stats
            $('#stat-progress-count').text(courses.length);

            if (courses.length === 0) {
                const emptyMsg = '<p>You are not enrolled in any courses yet. <a href="courses.html" style="color:var(--primary-color)">Browse Courses</a></p>';
                overviewContainer.html(emptyMsg);
                allCoursesContainer.html(emptyMsg);
                return;
            }

            // Render Overview (Up to 3 courses)
            courses.slice(0, 3).forEach(course => renderCourseCard(course, overviewContainer));

            // Render All Enrolled Courses
            courses.forEach(course => renderCourseCard(course, allCoursesContainer));

            // Render Progress List
            const progressContainer = $('#progress-course-list');
            progressContainer.empty();
            courses.forEach(course => {
                const p = course.progress !== undefined ? course.progress : 0;
                progressContainer.append(`
                    <div class="stat-card" style="margin-bottom: 1rem; display: block;">
                        <div class="flex justify-between mb-2">
                            <strong>${course.name}</strong>
                            <span>${p}%</span>
                        </div>
                        <div class="progress-bar" style="margin-top:0;">
                             <div class="progress-fill" style="width: ${p}%;"></div>
                        </div>
                    </div>
                `);
            });
        },
        error: function (err) {
            console.error('Error fetching courses', err);
            $('#course-list-overview').html('<p style="color:red">Failed to load courses.</p>');
        }
    });

    // 3. Fetch Announcements via XML AJAX
    $.ajax({
        url: 'data/announcements.xml',
        method: 'GET',
        dataType: 'xml',
        success: function (xml) {
            const list = $('#announcements-list');
            list.empty();

            $(xml).find('announcement').each(function () {
                const title = $(this).find('title').text();
                const date = $(this).find('date').text();
                const content = $(this).find('content').text();

                const item = `
                    <div class="announcement-item" style="margin-bottom: 1rem; border-bottom: 1px solid #eee; padding-bottom: 0.5rem;">
                        <h5 style="color: var(--primary-color); margin-bottom: 0.2rem;">${title}</h5>
                        <small style="color: #64748b;">${date}</small>
                        <p style="font-size: 0.9rem; margin-top: 0.2rem;">${content}</p>
                    </div>
                `;
                list.append(item);
            });
        },
        error: function (err) {
            console.error('Error fetching XML', err);
            $('#announcements-list').html('<p>Failed to load announcements.</p>');
        }
    });

    // Handle Rating Click
    $(document).on('click', '.btn-rate', function (e) {
        e.preventDefault();
        const courseId = $(this).data('course-id');
        const rating = $(this).data('rating');
        const btn = $(this);

        $.ajax({
            url: `http://localhost:3000/api/courses/${courseId}/rate`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ userId: user.id, rating: rating }),
            success: function (res) {
                alert(`Rated ${rating} stars! New Course Avg: ${res.newRating}`);
                // Optional: Update UI to reflect active state
            },
            error: function () {
                alert('Failed to submit rating.');
            }
        });
    });
});

function renderCourseCard(course, container) {
    // Mock progress for demo or use real if available
    const progress = course.progress !== undefined ? course.progress : Math.floor(Math.random() * 100);
    const card = `
        <div class="course-card">
            <div class="course-image" style="height: 160px; background-color: #cbd5e1; display:flex; align-items:center; justify-content:center; color:#64748b; overflow:hidden;">
                 ${course.image ? `<img src="${course.image}" style="width:100%;height:100%;object-fit:cover;">` : '<i class="fas fa-book fa-3x"></i>'}
            </div>
            <div class="course-content">
                <h4 style="margin-bottom: 0.5rem;">${course.code || ''} ${course.name}</h4>
                <p style="font-size: 0.875rem; margin-bottom: 0.5rem;">Instructor: ${course.instructor}</p>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progress}%;"></div>
                </div>
                <div class="flex justify-between mt-4" style="font-size: 0.875rem; color: var(--text-secondary);">
                    <span>${progress}% Complete</span>
                    <a href="course-player.html?id=${course.id}" class="btn-resume" style="color: var(--primary-color); font-weight: 600;">Resume</a>
                </div>
                 <div class="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span style="font-size: 0.8rem;">Rate:</span>
                    <div class="rating-stars">
                        ${[1, 2, 3, 4, 5].map(i => `
                            <button class="btn-rate" data-course-id="${course.id}" data-rating="${i}" style="background:none; border:none; cursor:pointer; color: #cbd5e1; font-size: 1.2rem; transition: color 0.2s;">★</button>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    container.append(card);
}
