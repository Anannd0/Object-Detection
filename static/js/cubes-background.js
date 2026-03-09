// Cubes Background Animation - Grid Pattern with Cursor Reactive
// Based on https://reactbits.dev/animations/cubes

class CubesBackground {
    constructor() {
        this.container = document.querySelector('.cubes-container');
        this.cubes = [];
        this.mouseX = window.innerWidth / 2;
        this.mouseY = window.innerHeight / 2;
        this.targetMouseX = this.mouseX;
        this.targetMouseY = this.mouseY;
        this.gridCols = 12;
        this.gridRows = 8;
        this.cubeSpacing = 0;
        this.init();
    }
    
    init() {
        if (!this.container) return;
        
        // Calculate grid spacing
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        this.cubeSpacing = Math.min(
            containerWidth / (this.gridCols + 1),
            containerHeight / (this.gridRows + 1)
        );
        
        // Create cubes in grid pattern
        let cubeIndex = 0;
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const cube = document.createElement('div');
                cube.className = 'cube';
                this.container.appendChild(cube);
                
                // Calculate grid position
                const baseX = (col + 1) * (containerWidth / (this.gridCols + 1));
                const baseY = (row + 1) * (containerHeight / (this.gridRows + 1));
                
                this.cubes.push({
                    element: cube,
                    baseX: baseX,
                    baseY: baseY,
                    currentX: baseX,
                    currentY: baseY,
                    gridCol: col,
                    gridRow: row,
                    speed: 0.2 + Math.random() * 0.3,
                    rotation: Math.random() * 360,
                    rotationSpeed: 5 + Math.random() * 15
                });
                cubeIndex++;
            }
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        // Track mouse movement with smooth interpolation
        document.addEventListener('mousemove', (e) => {
            this.targetMouseX = e.clientX;
            this.targetMouseY = e.clientY;
        });
        
        // Animate cubes
        this.animate();
    }
    
    handleResize() {
        const containerWidth = window.innerWidth;
        const containerHeight = window.innerHeight;
        this.cubeSpacing = Math.min(
            containerWidth / (this.gridCols + 1),
            containerHeight / (this.gridRows + 1)
        );
        
        this.cubes.forEach((cube) => {
            cube.baseX = (cube.gridCol + 1) * (containerWidth / (this.gridCols + 1));
            cube.baseY = (cube.gridRow + 1) * (containerHeight / (this.gridRows + 1));
        });
    }
    
    animate() {
        // Smooth mouse position interpolation
        this.mouseX += (this.targetMouseX - this.mouseX) * 0.1;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.1;
        
        this.cubes.forEach((cube, index) => {
            const element = cube.element;
            const time = Date.now() * 0.001;
            
            // Calculate distance from cursor
            const dx = this.mouseX - cube.baseX;
            const dy = this.mouseY - cube.baseY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const maxDistance = 250;
            
            // Calculate cursor influence (stronger when closer)
            const influence = Math.max(0, 1 - distance / maxDistance);
            const cursorInfluenceX = dx * influence * 0.6;
            const cursorInfluenceY = dy * influence * 0.6;
            
            // Subtle floating animation
            const floatX = Math.sin(time * cube.speed + cube.gridCol) * 8;
            const floatY = Math.cos(time * cube.speed + cube.gridRow) * 8;
            
            // Smooth position interpolation back to grid position
            cube.currentX += (cube.baseX + floatX + cursorInfluenceX - cube.currentX) * 0.15;
            cube.currentY += (cube.baseY + floatY + cursorInfluenceY - cube.currentY) * 0.15;
            
            // Calculate rotation with cursor influence
            const rotation = cube.rotation + time * cube.rotationSpeed + influence * 40;
            
            // Calculate scale based on cursor distance
            const scale = 1 + influence * 2;
            
            // Calculate opacity based on distance
            const opacity = 0.15 + influence * 0.7;
            
            // Apply transforms
            element.style.left = `${cube.currentX}px`;
            element.style.top = `${cube.currentY}px`;
            element.style.transform = `translate(-50%, -50%) rotate(${rotation}deg) scale(${scale})`;
            element.style.opacity = opacity;
        });
        
        requestAnimationFrame(() => this.animate());
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    new CubesBackground();
});
