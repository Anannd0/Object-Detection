document.getElementById('confidence-threshold').addEventListener('input', (e) => {
    document.getElementById('confidence-value').textContent = e.target.value + '%';
});

document.getElementById('fps').addEventListener('input', (e) => {
    document.getElementById('fps-value').textContent = e.target.value + ' fps';
});

function applyTheme(theme) {
    const body = document.body;
    const html = document.documentElement;
    
    body.classList.remove('theme-light', 'theme-dark');
    html.classList.remove('theme-light', 'theme-dark');
    
    if (theme === 'light') {
        body.classList.add('theme-light');
        html.classList.add('theme-light');
    } else if (theme === 'dark') {
        body.classList.add('theme-dark');
        html.classList.add('theme-dark');
    } else if (theme === 'auto') {
        // Auto theme based on system preference
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
            body.classList.add('theme-dark');
            html.classList.add('theme-dark');
        } else {
            body.classList.add('theme-light');
            html.classList.add('theme-light');
        }
    }
}

function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('aetherVisionSettings') || '{}');
    
    if (settings.confidenceThreshold !== undefined) {
        document.getElementById('confidence-threshold').value = settings.confidenceThreshold;
        document.getElementById('confidence-value').textContent = settings.confidenceThreshold + '%';
    }
    
    if (settings.detectionSpeed) {
        document.getElementById('detection-speed').value = settings.detectionSpeed;
    }
    
    if (settings.showLabels !== undefined) {
        document.getElementById('show-labels').checked = settings.showLabels;
    }
    
    if (settings.showConfidence !== undefined) {
        document.getElementById('show-confidence').checked = settings.showConfidence;
    }
    
    if (settings.theme) {
        document.getElementById('theme').value = settings.theme;
        applyTheme(settings.theme);
    } else {
        applyTheme('dark');
    }
    
    if (settings.videoQuality) {
        document.getElementById('video-quality').value = settings.videoQuality;
    }
    
    if (settings.fps !== undefined) {
        document.getElementById('fps').value = settings.fps;
        document.getElementById('fps-value').textContent = settings.fps + ' fps';
    }
    
    if (settings.emailNotifications !== undefined) {
        document.getElementById('email-notifications').checked = settings.emailNotifications;
    }
    
    if (settings.soundAlerts !== undefined) {
        document.getElementById('sound-alerts').checked = settings.soundAlerts;
    }
}

// Save settings
function saveSettings() {
    const settings = {
        confidenceThreshold: parseInt(document.getElementById('confidence-threshold').value),
        detectionSpeed: document.getElementById('detection-speed').value,
        showLabels: document.getElementById('show-labels').checked,
        showConfidence: document.getElementById('show-confidence').checked,
        theme: document.getElementById('theme').value,
        videoQuality: document.getElementById('video-quality').value,
        fps: parseInt(document.getElementById('fps').value),
        emailNotifications: document.getElementById('email-notifications').checked,
        soundAlerts: document.getElementById('sound-alerts').checked
    };
    
    localStorage.setItem('aetherVisionSettings', JSON.stringify(settings));
    
    // Apply theme immediately
    applyTheme(settings.theme);
    
    // Show success message
    const messageDiv = document.getElementById('save-message');
    messageDiv.textContent = 'Settings saved successfully!';
    messageDiv.className = 'save-message success';
    messageDiv.classList.remove('hidden');
    
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 3000);
}

// Reset to default settings
function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default?')) {
        localStorage.removeItem('aetherVisionSettings');
        location.reload();
    }
}

// Listen for theme changes
document.getElementById('theme').addEventListener('change', (e) => {
    applyTheme(e.target.value);
    // Auto-save theme change
    const settings = JSON.parse(localStorage.getItem('aetherVisionSettings') || '{}');
    settings.theme = e.target.value;
    localStorage.setItem('aetherVisionSettings', JSON.stringify(settings));
});

// Clear all data function
function clearAllData() {
    if (!confirm('Are you absolutely sure you want to clear all data? This will permanently delete:\n\n- All detection history\n- All captured images\n- Your detection count will be reset\n\nThis action cannot be undone!')) {
        return;
    }
    
    // Double confirmation
    if (!confirm('This is your last chance. Click OK to permanently delete all your data.')) {
        return;
    }
    
    // Show loading state
    const button = document.querySelector('.clear-data-button');
    const originalText = button.textContent;
    button.textContent = 'Clearing...';
    button.disabled = true;
    
    fetch('/api/clear_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => response.json())
    .then(data => {
        button.textContent = originalText;
        button.disabled = false;
        
        const messageDiv = document.getElementById('save-message');
        if (data.success) {
            messageDiv.textContent = 'All data cleared successfully!';
            messageDiv.className = 'save-message success';
            messageDiv.classList.remove('hidden');
            

            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            messageDiv.textContent = 'Error: ' + (data.error || 'Failed to clear data');
            messageDiv.className = 'save-message error';
            messageDiv.classList.remove('hidden');
        }
        
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    })
    .catch(error => {
        button.textContent = originalText;
        button.disabled = false;
        
        const messageDiv = document.getElementById('save-message');
        messageDiv.textContent = 'Error: ' + error.message;
        messageDiv.className = 'save-message error';
        messageDiv.classList.remove('hidden');
        
        setTimeout(() => {
            messageDiv.classList.add('hidden');
        }, 5000);
    });
}

loadSettings();

