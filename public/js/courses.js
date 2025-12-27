$(document).ready(function () {
    let allCourses = [];

    // 1. Fetch and Display Courses
    fetchCourses();

    // 2. Setup Filters
    const categories = ['Development', 'Design', 'Data Science', 'Business', 'Marketing'];
    const filterContainer = $('#category-filters');
    categories.forEach(cat => {
        filterContainer.append(`
            <div class="checkbox-group">
                <input type="checkbox" id="cat-${cat}" value="${cat}">
                <label for="cat-${cat}">${cat}</label>
            </div>
        `);
    });

    // 3. Admin/Instructor Logic
    const userJson = localStorage.getItem('user');
    let userRole = null;
    let user = null;

    if (userJson) {
        user = JSON.parse(userJson);
        userRole = user.role;

        if (userRole === 'admin') {
            const btn = $('<button class="btn btn-primary"><i class="fas fa-plus"></i> Add New Course</button>');
            btn.css({ 'margin-bottom': '1.5rem', 'float': 'right' });
            $('#admin-actions').append(btn);

            btn.on('click', function () {
                $('#addCourseModal').fadeIn();
            });
        }
    }

    // 4. Search and Filter Logic
    function filterCourses() {
        const searchText = $('#course-search').val().toLowerCase();
        const checkedCategories = $('#category-filters input:checked').map(function () {
            return $(this).val();
        }).get();

        const filtered = allCourses.filter(course => {
            const matchesSearch = course.name.toLowerCase().includes(searchText) ||
                (course.description && course.description.toLowerCase().includes(searchText)) ||
                (course.instructor && course.instructor.toLowerCase().includes(searchText));

            const matchesCategory = checkedCategories.length === 0 || checkedCategories.includes(course.category);

            return matchesSearch && matchesCategory;
        });

        renderCourses(filtered);
    }

    $('#course-search').on('input', filterCourses);
    filterContainer.on('change', 'input', filterCourses);

    // Modal Logic
    $('.close-btn').on('click', function () {
        $('#addCourseModal').fadeOut();
    });

    // Add Course Submit
    $('#add-course-form').on('submit', function (e) {
        e.preventDefault();
        const formData = {
            name: $('input[name="name"]').val(),
            category: $('select[name="category"]').val(),
            instructor: $('input[name="instructor"]').val(),
            price: $('input[name="price"]').val(),
            // Random image for demo
            image: `https://source.unsplash.com/random/800x600?${$('select[name="category"]').val()}`
        };

        $.ajax({
            url: 'http://localhost:3000/api/courses',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            success: function (res) {
                if (res.success) {
                    $('#addCourseModal').fadeOut();
                    $('#add-course-form')[0].reset();
                    fetchCourses(); // Reload list
                }
            },
            error: function (err) {
                alert('Error creating course');
            }
        });
    });

    // Delete Course Logic
    $(document).on('click', '.btn-delete', function (e) {
        e.preventDefault();
        if (!confirm('Are you sure you want to delete this course?')) return;

        const courseId = $(this).data('id');
        $.ajax({
            url: `http://localhost:3000/api/courses/${courseId}`,
            method: 'DELETE',
            success: function (res) {
                if (res.success) fetchCourses();
            }
        });
    });

    // Helper Functions
    function fetchCourses() {
        $.ajax({
            url: 'http://localhost:3000/api/courses',
            method: 'GET',
            dataType: 'json',
            success: function (courses) {
                allCourses = courses;
                renderCourses(allCourses);
            },
            error: function () {
                $('#courses-grid').html('<p>Failed to load courses. Check connection.</p>');
            }
        });
    }

    function renderCourses(courses) {
        const grid = $('#courses-grid');
        grid.empty();

        if (courses.length === 0) {
            grid.html('<p>No courses found matching your criteria.</p>');
            return;
        }

        courses.forEach(course => {
            let adminButtons = '';
            if (user && user.role === 'admin') {
                adminButtons = `
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee; display: flex; gap: 0.5rem;">
                            <button class="btn-outline" style="flex:1; font-size: 0.8rem;">Edit</button>
                            <button class="btn-delete" data-id="${course.id}" style="flex:1; font-size: 0.8rem; border: 1px solid #ef4444; color: #ef4444; background: transparent; border-radius: 0.5rem; cursor:pointer;">Delete</button>
                    </div>
                `;
            }

            const card = `
                <div class="course-card">
                    <div class="course-image">
                            <img src="${course.image || 'https://via.placeholder.com/300'}" alt="${course.name}" style="width:100%; height:100%; object-fit:cover;">
                    </div>
                    <div class="course-content">
                        <div class="course-category">${course.category || 'General'}</div>
                        <h3 class="course-title"><a href="course-detail.html?id=${course.id}">${course.name}</a></h3>
                        <p style="font-size: 0.9rem; color: #64748b;">${course.description || 'No description available.'}</p>
                        <div class="course-meta">
                            <span><i class="fas fa-user"></i> ${course.instructor}</span>
                            <span><i class="fas fa-star" style="color: var(--accent-color)"></i> ${course.rating || 'New'}</span>
                        </div>
                        ${adminButtons}
                    </div>
                </div>
            `;
            grid.append(card);
        });
    }
});
