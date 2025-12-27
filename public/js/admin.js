$(document).ready(function () {
    // Initial Load
    loadOverview();

    // Sidebar Navigation
    $('.nav-item').on('click', function (e) {
        e.preventDefault();
        $('.nav-item').removeClass('active');
        $(this).addClass('active');

        const target = $(this).data('target');
        $('.dashboard-section').removeClass('active');
        $('#' + target).addClass('active');

        // Load data based on tab
        if (target === 'overview') loadOverview();
        if (target === 'users') loadUsers();
        if (target === 'courses') loadCourses();
    });

    // Logout
    $('#admin-logout').on('click', function (e) {
        e.preventDefault();
        localStorage.removeItem('user');
        window.location.href = 'index.html';
    });

    // --- MODAL LOGIC ---
    const modal = $('#userModal');

    // Close Modal
    $('.close-btn').on('click', function () {
        modal.fadeOut();
    });

    // Open Add User
    $('#btn-add-user').on('click', function () {
        $('#modal-title').text('Add New User');
        $('#user-id').val('');
        $('#user-name').val('');
        $('#user-email').val('');
        $('#user-role').val('student');
        $('#user-password').attr('required', true);
        modal.fadeIn();
    });

    // Submit User Form (Add/Edit)
    $('#user-form').on('submit', function (e) {
        e.preventDefault();
        const id = $('#user-id').val();
        const data = {
            name: $('#user-name').val(),
            email: $('#user-email').val(),
            role: $('#user-role').val(),
        };

        const password = $('#user-password').val();
        if (password) data.password = password;

        if (id) {
            // Edit
            $.ajax({
                url: `http://localhost:3000/api/users/${id}`,
                method: 'PUT',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function () {
                    modal.fadeOut();
                    loadUsers();
                }
            });
        } else {
            // Add (Register)
            // Use POST /api/register but we need to ensure the route handles extra fields if any or just basic logic
            // The register endpoint expects {name, email, role, password}
            $.ajax({
                url: 'http://localhost:3000/api/register',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(data),
                success: function () {
                    modal.fadeOut();
                    loadUsers();
                },
                error: function (xhr) {
                    alert('Error: ' + (xhr.responseJSON?.message || 'Failed'));
                }
            });
        }
    });

    // Delete User
    $(document).on('click', '.btn-delete-user', function () {
        if (!confirm('Are you sure?')) return;
        const id = $(this).data('id');
        $.ajax({
            url: `http://localhost:3000/api/users/${id}`,
            method: 'DELETE',
            success: function () {
                loadUsers();
            }
        });
    });

    // Edit User Click
    $(document).on('click', '.btn-edit-user', function () {
        const user = $(this).data('user'); // We will embed data in the button
        $('#modal-title').text('Edit User');
        $('#user-id').val(user.id);
        $('#user-name').val(user.name);
        $('#user-email').val(user.email);
        $('#user-role').val(user.role);
        // Password optional for edit
        $('#user-password').removeAttr('required').val('');
        modal.fadeIn();
    });

    // Delete Course via Admin
    $(document).on('click', '.btn-delete-course-admin', function () {
        if (!confirm('Delete this course?')) return;
        const id = $(this).data('id');
        $.ajax({
            url: `http://localhost:3000/api/courses/${id}`,
            method: 'DELETE',
            success: function () {
                loadCourses();
            }
        });
    });
});

function loadOverview() {
    // Load Stats
    $.get('http://localhost:3000/api/stats', function (res) {
        if (res.success) {
            $('#stat-users').text(res.stats.totalUsers);
            $('#stat-courses').text(res.stats.totalCourses);
            $('#stat-revenue').text('$' + res.stats.totalRevenue.toLocaleString());
            $('#stat-uptime').text(res.stats.uptime);
        }
    });

    // Load Recent Users (Reuse Users API and slice)
    $.get('http://localhost:3000/api/users', function (users) {
        const tbody = $('#recent-users-table');
        tbody.empty();
        // Show last 5
        users.slice(-5).reverse().forEach(u => {
            const roleClass = `role-${u.role}`;
            const row = `
                <tr>
                    <td>
                        <div class="flex items-center gap-2">
                             <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random" style="width:32px;height:32px;border-radius:50%">
                             <span style="font-weight:500">${u.name}</span>
                        </div>
                    </td>
                    <td>${u.email}</td>
                    <td><span class="role-badge ${roleClass}">${u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span></td>
                    <td>${u.joinedDate || 'N/A'}</td>
                </tr>
            `;
            tbody.append(row);
        });
    });
}

function loadUsers() {
    $.get('http://localhost:3000/api/users', function (users) {
        const tbody = $('#all-users-table');
        tbody.empty();
        users.forEach(u => {
            const roleClass = `role-${u.role}`;
            // Escape user data for data attribute
            const userData = JSON.stringify(u).replace(/"/g, '&quot;');

            const row = `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td><span class="role-badge ${roleClass}">${u.role}</span></td>
                    <td><span style="color:var(--success-color)">Active</span></td>
                    <td>
                        <button class="btn-outline btn-edit-user" data-user="${userData}" style="padding: 0.25rem 0.5rem;"><i class="fas fa-edit"></i></button>
                        <button class="btn-outline btn-delete-user" data-id="${u.id}" style="padding: 0.25rem 0.5rem; color:red; border-color:red;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    });
}

function loadCourses() {
    $.get('http://localhost:3000/api/courses', function (courses) {
        const tbody = $('#admin-courses-table');
        tbody.empty();

        courses.forEach(c => {
            const row = `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.instructor}</td>
                    <td>${c.category || 'General'}</td>
                    <td>${c.students || 0}</td>
                    <td><span class="role-badge role-student">Active</span></td>
                    <td>
                        <button class="btn-outline btn-delete-course-admin" data-id="${c.id}" style="padding: 0.25rem 0.5rem; color:red; border-color:red;">Delete</button>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    });
}
