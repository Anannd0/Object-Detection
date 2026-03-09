// Load detection count on page load
document.addEventListener('DOMContentLoaded', () => {
    loadDetectionCount();
    // Refresh count every 30 seconds
    setInterval(loadDetectionCount, 30000);
});

function loadDetectionCount() {
    fetch('/api/detection_count')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const counterText = document.getElementById('detection-count-text');
                if (counterText) {
                    if (data.limit > 0) {
                        const remaining = data.limit - data.current_count;
                        counterText.textContent = `${data.current_count}/${data.limit} detections`;
                        if (remaining <= 3 && remaining > 0) {
                            counterText.style.color = '#ff9800';
                        } else if (remaining === 0) {
                            counterText.style.color = '#dc3545';
                        } else {
                            counterText.style.color = '#4a9eff';
                        }
                    } else {
                        counterText.textContent = `${data.current_count} detections`;
                        counterText.style.color = '#4a9eff';
                    }
                }
            }
        })
        .catch(error => {
            console.error('Error loading detection count:', error);
        });
}

// Tab switching
function switchTab(tab) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    // Activate corresponding button
    event.target.classList.add('active');
    
    // Clear previous results
    clearResults(tab);
}

function clearResults(type) {
    if (type === 'image') {
        document.getElementById('image-preview-section').classList.add('hidden');
        document.getElementById('image-detections').classList.add('hidden');
        document.getElementById('image-loading').classList.add('hidden');
    } else if (type === 'video') {
        document.getElementById('video-preview-section').classList.add('hidden');
        document.getElementById('video-detections').classList.add('hidden');
        document.getElementById('video-loading').classList.add('hidden');
    } else if (type === 'realtime') {
        stopWebcam();
    }
    hideError();
}

// Image upload handling
const imageUploadArea = document.getElementById('image-upload-area');
const imageInput = document.getElementById('image-input');

imageUploadArea.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleImageUpload(e.target.files[0]);
    }
});

// Drag and drop for images
imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadArea.classList.add('dragover');
});

imageUploadArea.addEventListener('dragleave', () => {
    imageUploadArea.classList.remove('dragover');
});

imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleImageUpload(e.dataTransfer.files[0]);
    }
});

function handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
        showError('Please upload a valid image file');
        return;
    }
    
    clearResults('image');
    
    // Show preview of original image
    const reader = new FileReader();
    reader.onload = (e) => {
        const originalImg = document.getElementById('original-image');
        originalImg.src = e.target.result;
        document.getElementById('image-preview-section').classList.remove('hidden');
    };
    reader.readAsDataURL(file);
    
    // Upload and process
    const formData = new FormData();
    formData.append('image', file);
    
    document.getElementById('image-loading').classList.remove('hidden');
    hideError();
    
    fetch('/detect_image', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('image-loading').classList.add('hidden');
        
        if (data.error) {
            if (data.limit_reached) {
                showError(data.error);
                // Show upgrade message
                const errorDiv = document.getElementById('error-message');
                errorDiv.innerHTML = data.error + ' <a href="/subscription" style="color: #fff; text-decoration: underline;">Upgrade Now</a>';
            } else {
                showError(data.error);
            }
            return;
        }
        
        if (data.success) {
            // Display result image
            document.getElementById('result-image').src = data.image;
            document.getElementById('image-preview-section').classList.remove('hidden');
            
            // Display detections
            if (data.detections && data.detections.length > 0) {
                displayImageDetections(data.detections);
            } else {
                document.getElementById('image-detections').innerHTML = 
                    '<h3>Detection Results</h3><p>No objects detected</p>';
                document.getElementById('image-detections').classList.remove('hidden');
            }
            
            // Update detection count display
            if (data.detection_count !== undefined) {
                loadDetectionCount();
                
                // Show warning if low on detections
                if (data.detection_limit !== undefined && data.detection_limit > 0) {
                    const remaining = data.detection_limit - data.detection_count;
                    if (remaining <= 3 && remaining > 0) {
                        showError(`Warning: You have ${remaining} detection${remaining > 1 ? 's' : ''} remaining. <a href="/subscription" style="color: #fff; text-decoration: underline;">Upgrade for unlimited</a>`, 'warning');
                    }
                }
            }
        }
    })
    .catch(error => {
        document.getElementById('image-loading').classList.add('hidden');
        showError('Error processing image: ' + error.message);
    });
}

function displayImageDetections(detections) {
    const detectionsList = document.getElementById('detections-list');
    detectionsList.innerHTML = '';
    
    detections.forEach((detection, index) => {
        const item = document.createElement('div');
        item.className = 'detection-item';
        item.innerHTML = `
            <span class="detection-label">${detection.label}</span>
            <span class="detection-confidence">${detection.confidence}%</span>
        `;
        detectionsList.appendChild(item);
    });
    
    document.getElementById('image-detections').classList.remove('hidden');
}

