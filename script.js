(function() {
    // ---------- CONFIGURATION ----------
    const GRID_SIZE = 4;          // 4x4 = 16 pieces
    const TOTAL_PIECES = GRID_SIZE * GRID_SIZE;
    
    // DOM Elements
    const canvas = document.getElementById('puzzleCanvas');
    const ctx = canvas.getContext('2d');
    const gameStatusSpan = document.getElementById('gameStatus');
    const birthdayOverlay = document.getElementById('birthdayOverlay');
    const piecesGrid = document.getElementById('piecesGrid');
    
    // Remove buttons - hide them
    const shuffleBtn = document.getElementById('shuffleBtn');
    const resetBtn = document.getElementById('resetBtn');
    if (shuffleBtn) shuffleBtn.style.display = 'none';
    if (resetBtn) resetBtn.style.display = 'none';
    
    // Puzzle State
    let board = [];
    let pieceImages = [];
    let pieceWidth = 0, pieceHeight = 0;
    let img = new Image();
    let isImageLoaded = false;
    let remainingPieces = [];
    
    // Drag state
    let draggedPieceData = null;
    
    // Music - Will play ONLY when puzzle is solved
    let bgMusic = null;
    let musicPlayed = false;
    
    // Fireworks animation variables
    let fireworks = [];
    let particles = [];
    let animationId = null;
    let fireworksActive = false;
    let fireworkInterval = null;
    
    // ---------- FUNCTION TO PLAY MUSIC ON WIN ----------
    function playVictoryMusic() {
        if (musicPlayed) return;
        
        bgMusic = new Audio('music/birthday-song.mp3');
        bgMusic.loop = true;
        bgMusic.volume = 0.4;
        
        bgMusic.play().then(() => {
            musicPlayed = true;
            console.log('Victory music playing!');
        }).catch(error => {
            console.log('Music play failed:', error);
            const playOnClick = () => {
                bgMusic.play();
                document.removeEventListener('click', playOnClick);
                document.removeEventListener('touchstart', playOnClick);
            };
            document.addEventListener('click', playOnClick);
            document.addEventListener('touchstart', playOnClick);
        });
    }
    
    function stopVictoryMusic() {
        if (bgMusic) {
            bgMusic.pause();
            bgMusic.currentTime = 0;
            musicPlayed = false;
        }
    }
    
    // ---------- REAL FIREWORKS SYSTEM ----------
    class Firework {
        constructor(x, y, targetX, targetY, color) {
            this.x = x;
            this.y = y;
            this.targetX = targetX;
            this.targetY = targetY;
            this.speed = 8;
            this.velX = (targetX - x) / 30;
            this.velY = (targetY - y) / 30;
            this.size = 4;
            this.color = color || `hsl(${Math.random() * 360}, 100%, 60%)`;
            this.trail = [];
            this.alive = true;
            this.exploded = false;
        }
        
        update() {
            this.trail.push({ x: this.x, y: this.y, size: this.size });
            if (this.trail.length > 8) this.trail.shift();
            
            this.x += this.velX;
            this.y += this.velY;
            
            const dx = this.x - this.targetX;
            const dy = this.y - this.targetY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 15 && !this.exploded) {
                this.alive = false;
                this.explode();
                return false;
            }
            return true;
        }
        
        explode() {
            this.exploded = true;
            const particleCount = 60 + Math.floor(Math.random() * 40);
            const explosionColors = [
                `hsl(${Math.random() * 60 + 30}, 100%, 55%)`, // Gold/Yellow
                `hsl(${Math.random() * 360}, 100%, 60%)`,      // Random bright
                `hsl(${Math.random() * 60 + 30}, 100%, 65%)`,  // Warm colors
                '#ff4444', '#ffcc00', '#ff6600', '#ff00ff', '#00ffcc', '#ff3366'
            ];
            
            for (let i = 0; i < particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 8;
                const velocityX = Math.cos(angle) * speed;
                const velocityY = Math.sin(angle) * speed;
                const particleColor = explosionColors[Math.floor(Math.random() * explosionColors.length)];
                
                particles.push(new Particle(
                    this.targetX, this.targetY,
                    velocityX, velocityY,
                    particleColor,
                    Math.random() * 0.5 + 0.5
                ));
            }
            
            // Add a second smaller burst
            setTimeout(() => {
                for (let i = 0; i < 30; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const speed = 1 + Math.random() * 5;
                    const velocityX = Math.cos(angle) * speed;
                    const velocityY = Math.sin(angle) * speed;
                    particles.push(new Particle(
                        this.targetX, this.targetY,
                        velocityX, velocityY,
                        '#ffcc00',
                        0.7
                    ));
                }
            }, 50);
        }
        
        draw(ctx) {
            // Draw trail
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const alpha = (i / this.trail.length) * 0.6;
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.size * 0.8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 50, ${alpha})`;
                ctx.fill();
            }
            
            // Draw rocket head
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();
            
            // Add glow effect
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 50, 0.3)`;
            ctx.fill();
        }
    }
    
    class Particle {
        constructor(x, y, vx, vy, color, size = 1) {
            this.x = x;
            this.y = y;
            this.vx = vx;
            this.vy = vy;
            this.gravity = 0.2;
            this.alpha = 1;
            this.size = 2 + Math.random() * 3;
            this.color = color;
            this.trail = [];
            this.rotation = Math.random() * Math.PI * 2;
            this.spin = (Math.random() - 0.5) * 0.2;
        }
        
        update() {
            this.trail.push({ x: this.x, y: this.y, size: this.size });
            if (this.trail.length > 4) this.trail.shift();
            
            this.vx *= 0.99;
            this.vy += this.gravity;
            this.vx += (Math.random() - 0.5) * 0.15;
            this.vy += (Math.random() - 0.5) * 0.1;
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= 0.012;
            this.size *= 0.98;
            this.rotation += this.spin;
            
            return this.alpha > 0.02 && this.size > 0.3;
        }
        
        draw(ctx) {
            // Draw trail
            for (let i = 0; i < this.trail.length; i++) {
                const t = this.trail[i];
                const trailAlpha = this.alpha * 0.5 * (i / this.trail.length);
                ctx.beginPath();
                ctx.arc(t.x, t.y, t.size * 0.7, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 200, 50, ${trailAlpha})`;
                ctx.fill();
            }
            
            // Draw particle with rotation effect
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.rotation);
            ctx.beginPath();
            ctx.rect(-this.size/2, -this.size/2, this.size, this.size);
            ctx.fillStyle = this.color;
            ctx.fill();
            
            // Add sparkle
            ctx.beginPath();
            ctx.rect(-this.size/4, -this.size/4, this.size/2, this.size/2);
            ctx.fillStyle = `rgba(255, 255, 200, ${this.alpha * 0.8})`;
            ctx.fill();
            ctx.restore();
            
            // Outer glow
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size * 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${this.alpha * 0.2})`;
            ctx.fill();
        }
    }
    
    // Create fireworks from both sides
    function createFireworkFromSide(side) {
        let startX, startY;
        const targetX = 100 + Math.random() * (window.innerWidth - 200);
        const targetY = 100 + Math.random() * (window.innerHeight * 0.6);
        
        if (side === 'left') {
            startX = -50;
            startY = window.innerHeight - 50 + Math.random() * 100;
        } else {
            startX = window.innerWidth + 50;
            startY = window.innerHeight - 50 + Math.random() * 100;
        }
        
        const colors = [
            `hsl(${Math.random() * 60 + 30}, 100%, 55%)`, // Gold range
            `hsl(${Math.random() * 360}, 100%, 60%)`,
            '#ffcc00', '#ff6600', '#ff3366', '#ff00cc', '#00ffcc'
        ];
        
        const color = colors[Math.floor(Math.random() * colors.length)];
        return new Firework(startX, startY, targetX, targetY, color);
    }
    
    function createDoubleFireworks() {
        // Create fireworks from both sides simultaneously
        const leftFirework = createFireworkFromSide('left');
        const rightFirework = createFireworkFromSide('right');
        fireworks.push(leftFirework, rightFirework);
        
        // Add a few more random ones
        setTimeout(() => {
            if (fireworksActive) {
                const extra1 = createFireworkFromSide(Math.random() > 0.5 ? 'left' : 'right');
                const extra2 = createFireworkFromSide(Math.random() > 0.5 ? 'left' : 'right');
                fireworks.push(extra1, extra2);
            }
        }, 100);
    }
    
    function createFireworkBarrage() {
        // Massive barrage of fireworks for the initial celebration
        for (let i = 0; i < 8; i++) {
            setTimeout(() => {
                if (fireworksActive) {
                    const leftFw = createFireworkFromSide('left');
                    const rightFw = createFireworkFromSide('right');
                    fireworks.push(leftFw, rightFw);
                }
            }, i * 150);
        }
        
        // Add a second wave
        setTimeout(() => {
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    if (fireworksActive) {
                        const side = Math.random() > 0.5 ? 'left' : 'right';
                        fireworks.push(createFireworkFromSide(side));
                    }
                }, i * 200);
            }
        }, 1500);
        
        // Third wave
        setTimeout(() => {
            for (let i = 0; i < 4; i++) {
                setTimeout(() => {
                    if (fireworksActive) {
                        fireworks.push(createFireworkFromSide('left'));
                        fireworks.push(createFireworkFromSide('right'));
                    }
                }, i * 300);
            }
        }, 3500);
    }
    
    function animateFireworks() {
        if (!fireworksActive) {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            return;
        }
        
        // Create or get fireworks canvas
        let fireCanvas = document.getElementById('fireworksCanvas');
        if (!fireCanvas) {
            fireCanvas = document.createElement('canvas');
            fireCanvas.id = 'fireworksCanvas';
            fireCanvas.style.position = 'fixed';
            fireCanvas.style.top = '0';
            fireCanvas.style.left = '0';
            fireCanvas.style.width = '100%';
            fireCanvas.style.height = '100%';
            fireCanvas.style.pointerEvents = 'none';
            fireCanvas.style.zIndex = '1001';
            document.body.appendChild(fireCanvas);
        }
        
        fireCanvas.width = window.innerWidth;
        fireCanvas.height = window.innerHeight;
        const fireCtx = fireCanvas.getContext('2d');
        
        // Clear with fade effect for trail
        fireCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        fireCtx.fillRect(0, 0, fireCanvas.width, fireCanvas.height);
        
        // Update and draw fireworks
        for (let i = fireworks.length - 1; i >= 0; i--) {
            const alive = fireworks[i].update();
            fireworks[i].draw(fireCtx);
            if (!alive) {
                fireworks.splice(i, 1);
            }
        }
        
        // Update and draw particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const alive = particles[i].update();
            particles[i].draw(fireCtx);
            if (!alive) {
                particles.splice(i, 1);
            }
        }
        
        // Continue animation
        if (fireworks.length > 0 || particles.length > 0 || fireworksActive) {
            animationId = requestAnimationFrame(animateFireworks);
        } else {
            if (animationId) {
                cancelAnimationFrame(animationId);
                animationId = null;
            }
            const canvas = document.getElementById('fireworksCanvas');
            if (canvas) canvas.remove();
        }
    }
    
    function startFireworks() {
        if (fireworksActive) return;
        
        fireworksActive = true;
        fireworks = [];
        particles = [];
        
        // Start the animation loop
        animateFireworks();
        
        // Initial massive barrage
        createFireworkBarrage();
        
        // Continuous fireworks every 1.5 seconds for 15 seconds
        let barrageCount = 0;
        fireworkInterval = setInterval(() => {
            if (!fireworksActive) {
                clearInterval(fireworkInterval);
                return;
            }
            
            if (barrageCount < 12) {
                // Create 2-4 fireworks every interval
                const count = 2 + Math.floor(Math.random() * 3);
                for (let i = 0; i < count; i++) {
                    setTimeout(() => {
                        if (fireworksActive) {
                            const side = Math.random() > 0.5 ? 'left' : 'right';
                            fireworks.push(createFireworkFromSide(side));
                        }
                    }, i * 150);
                }
                barrageCount++;
            } else {
                clearInterval(fireworkInterval);
            }
        }, 1500);
        
        // Grand finale after 10 seconds
        setTimeout(() => {
            if (fireworksActive) {
                // Massive finale burst
                for (let i = 0; i < 12; i++) {
                    setTimeout(() => {
                        if (fireworksActive) {
                            fireworks.push(createFireworkFromSide('left'));
                            fireworks.push(createFireworkFromSide('right'));
                        }
                    }, i * 100);
                }
            }
        }, 10000);
        
        // Stop fireworks after 14 seconds
        setTimeout(() => {
            fireworksActive = false;
            if (fireworkInterval) clearInterval(fireworkInterval);
            setTimeout(() => {
                if (fireworks.length === 0 && particles.length === 0 && animationId) {
                    cancelAnimationFrame(animationId);
                    animationId = null;
                    const fireCanvas = document.getElementById('fireworksCanvas');
                    if (fireCanvas) fireCanvas.remove();
                }
            }, 4000);
        }, 14000);
    }
    
    // ---------- PREVENT PAGE SCROLL ON DRAG ----------
    document.addEventListener('dragstart', function(e) {
        e.dataTransfer.setData('text/plain', '');
        e.dataTransfer.effectAllowed = 'copy';
    });
    
    // ---------- CREATE SAMPLE IMAGE ----------
    function createSampleImage() {
        console.log('Creating sample birthday image...');
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = 600;
        sampleCanvas.height = 600;
        const sampleCtx = sampleCanvas.getContext('2d');
        
        const gradient = sampleCtx.createLinearGradient(0, 0, 600, 600);
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(0.5, '#0d0d0d');
        gradient.addColorStop(1, '#2a1a3e');
        sampleCtx.fillStyle = gradient;
        sampleCtx.fillRect(0, 0, 600, 600);
        
        sampleCtx.strokeStyle = '#d4af37';
        sampleCtx.lineWidth = 8;
        sampleCtx.strokeRect(20, 20, 560, 560);
        
        for (let i = 0; i < 4; i++) {
            sampleCtx.beginPath();
            sampleCtx.moveTo(40 + i * 520, 40);
            sampleCtx.lineTo(80 + i * 440, 40);
            sampleCtx.lineTo(40 + i * 520, 80);
            sampleCtx.fillStyle = '#d4af37';
            sampleCtx.fill();
        }
        
        for (let i = 0; i < 50; i++) {
            sampleCtx.beginPath();
            sampleCtx.arc(30 + Math.random() * 540, 30 + Math.random() * 540, Math.random() * 2 + 1, 0, Math.PI * 2);
            sampleCtx.fillStyle = `rgba(212, 175, 55, ${Math.random() * 0.5 + 0.3})`;
            sampleCtx.fill();
        }
        
        sampleCtx.font = 'Bold 48px "Cormorant Garamond", serif';
        sampleCtx.fillStyle = '#d4af37';
        sampleCtx.textAlign = 'center';
        sampleCtx.fillText('HAPPY', 300, 200);
        
        sampleCtx.font = 'Bold 72px "Cormorant Garamond", serif';
        sampleCtx.fillStyle = '#f9e281';
        sampleCtx.fillText('BIRTHDAY', 300, 290);
        
        sampleCtx.font = '36px "Cormorant Garamond", serif';
        sampleCtx.fillStyle = '#d4af37';
        sampleCtx.fillText('TO YOU!', 300, 370);
        
        sampleCtx.beginPath();
        sampleCtx.moveTo(150, 420);
        sampleCtx.lineTo(450, 420);
        sampleCtx.strokeStyle = '#d4af37';
        sampleCtx.lineWidth = 2;
        sampleCtx.stroke();
        
        const balloonColors = ['#d4af37', '#ff6b6b', '#4ecdc4', '#ffe66d', '#ff6b6b'];
        for (let i = 0; i < 6; i++) {
            sampleCtx.beginPath();
            sampleCtx.ellipse(120 + i * 80, 500, 25, 35, 0, 0, Math.PI * 2);
            sampleCtx.fillStyle = balloonColors[i % balloonColors.length];
            sampleCtx.fill();
            sampleCtx.beginPath();
            sampleCtx.moveTo(120 + i * 80, 535);
            sampleCtx.lineTo(115 + i * 80, 560);
            sampleCtx.lineTo(125 + i * 80, 560);
            sampleCtx.fillStyle = '#888';
            sampleCtx.fill();
        }
        
        const sampleImg = new Image();
        sampleImg.src = sampleCanvas.toDataURL();
        return sampleImg;
    }
    
    // ---------- SPLIT IMAGE INTO 16 PIECES ----------
    function splitImageIntoPieces() {
        pieceImages = [];
        pieceWidth = img.width / GRID_SIZE;
        pieceHeight = img.height / GRID_SIZE;
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const pieceCanvas = document.createElement('canvas');
                pieceCanvas.width = pieceWidth;
                pieceCanvas.height = pieceHeight;
                const pieceCtx = pieceCanvas.getContext('2d');
                
                pieceCtx.drawImage(
                    img,
                    col * pieceWidth, row * pieceHeight, pieceWidth, pieceHeight,
                    0, 0, pieceWidth, pieceHeight
                );
                
                pieceImages.push({
                    canvas: pieceCanvas,
                    correctRow: row,
                    correctCol: col,
                    id: row * GRID_SIZE + col
                });
            }
        }
        
        console.log('Image split into 16 pieces!');
        initGame();
    }
    
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    function initGame() {
        board = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
        remainingPieces = shuffleArray([...pieceImages]);
        renderPiecesContainer();
        drawBoard();
        updateGameStatus();
        stopVictoryMusic();
    }
    
    function renderPiecesContainer() {
        piecesGrid.innerHTML = '';
        
        remainingPieces.forEach((piece, index) => {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = 'piece-item';
            pieceDiv.setAttribute('draggable', 'true');
            pieceDiv.setAttribute('data-index', index);
            pieceDiv.setAttribute('data-row', piece.correctRow);
            pieceDiv.setAttribute('data-col', piece.correctCol);
            
            const pieceCanvas = document.createElement('canvas');
            const size = Math.min(80, pieceWidth);
            pieceCanvas.width = size;
            pieceCanvas.height = size;
            const pieceCtx = pieceCanvas.getContext('2d');
            pieceCtx.drawImage(piece.canvas, 0, 0, size, size);
            pieceDiv.appendChild(pieceCanvas);
            
            pieceDiv.addEventListener('dragstart', function(e) {
                e.stopPropagation();
                draggedPieceData = {
                    index: index,
                    piece: piece
                };
                e.dataTransfer.setData('text/plain', JSON.stringify({
                    index: index,
                    correctRow: piece.correctRow,
                    correctCol: piece.correctCol
                }));
                e.dataTransfer.effectAllowed = 'copy';
                this.style.opacity = '0.5';
            });
            
            pieceDiv.addEventListener('dragend', function(e) {
                this.style.opacity = '1';
                draggedPieceData = null;
                canvas.classList.remove('drag-over');
            });
            
            piecesGrid.appendChild(pieceDiv);
        });
    }
    
    function drawBoard() {
        if (!isImageLoaded) {
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#d4af37';
            ctx.font = '14px Montserrat';
            ctx.textAlign = 'center';
            ctx.fillText('Loading image...', canvas.width/2, canvas.height/2);
            return;
        }
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                const piece = board[row][col];
                const x = col * pieceWidth;
                const y = row * pieceHeight;
                
                if (piece) {
                    ctx.drawImage(piece.canvas, x, y, pieceWidth, pieceHeight);
                } else {
                    ctx.fillStyle = '#1e1e1e';
                    ctx.fillRect(x, y, pieceWidth, pieceHeight);
                    ctx.fillStyle = '#d4af37';
                    ctx.font = `${pieceWidth * 0.25}px "Segoe UI"`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText("⬚", x + pieceWidth/2, y + pieceHeight/2);
                }
                
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, pieceWidth, pieceHeight);
            }
        }
        
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#d4af37';
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.moveTo(i * pieceWidth, 0);
            ctx.lineTo(i * pieceWidth, canvas.height);
            ctx.moveTo(0, i * pieceHeight);
            ctx.lineTo(canvas.width, i * pieceHeight);
            ctx.stroke();
        }
    }
    
    function handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        canvas.classList.remove('drag-over');
        
        let pieceData = draggedPieceData;
        
        if (!pieceData) {
            const rawData = e.dataTransfer.getData('text/plain');
            if (rawData) {
                const parsed = JSON.parse(rawData);
                if (parsed && remainingPieces[parsed.index]) {
                    pieceData = {
                        index: parsed.index,
                        piece: remainingPieces[parsed.index]
                    };
                }
            }
        }
        
        if (!pieceData || !pieceData.piece) return;
        
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        let dropX = (e.clientX - rect.left) * scaleX;
        let dropY = (e.clientY - rect.top) * scaleY;
        
        if (dropX < 0 || dropY < 0) return;
        
        const col = Math.floor(dropX / pieceWidth);
        const row = Math.floor(dropY / pieceHeight);
        
        if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
            if (board[row][col] === null) {
                if (pieceData.piece.correctRow === row && pieceData.piece.correctCol === col) {
                    board[row][col] = pieceData.piece;
                    remainingPieces.splice(pieceData.index, 1);
                    
                    renderPiecesContainer();
                    drawBoard();
                    updateGameStatus();
                } else {
                    canvas.style.boxShadow = '0 0 0 3px rgba(255, 0, 0, 0.5)';
                    setTimeout(() => { canvas.style.boxShadow = ''; }, 300);
                }
            } else {
                canvas.style.boxShadow = '0 0 0 3px rgba(255, 165, 0, 0.5)';
                setTimeout(() => { canvas.style.boxShadow = ''; }, 300);
            }
        }
        
        draggedPieceData = null;
        return false;
    }
    
    function handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'copy';
        canvas.classList.add('drag-over');
        return false;
    }
    
    function handleDragEnter(e) {
        e.preventDefault();
        return false;
    }
    
    function handleDragLeave(e) {
        canvas.classList.remove('drag-over');
    }
    
    function isSolved() {
        for (let row = 0; row < GRID_SIZE; row++) {
            for (let col = 0; col < GRID_SIZE; col++) {
                if (board[row][col] === null) return false;
                if (board[row][col].correctRow !== row || board[row][col].correctCol !== col) return false;
            }
        }
        return true;
    }
    
    function updateGameStatus() {
        if (isSolved()) {
            gameStatusSpan.textContent = 'SOLVED! ✦';
            gameStatusSpan.style.color = '#d4af37';
            if (birthdayOverlay.classList.contains('hidden')) {
                showBirthdayCelebration();
                playVictoryMusic();
                startFireworks();  // START THE REAL FIREWORKS!
            }
        } else {
            gameStatusSpan.textContent = `${remainingPieces.length} pieces left`;
            gameStatusSpan.style.color = '#f0f0f0';
        }
    }
    
    function showBirthdayCelebration() {
        birthdayOverlay.classList.remove('hidden');
    }
    
    function hideBirthdayCelebration() {
        birthdayOverlay.classList.add('hidden');
        stopVictoryMusic();
        fireworksActive = false;
        if (fireworkInterval) clearInterval(fireworkInterval);
        const fireCanvas = document.getElementById('fireworksCanvas');
        if (fireCanvas) fireCanvas.remove();
    }
    
    // Handle window resize
    window.addEventListener('resize', () => {
        const fireCanvas = document.getElementById('fireworksCanvas');
        if (fireCanvas) {
            fireCanvas.width = window.innerWidth;
            fireCanvas.height = window.innerHeight;
        }
    });
    
    // EVENT LISTENERS
    canvas.addEventListener('dragover', handleDragOver);
    canvas.addEventListener('dragenter', handleDragEnter);
    canvas.addEventListener('dragleave', handleDragLeave);
    canvas.addEventListener('drop', handleDrop);
    
    document.body.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    document.body.addEventListener('drop', function(e) {
        e.preventDefault();
    });
    
    birthdayOverlay.addEventListener('click', (e) => {
        if (e.target === birthdayOverlay || e.target.classList.contains('close-celebration')) {
            hideBirthdayCelebration();
        }
    });
    
    function loadImage() {
        const imagePath = 'images/puzzle-image.jpg';
        
        img.onload = () => {
            console.log('Image loaded!');
            isImageLoaded = true;
            canvas.width = img.width;
            canvas.height = img.height;
            splitImageIntoPieces();
        };
        
        img.onerror = () => {
            console.log('No external image found. Creating sample birthday image...');
            const sampleImg = createSampleImage();
            sampleImg.onload = () => {
                img = sampleImg;
                isImageLoaded = true;
                canvas.width = img.width;
                canvas.height = img.height;
                splitImageIntoPieces();
            };
        };
        
        img.src = imagePath + '?t=' + Date.now();
    }
    
    canvas.width = 400;
    canvas.height = 400;
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#d4af37';
    ctx.font = '14px Montserrat';
    ctx.textAlign = 'center';
    ctx.fillText('Loading puzzle...', 200, 200);
    
    loadImage();
})();