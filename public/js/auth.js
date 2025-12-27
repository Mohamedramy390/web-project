$(document).ready(function () {
    // Tab Switching
    $('.auth-tab').on('click', function () {
        $('.auth-tab').removeClass('active');
        $('.auth-form').removeClass('active');

        $(this).addClass('active');
        const target = $(this).data('target');
        // Select by ID matching the target (login-form or register-form) - wait, my HTML IDs are login-form vs login.
        // My HTML: data-target="login", form id="login-form".
        // The old code assumed IDs matched data-target. I'll fix the logic here.
        if (target === 'login') {
            $('#login-form').addClass('active');
        } else {
            $('#register-form').addClass('active');
        }
    });

    // Validation Regex
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const passwordRegex = /.{6,}/;

    // Login Form Submission
    $('#login-form').on('submit', function (e) {
        e.preventDefault();
        let valid = true;

        const email = $('#login-email').val();
        const password = $('#login-password').val();

        // Clear previous errors
        $('.error-message').hide();
        $('input').removeClass('invalid');

        // Client-side Validation
        if (!emailRegex.test(email)) {
            $('#login-email-error').text('Please enter a valid email address.').show();
            $('#login-email').addClass('invalid');
            valid = false;
        }

        if (password.length < 1) {
            $('#login-password-error').text('Password is required.').show();
            $('#login-password').addClass('invalid');
            valid = false;
        }

        if (!valid) return;

        // AJAX Request (JSON)
        $.ajax({
            url: 'http://localhost:3000/api/login',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email, password: password }),
            success: function (response) {
                if (response.success) {
                    $('#login-status').html('<span style="color:green">Login successful! Redirecting...</span>');

                    // Simple redirection logic
                    setTimeout(function () {
                        // Store user info in localStorage for demo purposes
                        localStorage.setItem('user', JSON.stringify(response.user));

                        if (response.user.role === 'admin') {
                            window.location.href = 'admin-dashboard.html';
                        } else if (response.user.role === 'instructor') {
                            window.location.href = 'instructor-dashboard.html';
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    }, 1000);
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON ? xhr.responseJSON.message : 'Login failed';
                $('#login-status').html('<span style="color:red">' + msg + '</span>');
            }
        });
    });

    // Register Form Submission
    $('#register-form').on('submit', function (e) {
        e.preventDefault();
        let valid = true;

        const name = $('#reg-name').val();
        const email = $('#reg-email').val();
        const role = $('#reg-role').val();
        const password = $('#reg-password').val();

        // Clear previous errors
        $('.error-message').hide();
        $('input').removeClass('invalid');

        // Validation
        if (name.length < 2) {
            $('#reg-name-error').text('Name must be at least 2 characters.').show();
            $('#reg-name').addClass('invalid');
            valid = false;
        }

        if (!emailRegex.test(email)) {
            $('#reg-email-error').text('Please enter a valid email address.').show();
            $('#reg-email').addClass('invalid');
            valid = false;
        }

        if (!passwordRegex.test(password)) {
            $('#reg-password-error').text('Password must be at least 6 characters.').show();
            $('#reg-password').addClass('invalid');
            valid = false;
        }

        if (!valid) return;

        // AJAX Request
        $.ajax({
            url: 'http://localhost:3000/api/register',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ name, email, role, password }),
            success: function (response) {
                if (response.success) {
                    $('#register-status').html('<span style="color:green">Registration successful! Please login.</span>');
                    setTimeout(() => {
                        // Switch to login tab
                        $('#tab-login').click();
                        $('#register-status').empty();
                        // Pre-fill email
                        $('#login-email').val(email);
                    }, 1500);
                }
            },
            error: function (xhr) {
                const msg = xhr.responseJSON ? xhr.responseJSON.message : 'Registration failed';
                $('#register-status').html('<span style="color:red">' + msg + '</span>');
            }
        });
    });
});
