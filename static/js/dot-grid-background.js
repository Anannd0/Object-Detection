// Interactive Dot Grid Background
// Makes the dot-grid reactive to mouse/touch movement
// Based on: https://reactbits.dev/backgrounds/dot-grid

(function() {
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;
    let animationFrame = null;

    // Create canvas for interactive dots
    function createInteractiveBackground() {
        const canvas = document.createElement('canvas');
        canvas.id = 'dot-grid-canvas';
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '0';
        document.body.appendChild(canvas);

        const ctx = canvas.getContext('2d');
        const dots = [];
        const dotSize = 2;
        const spacing = 30;
        const maxDistance = 120; // Maximum distance for interaction
        const baseColor = { r: 136, g: 224, b: 244 }; // Light blue dots (#88E0F4)
        const baseOpacity = 0.8;

        // Initialize dots grid
        function initDots() {
            dots.length = 0;
            const cols = Math.ceil(window.innerWidth / spacing) + 2;
            const rows = Math.ceil(window.innerHeight / spacing) + 2;

            for (let i = 0; i < rows; i++) {
                for (let j = 0; j < cols; j++) {
                    dots.push({
                        x: j * spacing,
                        y: i * spacing,
                        baseX: j * spacing,
                        baseY: i * spacing,
                        size: dotSize,
                        baseSize: dotSize,
                        opacity: baseOpacity,
                        baseOpacity: baseOpacity
                    });
                }
            }
        }

        // Update canvas size
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            initDots();
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Mouse/touch tracking
        function updateMousePosition(e) {
            if (e.touches && e.touches.length > 0) {
                targetX = e.touches[0].clientX;
                targetY = e.touches[0].clientY;
            } else {
                targetX = e.clientX;
                targetY = e.clientY;
            }
        }

        document.addEventListener('mousemove', updateMousePosition);
        document.addEventListener('touchmove', updateMousePosition);

        // Animation loop
        function animate() {
            // Smooth mouse position interpolation
            mouseX += (targetX - mouseX) * 0.1;
            mouseY += (targetY - mouseY) * 0.1;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            dots.forEach(dot => {
                const dx = dot.x - mouseX;
                const dy = dot.y - mouseY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < maxDistance) {
                    // Calculate interaction strength (0 to 1)
                    const strength = 1 - (distance / maxDistance);
                    
                    // Increase size and opacity when near cursor
                    dot.size = dot.baseSize + (strength * 4);
                    dot.opacity = Math.min(dot.baseOpacity + (strength * 0.4), 1);
                    
                    // Slight position shift towards cursor
                    const angle = Math.atan2(dy, dx);
                    const pushDistance = strength * 5;
                    dot.x = dot.baseX + Math.cos(angle) * pushDistance;
                    dot.y = dot.baseY + Math.sin(angle) * pushDistance;
                } else {
                    // Return to base state
                    dot.size += (dot.baseSize - dot.size) * 0.1;
                    dot.opacity += (dot.baseOpacity - dot.opacity) * 0.1;
                    dot.x += (dot.baseX - dot.x) * 0.1;
                    dot.y += (dot.baseY - dot.y) * 0.1;
                }

                // Draw dot
                ctx.beginPath();
                ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, ${Math.min(dot.opacity, 1)})`;
                ctx.fill();
            });

            animationFrame = requestAnimationFrame(animate);
        }

        animate();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createInteractiveBackground);
    } else {
        createInteractiveBackground();
    }

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
    });
})();

