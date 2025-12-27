document.addEventListener('DOMContentLoaded', () => {
    // 1. Highlight active nav link
    const currentLocation = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-links a');

    // Normalize path for comparison (handle / vs /index.html)
    const normalizePath = (path) => path.endsWith('/') ? path + 'index.html' : path;
    const currentPath = normalizePath(window.location.pathname);

    navLinks.forEach(link => {
        if (normalizePath(link.getAttribute('href')).includes(currentPath.split('/').pop())) {
            link.classList.add('active');
        }
    });

    // 2. Global Auth State Handling
    const userJson = localStorage.getItem('user');
    const navList = document.querySelector('.nav-links');

    if (navList) {
        // Find links
        const dashboardLink = Array.from(navList.querySelectorAll('a')).find(a => a.innerText.trim() === 'Dashboard');
        const loginBtn = Array.from(navList.children).find(li => li.querySelector('a')?.innerText.includes('Login'));

        if (userJson) {
            const user = JSON.parse(userJson);

            // Update Dashboard Link based on Role
            if (dashboardLink) {
                dashboardLink.parentElement.style.display = 'block'; // Ensure visible
                if (user.role === 'admin') {
                    dashboardLink.href = 'admin-dashboard.html';
                } else if (user.role === 'instructor') {
                    dashboardLink.href = 'instructor-dashboard.html';
                } else {
                    dashboardLink.href = 'dashboard.html';
                }
            }

            // Replace Login with User Profile/Logout
            if (loginBtn) {
                loginBtn.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: 500; color: var(--text-primary); cursor: default;">
                            <i class="fas fa-user-circle"></i> ${user.name} (${user.role})
                        </span>
                        <a href="#" id="global-logout" class="btn btn-outline" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">Logout</a>
                    </div>
                `;

                // Logout Logic
                document.getElementById('global-logout').addEventListener('click', (e) => {
                    e.preventDefault();
                    localStorage.removeItem('user');
                    window.location.href = 'index.html';
                });
            }

            // 3. Page-Specific Logic: Courses Page
            if (window.location.pathname.includes('courses.html')) {
                handleCoursesPage(user);
            }

        } else {
            // No User - Hide Dashboard Link
            if (dashboardLink) {
                dashboardLink.parentElement.style.display = 'none';
            }
        }
    }

    // Animation Logic (existing)
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.course-card, .feature-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(el);
    });
});

function handleCoursesPage(user) {
    const coursesHeader = document.querySelector('.courses-content .flex');

    // Inject Admin/Instructor Controls
    if (user.role === 'admin' || user.role === 'instructor') {
        const controls = document.createElement('div');
        controls.className = 'admin-controls';
        controls.innerHTML = `
            <button class="btn btn-primary" style="margin-right: 1rem;">
                <i class="fas fa-plus"></i> Add New Course
            </button>
            ${user.role === 'admin' ? '<button class="btn btn-outline"><i class="fas fa-cog"></i> Manage Categories</button>' : ''}
        `;

        // Insert before the generic header elements or append
        if (coursesHeader) {
            // Adjust layout for controls
            coursesHeader.parentElement.insertBefore(controls, coursesHeader);
            controls.style.marginBottom = '1.5rem';
            controls.style.display = 'flex';
            controls.style.justifyContent = 'flex-end';
        }

        // Add Edit/Delete buttons to existing cards
        document.querySelectorAll('.course-card').forEach(card => {
            const content = card.querySelector('.course-content');
            const actions = document.createElement('div');
            actions.style.marginTop = '1rem';
            actions.style.paddingTop = '1rem';
            actions.style.borderTop = '1px solid #eee';
            actions.style.display = 'flex';
            actions.style.gap = '0.5rem';

            actions.innerHTML = `
                <button class="btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; width: 100%;">Edit</button>
                <button class="btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; width: 100%; border-color: red; color: red;">Delete</button>
            `;
            content.appendChild(actions);
        });
    }
}
