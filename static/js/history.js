// Load history on page load
document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});

// Make loadHistory available globally so it can be called from other pages
window.loadHistory = loadHistory;

// Listen for image capture events and refresh history
window.addEventListener('imageCaptured', (event) => {
    // Refresh history when an image is captured
    if (event.detail && event.detail.success) {
        // Small delay to ensure database is updated
        setTimeout(() => {
            loadHistory();
        }, 300);
    }
});

function loadHistory() {
    const loadingDiv = document.getElementById('history-loading');
    const emptyDiv = document.getElementById('history-empty');
    const historyList = document.getElementById('history-list');
    const errorDiv = document.getElementById('error-message');
    
    // Show loading, hide others
    loadingDiv.classList.remove('hidden');
    emptyDiv.classList.add('hidden');
    historyList.classList.add('hidden');
    errorDiv.classList.add('hidden');
    
    fetch('/api/history')
        .then(response => response.json())
        .then(data => {
            loadingDiv.classList.add('hidden');
            
            if (data.error) {
                showError(data.error);
                return;
            }
            
            if (!data.history || data.history.length === 0) {
                emptyDiv.classList.remove('hidden');
                return;
            }
            
            displayHistory(data.history);
        })
        .catch(error => {
            loadingDiv.classList.add('hidden');
            showError('Error loading history: ' + error.message);
        });
}

function displayHistory(history) {
    const historyList = document.getElementById('history-list');
    const emptyDiv = document.getElementById('history-empty');
    
    historyList.innerHTML = '';
    
    if (!history || history.length === 0) {
        historyList.classList.add('hidden');
        if (emptyDiv) {
            emptyDiv.classList.remove('hidden');
        }
        return;
    }
    
    historyList.classList.remove('hidden');
    if (emptyDiv) {
        emptyDiv.classList.add('hidden');
    }
    
    history.forEach((item, index) => {
        const historyItem = createHistoryItem(item);
        historyList.appendChild(historyItem);
        
        // Highlight the most recent capture if it was just added
        if (index === 0 && item.type === 'capture') {
            historyItem.style.animation = 'fadeInHighlight 0.5s ease-out';
            historyItem.style.border = '2px solid rgba(76, 175, 80, 0.5)';
            setTimeout(() => {
                historyItem.style.border = '';
            }, 2000);
        }
    });
}

function createHistoryItem(item) {
    const div = document.createElement('div');
    div.className = 'history-item';
    
    // Format date
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleString();
    
    // Count objects by type
    const objectCounts = {};
    if (item.detections && Array.isArray(item.detections)) {
        if (item.type === 'image' || item.type === 'capture') {
            item.detections.forEach(det => {
                if (!objectCounts[det.label]) {
                    objectCounts[det.label] = 0;
                }
                objectCounts[det.label]++;
            });
        } else if (item.type === 'video') {
            item.detections.forEach(frame => {
                if (frame.detections) {
                    frame.detections.forEach(det => {
                        if (!objectCounts[det.label]) {
                            objectCounts[det.label] = 0;
                        }
                        objectCounts[det.label]++;
                    });
                }
            });
        } else if (item.type === 'realtime') {
            // Live detection detections are already in flat array
            item.detections.forEach(det => {
                if (!objectCounts[det.label]) {
                    objectCounts[det.label] = 0;
                }
                objectCounts[det.label]++;
            });
        }
    }
    
    // Create detection badges
    const detectionBadges = Object.entries(objectCounts)
        .map(([label, count]) => `
            <div class="detection-badge">
                <span>${label}</span>
                <span class="count">${count}</span>
            </div>
        `).join('');
    
    // Handle captured images - show image preview
    let imagePreview = '';
    if (item.type === 'capture' && item.image_path) {
        // Extract filename from path (e.g., 'captures/filename.jpg' -> 'filename.jpg')
        const filename = item.image_path.split('/').pop() || item.image_path.split('\\').pop();
        // URL encode the filename to handle special characters like @ in email addresses
        const encodedFilename = encodeURIComponent(filename);
        const imageUrl = `/captures/${encodedFilename}`;
        imagePreview = `
        <div class="history-item-image">
            <img src="${imageUrl}" alt="Captured Image" onclick="window.open('${imageUrl}', '_blank')" style="max-width: 100%; max-height: 300px; border-radius: 8px; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.2);" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'200\\' height=\\'200\\'%3E%3Ctext x=\\'50%25\\' y=\\'50%25\\' text-anchor=\\'middle\\' fill=\\'%23fff\\'%3EImage not found%3C/text%3E%3C/svg%3E';">
        </div>
    `;
    }
    
    div.innerHTML = `
        <div class="history-item-header">
            <div class="history-item-title">
                <span class="history-item-type ${item.type}">${item.type === 'capture' ? 'Live Capture' : item.type}</span>
                <span class="history-item-filename">${item.filename || 'Unknown'}</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <span class="history-item-date">${formattedDate}</span>
            </div>
        </div>
        ${imagePreview}
        <div class="history-item-info">
            <div class="info-item">
                <div class="info-label">Total Objects</div>
                <div class="info-value">${item.total_objects || 0}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Type</div>
                <div class="info-value">${item.type === 'capture' ? 'LIVE CAPTURE' : item.type.toUpperCase()}</div>
            </div>
            ${item.result_path ? `
            <div class="info-item">
                <div class="info-label">Result</div>
                <div class="info-value">
                    <a href="/results/${item.result_path}" style="color: #4a9eff; text-decoration: none;" target="_blank">View Video</a>
                </div>
            </div>
            ` : ''}
            ${item.type === 'capture' && item.image_path ? (() => {
                const filename = item.image_path.split('/').pop() || item.image_path.split('\\').pop();
                const encodedFilename = encodeURIComponent(filename);
                const imageUrl = `/captures/${encodedFilename}`;
                return `
            <div class="info-item">
                <div class="info-label">Image</div>
                <div class="info-value">
                    <a href="${imageUrl}" style="color: #4a9eff; text-decoration: none;" target="_blank">View Full Image</a>
                </div>
            </div>
            `;
            })() : ''}
        </div>
        ${detectionBadges ? `
        <div class="history-item-detections">
            <div class="detections-title">Detected Objects:</div>
            <div class="detections-list">${detectionBadges}</div>
        </div>
        ` : ''}
    `;
    
    return div;
}

// Delete functionality removed - users cannot delete history

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}


