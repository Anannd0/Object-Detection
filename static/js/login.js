document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');
    const submitButton = document.querySelector('.login-button');
    
    errorDiv.classList.add('hidden');
    
    submitButton.disabled = true;
    submitButton.innerHTML = '<span>Signing in...</span>';
    
    try {
        const formData = new FormData();
        formData.append('username', username);
        formData.append('password', password);
        
        const response = await fetch('/login', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = data.redirect || '/';
        } else {
            errorDiv.textContent = data.error || 'Invalid username or password';
            errorDiv.classList.remove('hidden');
            submitButton.disabled = false;
            submitButton.innerHTML = '<span>Sign In</span>';
        }
    } catch (error) {
        errorDiv.textContent = 'An error occurred. Please try again.';
        errorDiv.classList.remove('hidden');
        submitButton.disabled = false;
        submitButton.innerHTML = '<span>Sign In</span>';
    }
});
