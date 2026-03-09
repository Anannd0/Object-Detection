// Chatbot functionality
class Chatbot {
    constructor() {
        this.isOpen = false;
        this.messages = [];
        this.init();
    }

    init() {
        this.createChatbotHTML();
        this.attachEventListeners();
        this.addWelcomeMessage();
    }

    createChatbotHTML() {
        const chatbotHTML = `
            <div class="chatbot-container">
                <button class="chatbot-button" id="chatbot-toggle">
                    <svg class="chat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <svg class="close-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="chatbot-window" id="chatbot-window">
                    <div class="chatbot-header">
                        <div>
                            <span class="status"></span>
                            <h3>Aether Vision Help</h3>
                        </div>
                    </div>
                    <div class="chatbot-messages" id="chatbot-messages"></div>
                    <div class="quick-questions" id="quick-questions">
                        <button class="quick-question" data-question="How do I use live detection?">How do I use live detection?</button>
                        <button class="quick-question" data-question="What is the detection limit?">What is the detection limit?</button>
                        <button class="quick-question" data-question="How do I view my history?">How do I view my history?</button>
                        <button class="quick-question" data-question="How do I capture an image?">How do I capture an image?</button>
                    </div>
                    <div class="chatbot-input-container">
                        <div class="chatbot-input-wrapper">
                            <input type="text" class="chatbot-input" id="chatbot-input" placeholder="Ask a question...">
                            <button class="chatbot-send" id="chatbot-send">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="22" y1="2" x2="11" y2="13"></line>
                                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', chatbotHTML);
    }

    attachEventListeners() {
        const toggleButton = document.getElementById('chatbot-toggle');
        const window = document.getElementById('chatbot-window');
        const input = document.getElementById('chatbot-input');
        const sendButton = document.getElementById('chatbot-send');
        const quickQuestions = document.querySelectorAll('.quick-question');

        toggleButton.addEventListener('click', () => this.toggle());
        
        sendButton.addEventListener('click', () => this.sendMessage());
        
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage();
            }
        });

        quickQuestions.forEach(button => {
            button.addEventListener('click', () => {
                const question = button.getAttribute('data-question');
                input.value = question;
                this.sendMessage();
            });
        });
    }

    toggle() {
        this.isOpen = !this.isOpen;
        const button = document.getElementById('chatbot-toggle');
        const window = document.getElementById('chatbot-window');
        
        if (this.isOpen) {
            button.classList.add('active');
            window.classList.add('active');
            document.getElementById('chatbot-input').focus();
        } else {
            button.classList.remove('active');
            window.classList.remove('active');
        }
    }

    addWelcomeMessage() {
        this.addMessage('bot', 'Hello! I\'m your Guide. I can help you with questions about using the application. Try asking me something!');
    }

    addMessage(sender, text) {
        const messagesContainer = document.getElementById('chatbot-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(text)}</div>
            <div class="message-time">${time}</div>
        `;
        
        messagesContainer.appendChild(messageDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        this.messages.push({ sender, text, time });
    }

    sendMessage() {
        const input = document.getElementById('chatbot-input');
        const message = input.value.trim();
        
        if (!message) return;
        
        this.addMessage('user', message);
        input.value = '';
        
        // Simulate typing delay
        setTimeout(() => {
            const response = this.getResponse(message);
            this.addMessage('bot', response);
        }, 500);
    }

    getResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Detection questions
        if (lowerMessage.includes('detect') || lowerMessage.includes('detection')) {
            if (lowerMessage.includes('live') || lowerMessage.includes('webcam') || lowerMessage.includes('camera')) {
                return 'To use live detection, go to the Detection page and click "Start Webcam". The system will detect objects in real-time. You can capture images by clicking the capture button.';
            }
            if (lowerMessage.includes('image') || lowerMessage.includes('photo')) {
                return 'To detect objects in an image, go to the Detection page, click "Choose File" under Image Detection, select your image, and click "Detect Objects".';
            }
            if (lowerMessage.includes('video')) {
                return 'To detect objects in a video, go to the Detection page, click "Choose File" under Video Detection, select your video file, and click "Detect Video". The processed video will be available in your history.';
            }
            return 'You can detect objects in images, videos, or live webcam feed. Go to the Detection page to get started.';
        }
        
        // History questions
        if (lowerMessage.includes('history') || lowerMessage.includes('past') || lowerMessage.includes('previous')) {
            return 'You can view all your detection history by clicking on "History" in the sidebar. This includes images, videos, and captured live images.';
        }
        
        // Capture questions
        if (lowerMessage.includes('capture') || lowerMessage.includes('save') || lowerMessage.includes('image')) {
            if (lowerMessage.includes('live') || lowerMessage.includes('webcam')) {
                return 'To capture an image from live detection, start the webcam, and click the "Capture" button. The captured image will be saved and appear in your history.';
            }
            return 'Captured images from live detection are automatically saved and can be viewed in the History section.';
        }
        
        // Limit questions
        if (lowerMessage.includes('limit') || lowerMessage.includes('quota') || lowerMessage.includes('free') || lowerMessage.includes('subscription')) {
            return 'Free accounts have a limit of 10 detections. You can upgrade to Pro for unlimited detections. Check the Subscription page for more details.';
        }
        
        // Account questions
        if (lowerMessage.includes('account') || lowerMessage.includes('settings') || lowerMessage.includes('profile')) {
            return 'You can manage your account settings, including theme, detection preferences, and data management, in the Account section.';
        }
        
        // Clear data questions
        if (lowerMessage.includes('clear') || lowerMessage.includes('delete') || lowerMessage.includes('remove')) {
            if (lowerMessage.includes('data') || lowerMessage.includes('history')) {
                return 'You can clear all your data (detection history, captured images, and reset detection count) from the Account section. Look for the "Clear All Data" button in the Data Management section.';
            }
        }
        
        // Help questions
        if (lowerMessage.includes('help') || lowerMessage.includes('how') || lowerMessage.includes('what')) {
            return 'I can help you with questions about detection, history, account settings, and more. Try asking about specific features!';
        }
        
        // Default response
        return 'I understand you\'re asking about: "' + message + '". Could you be more specific? I can help with detection features, history, account settings, limits, and more.';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize chatbot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new Chatbot();
});