const form = document.getElementById('create-account-form');
const messageBox = document.getElementById('create-account-message');
const submitButton = form.querySelector('.login-button');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageBox.classList.add('hidden');
    messageBox.classList.remove('error', 'success');
    submitButton.disabled = true;
    submitButton.innerHTML = '<span>Creating...</span>';

    const payload = {
        username: document.getElementById('new-username').value.trim(),
        email: document.getElementById('email').value.trim(),
        password: document.getElementById('new-password').value,
        confirm_password: document.getElementById('confirm-password').value
    };

    try {
        const response = await fetch('/create-account', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.success) {
            messageBox.textContent = data.message || 'Account created successfully.';
            messageBox.classList.remove('hidden');
            messageBox.classList.add('success');
            form.reset();
            setTimeout(() => window.location.href = '/login', 1500);
        } else {
            messageBox.textContent = data.error || 'Unable to create account.';
            messageBox.classList.remove('hidden');
            messageBox.classList.remove('success');
            messageBox.classList.add('error');
        }
    } catch (err) {
        messageBox.textContent = 'Something went wrong. Please try again.';
        messageBox.classList.remove('hidden');
        messageBox.classList.remove('success');
        messageBox.classList.add('error');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<span>Create Account</span>';
    }
});