// Video upload handling
const videoUploadArea = document.getElementById('video-upload-area');
const videoInput = document.getElementById('video-input');

videoUploadArea.addEventListener('click', () => videoInput.click());

videoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleVideoUpload(e.target.files[0]);
    }
});

// Drag and drop for videos
videoUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    videoUploadArea.classList.add('dragover');
});

videoUploadArea.addEventListener('dragleave', () => {
    videoUploadArea.classList.remove('dragover');
});

videoUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    videoUploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleVideoUpload(e.dataTransfer.files[0]);
    }
});

function handleVideoUpload(file) {
    if (!file.type.startsWith('video/')) {
        showError('Please upload a valid video file');
        return;
    }
    
    clearResults('video');
    
    const formData = new FormData();
    formData.append('video', file);
    
    document.getElementById('video-loading').classList.remove('hidden');
    hideError();
    
    // Simulate progress (since we can't track actual progress easily)
    let progress = 0;
    const progressInterval = setInterval(() => {
        progress += 5;
        if (progress < 90) {
            document.getElementById('progress-fill').style.width = progress + '%';
        }
    }, 500);
    
    fetch('/detect_video', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        clearInterval(progressInterval);
        document.getElementById('progress-fill').style.width = '100%';
        
        setTimeout(() => {
            document.getElementById('video-loading').classList.add('hidden');
            document.getElementById('progress-fill').style.width = '0%';
        }, 500);
        
        if (data.error) {
            if (data.limit_reached) {
                showError(data.error);
                const errorDiv = document.getElementById('error-message');
                errorDiv.innerHTML = data.error + ' <a href="/subscription" style="color: #fff; text-decoration: underline;">Upgrade Now</a>';
            } else {
                showError(data.error);
            }
            return;
        }
        
        if (data.success) {
            // Display result video - fix video display
            const resultVideo = document.getElementById('result-video');
            const videoSource = document.getElementById('video-source');
            videoSource.src = data.video_url;
            resultVideo.load(); // Reload video element
            resultVideo.play().catch(e => console.log('Video play error:', e));
            document.getElementById('video-preview-section').classList.remove('hidden');
            
            // Update detection count display
            if (data.detection_count !== undefined) {
                loadDetectionCount();
            }
            
            // Display detection summary
            if (data.detections_summary && data.detections_summary.length > 0) {
                displayVideoDetections(data.detections_summary, data.total_frames);
            } else {
                document.getElementById('video-detections').innerHTML = 
                    '<h3>Detection Summary</h3><p>No objects detected in the video</p>';
                document.getElementById('video-detections').classList.remove('hidden');
            }
        }
    })
    .catch(error => {
        clearInterval(progressInterval);
        document.getElementById('video-loading').classList.add('hidden');
        showError('Error processing video: ' + error.message);
    });
}

function displayVideoDetections(detectionsSummary, totalFrames) {
    const detectionsList = document.getElementById('video-detections-list');
    detectionsList.innerHTML = '';
    
    // Count unique objects
    const objectCounts = {};
    detectionsSummary.forEach(frame => {
        frame.detections.forEach(det => {
            if (!objectCounts[det.label]) {
                objectCounts[det.label] = 0;
            }
            objectCounts[det.label]++;
        });
    });
    
    // Display summary
    const summaryDiv = document.createElement('div');
    summaryDiv.innerHTML = `
        <p><strong>Total Frames:</strong> ${totalFrames}</p>
        <p><strong>Frames with Detections:</strong> ${detectionsSummary.length}</p>
    `;
    detectionsList.appendChild(summaryDiv);
    
    // Display object counts
    const countsDiv = document.createElement('div');
    countsDiv.style.marginTop = '20px';
    countsDiv.innerHTML = '<h4>Detected Objects:</h4>';
    
    Object.entries(objectCounts).forEach(([label, count]) => {
        const item = document.createElement('div');
        item.className = 'detection-item';
        item.innerHTML = `
            <span class="detection-label">${label}</span>
            <span class="detection-confidence">${count} detections</span>
        `;
        countsDiv.appendChild(item);
    });
    
    detectionsList.appendChild(countsDiv);
    document.getElementById('video-detections').classList.remove('hidden');
}

function showError(message, type = 'error') {
    const errorDiv = document.getElementById('error-message');
    if (type === 'warning') {
        errorDiv.style.background = '#ff9800';
        errorDiv.style.borderColor = '#ff6b00';
    } else {
        errorDiv.style.background = '#dc3545';
        errorDiv.style.borderColor = '#ff4757';
    }
    errorDiv.innerHTML = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-message').classList.add('hidden');
}

// Real-Time Webcam Detection
let webcamStream = null;
let webcamInterval = null;
let isWebcamActive = false;
let liveDetectionSession = []; // Track all detections during live session

const startWebcamBtn = document.getElementById('start-webcam');
const stopWebcamBtn = document.getElementById('stop-webcam');
const captureImageBtn = document.getElementById('capture-image');
const webcamVideo = document.getElementById('webcam-video');
const webcamCanvas = document.getElementById('webcam-canvas');
const webcamContainer = document.getElementById('webcam-container');
const webcamError = document.getElementById('webcam-error');

// Store current detections for capture
let currentDetections = [];

startWebcamBtn.addEventListener('click', startWebcam);
stopWebcamBtn.addEventListener('click', stopWebcam);
captureImageBtn.addEventListener('click', captureCurrentFrame);

async function startWebcam() {
    try {
        webcamError.classList.add('hidden');
        if (!window.isSecureContext) {
            webcamError.textContent = 'Camera requires HTTPS. Open this site with https:// or use http://localhost.';
            webcamError.classList.remove('hidden');
            isWebcamActive = false;
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            webcamError.textContent = 'Camera is not supported in this browser.';
            webcamError.classList.remove('hidden');
            isWebcamActive = false;
            return;
        }
        
        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } 
        });
        
        webcamStream = stream;
        webcamVideo.srcObject = stream;
        
        // Show controls immediately
        startWebcamBtn.classList.add('hidden');
        stopWebcamBtn.classList.remove('hidden');
        captureImageBtn.classList.remove('hidden');
        webcamContainer.classList.remove('hidden');
        
        // Reset session tracking
        liveDetectionSession = [];
        currentDetections = [];
        
        // Wait for video to be ready and playing
        webcamVideo.onloadedmetadata = () => {
            webcamVideo.play().catch(e => {
                console.error('Error playing video:', e);
            });
        };
        
        // Start processing when video is playing
        webcamVideo.onplaying = () => {
            isWebcamActive = true;
            
            // Wait for video to have enough data
            const startProcessing = () => {
                if (webcamVideo.readyState >= webcamVideo.HAVE_CURRENT_DATA && isWebcamActive) {
                    // Set initial canvas size and draw first frame
                    webcamCanvas.width = webcamVideo.videoWidth || 640;
                    webcamCanvas.height = webcamVideo.videoHeight || 480;
                    const ctx = webcamCanvas.getContext('2d');
                    ctx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
                    // Start continuous processing
                    processWebcamFrames();
                } else if (isWebcamActive) {
                    setTimeout(startProcessing, 100);
                }
            };
            startProcessing();
        };
        
    } catch (error) {
        console.error('Error accessing webcam:', error);
        webcamError.textContent = 'Error accessing webcam: ' + error.message;
        webcamError.classList.remove('hidden');
        isWebcamActive = false;
    }
}

function stopWebcam() {
    // Stop processing
    isWebcamActive = false;
    
    // Clear interval
    if (webcamInterval) {
        clearTimeout(webcamInterval);
        webcamInterval = null;
    }
    
    // Save session to history if there were any detections
    if (liveDetectionSession.length > 0) {
        saveLiveDetectionSession();
    }
    
    // Stop webcam stream
    if (webcamStream) {
        webcamStream.getTracks().forEach(track => {
            track.stop();
        });
        webcamStream = null;
    }
    
    // Clear video
    webcamVideo.srcObject = null;
    webcamVideo.pause();
    
    // Clear canvas
    const ctx = webcamCanvas.getContext('2d');
    ctx.clearRect(0, 0, webcamCanvas.width, webcamCanvas.height);
    
    // Hide controls
    startWebcamBtn.classList.remove('hidden');
    stopWebcamBtn.classList.add('hidden');
    captureImageBtn.classList.add('hidden');
    webcamContainer.classList.add('hidden');
    
    // Clear detections
    const detectionsList = document.getElementById('realtime-detections-list');
    if (detectionsList) {
        detectionsList.innerHTML = '';
    }
    
    // Reset session tracking
    liveDetectionSession = [];
    currentDetections = [];
}

function processWebcamFrames() {
    if (!isWebcamActive) return;
    
    // Wait for video to be ready
    if (webcamVideo.readyState !== webcamVideo.HAVE_ENOUGH_DATA) {
        webcamInterval = setTimeout(processWebcamFrames, 100);
        return;
    }
    
    // Set canvas size to match video
    webcamCanvas.width = webcamVideo.videoWidth || 640;
    webcamCanvas.height = webcamVideo.videoHeight || 480;
    
    const ctx = webcamCanvas.getContext('2d');
    // Draw current video frame to canvas
    ctx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
    
    // Convert canvas to base64
    const imageData = webcamCanvas.toDataURL('image/jpeg', 0.8);
    
    // Send to server for processing
    fetch('/webcam_frame', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success && isWebcamActive) {
            // Display processed frame with detections on canvas
            const img = new Image();
            img.onload = () => {
                // Only update canvas if webcam is still active
                if (isWebcamActive) {
                    ctx.clearRect(0, 0, webcamCanvas.width, webcamCanvas.height);
                    ctx.drawImage(img, 0, 0, webcamCanvas.width, webcamCanvas.height);
                }
            };
            img.onerror = () => {
                // If image fails to load, draw the current video frame
                if (isWebcamActive) {
                    ctx.clearRect(0, 0, webcamCanvas.width, webcamCanvas.height);
                    ctx.drawImage(webcamVideo, 0, 0, webcamCanvas.width, webcamCanvas.height);
                }
            };
            img.src = data.image;
            
            // Display detections
            if (data.detections && data.detections.length > 0) {
                // Update current detections for capture
                currentDetections = data.detections;
                
                displayRealtimeDetections(data.detections);
                // Add to session tracking (only unique detections to avoid duplicates)
                data.detections.forEach(det => {
                    // Check if this detection is already in session (same label and similar confidence)
                    const existing = liveDetectionSession.find(d => 
                        d.label === det.label && 
                        Math.abs(d.confidence - det.confidence) < 5
                    );
                    if (!existing) {
                        liveDetectionSession.push(det);
                    }
                });
            } else {
                currentDetections = [];
                const detectionsList = document.getElementById('realtime-detections-list');
                if (detectionsList && detectionsList.children.length === 0) {
                    detectionsList.innerHTML = '<p>No objects detected</p>';
                }
            }
        }
        
        // Continue processing if webcam is still active
        if (isWebcamActive) {
            webcamInterval = setTimeout(processWebcamFrames, 500); // Process every 500ms (2 FPS)
        }
    })
    .catch(error => {
        console.error('Error processing frame:', error);
        if (isWebcamActive) {
            webcamInterval = setTimeout(processWebcamFrames, 1000); // Retry after 1 second on error
        }
    });
}

function displayRealtimeDetections(detections) {
    const detectionsList = document.getElementById('realtime-detections-list');
    detectionsList.innerHTML = '';
    
    // Count objects
    const objectCounts = {};
    detections.forEach(det => {
        if (!objectCounts[det.label]) {
            objectCounts[det.label] = { count: 0, maxConf: 0 };
        }
        objectCounts[det.label].count++;
        objectCounts[det.label].maxConf = Math.max(objectCounts[det.label].maxConf, det.confidence);
    });
    
    // Display counts
    Object.entries(objectCounts).forEach(([label, data]) => {
        const item = document.createElement('div');
        item.className = 'detection-item';
        item.innerHTML = `
            <span class="detection-label">${label}</span>
            <span class="detection-confidence">${data.count} (${data.maxConf.toFixed(1)}%)</span>
        `;
        detectionsList.appendChild(item);
    });
}

function saveLiveDetectionSession() {
    if (liveDetectionSession.length === 0) {
        return; // No detections to save
    }
    
    // Send session data to backend
    fetch('/api/save_live_detection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            detections: liveDetectionSession
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Live detection session saved to history');
        } else {
            console.error('Failed to save live detection session:', data.error);
        }
    })
    .catch(error => {
        console.error('Error saving live detection session:', error);
    });
}

function captureCurrentFrame() {
    if (!isWebcamActive || !webcamCanvas) {
        showError('Camera is not active');
        return;
    }
    
    // Get the current canvas content (which has the processed frame with detections)
    const imageData = webcamCanvas.toDataURL('image/jpeg', 0.9);
    
    // Send to server for saving
    fetch('/api/capture_live_image', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            image: imageData,
            detections: currentDetections
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            const message = document.createElement('div');
            message.className = 'capture-success-message';
            message.textContent = 'Image captured successfully!';
            message.style.cssText = 'position: fixed; top: 20px; right: 20px; background: rgba(76, 175, 80, 0.9); color: white; padding: 15px 20px; border-radius: 8px; z-index: 10000; animation: slideInRight 0.3s ease-out;';
            document.body.appendChild(message);
            
            setTimeout(() => {
                message.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => message.remove(), 300);
            }, 3000);
            
            // Refresh history if on history page
            // Check if we're on the history page by looking for history-specific elements
            const historyList = document.getElementById('history-list');
            if (historyList && typeof loadHistory === 'function') {
                // Small delay to ensure database is updated
                setTimeout(() => {
                    loadHistory();
                }, 500);
            }
            
            // Also trigger a custom event that history page can listen to
            window.dispatchEvent(new CustomEvent('imageCaptured', { 
                detail: { 
                    success: true, 
                    image_path: data.image_path,
                    capture_id: data.capture_id 
                } 
            }));
        } else {
            showError('Failed to capture image: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Error capturing image:', error);
        showError('Error capturing image: ' + error.message);
    });
}

