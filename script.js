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
            // Try with user interaction
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
        
        // Background gradient
        const gradient = sampleCtx.createLinearGradient(0, 0, 600, 600);
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(0.5, '#0d0d0d');
        gradient.addColorStop(1, '#2a1a3e');
        sampleCtx.fillStyle = gradient;
        sampleCtx.fillRect(0, 0, 600, 600);
        
        // Gold border
        sampleCtx.strokeStyle = '#d4af37';
        sampleCtx.lineWidth = 8;
        sampleCtx.strokeRect(20, 20, 560, 560);
        
        // Gold corners
        for (let i = 0; i < 4; i++) {
            sampleCtx.beginPath();
            sampleCtx.moveTo(40 + i * 520, 40);
            sampleCtx.lineTo(80 + i * 440, 40);
            sampleCtx.lineTo(40 + i * 520, 80);
            sampleCtx.fillStyle = '#d4af37';
            sampleCtx.fill();
        }
        
        // Stars
        for (let i = 0; i < 50; i++) {
            sampleCtx.beginPath();
            sampleCtx.arc(30 + Math.random() * 540, 30 + Math.random() * 540, Math.random() * 2 + 1, 0, Math.PI * 2);
            sampleCtx.fillStyle = `rgba(212, 175, 55, ${Math.random() * 0.5 + 0.3})`;
            sampleCtx.fill();
        }
        
        // Main text
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
        
        // Decorative line
        sampleCtx.beginPath();
        sampleCtx.moveTo(150, 420);
        sampleCtx.lineTo(450, 420);
        sampleCtx.strokeStyle = '#d4af37';
        sampleCtx.lineWidth = 2;
        sampleCtx.stroke();
        
        // Balloons
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
    
    // ---------- SHUFFLE ARRAY ----------
    function shuffleArray(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    // ---------- INITIALIZE GAME ----------
    function initGame() {
        board = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
        remainingPieces = shuffleArray([...pieceImages]);
        renderPiecesContainer();
        drawBoard();
        updateGameStatus();
        stopVictoryMusic(); // Ensure music is stopped at start
    }
    
    // ---------- RENDER PIECES BELOW PUZZLE ----------
    function renderPiecesContainer() {
        piecesGrid.innerHTML = '';
        
        remainingPieces.forEach((piece, index) => {
            const pieceDiv = document.createElement('div');
            pieceDiv.className = 'piece-item';
            pieceDiv.setAttribute('draggable', 'true');
            pieceDiv.setAttribute('data-index', index);
            pieceDiv.setAttribute('data-row', piece.correctRow);
            pieceDiv.setAttribute('data-col', piece.correctCol);
            
            // Add the piece image
            const pieceCanvas = document.createElement('canvas');
            const size = Math.min(80, pieceWidth);
            pieceCanvas.width = size;
            pieceCanvas.height = size;
            const pieceCtx = pieceCanvas.getContext('2d');
            pieceCtx.drawImage(piece.canvas, 0, 0, size, size);
            pieceDiv.appendChild(pieceCanvas);
            
            // Drag start
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
    
    // ---------- DRAW THE PUZZLE BOARD ----------
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
                    // Empty slot
                    ctx.fillStyle = '#1e1e1e';
                    ctx.fillRect(x, y, pieceWidth, pieceHeight);
                    ctx.fillStyle = '#d4af37';
                    ctx.font = `${pieceWidth * 0.25}px "Segoe UI"`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText("⬚", x + pieceWidth/2, y + pieceHeight/2);
                }
                
                // Grid lines
                ctx.strokeStyle = 'rgba(212, 175, 55, 0.5)';
                ctx.lineWidth = 1;
                ctx.strokeRect(x, y, pieceWidth, pieceHeight);
            }
        }
        
        // Outer grid
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
    
    // ---------- HANDLE DROP ON CANVAS ----------
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
                    // Place the piece
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
    
    // ---------- CHECK IF PUZZLE IS SOLVED ----------
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
                playVictoryMusic();  // <-- MUSIC PLAYS WHEN PUZZLE IS SOLVED!
            }
        } else {
            gameStatusSpan.textContent = `${remainingPieces.length} pieces left`;
            gameStatusSpan.style.color = '#f0f0f0';
        }
    }
    
    // ---------- CELEBRATION ----------
    function showBirthdayCelebration() {
        birthdayOverlay.classList.remove('hidden');
        createConfetti();
    }
    
    function hideBirthdayCelebration() {
        birthdayOverlay.classList.add('hidden');
        stopVictoryMusic(); // Stop music when closing celebration
    }
    
    function createConfetti() {
        for (let i = 0; i < 150; i++) {
            const conf = document.createElement('div');
            conf.style.position = 'fixed';
            conf.style.width = Math.random() * 8 + 4 + 'px';
            conf.style.height = Math.random() * 12 + 6 + 'px';
            conf.style.background = `hsl(${Math.random() * 60 + 40}, 80%, 55%)`;
            conf.style.left = Math.random() * window.innerWidth + 'px';
            conf.style.top = '-20px';
            conf.style.pointerEvents = 'none';
            conf.style.zIndex = '1001';
            conf.style.borderRadius = '2px';
            document.body.appendChild(conf);
            
            let fallInterval = setInterval(() => {
                let top = parseFloat(conf.style.top);
                if (top > window.innerHeight + 50) {
                    clearInterval(fallInterval);
                    conf.remove();
                } else {
                    conf.style.top = top + 5 + Math.random() * 6 + 'px';
                    conf.style.left = parseFloat(conf.style.left) + (Math.random() - 0.5) * 3 + 'px';
                }
            }, 25);
            setTimeout(() => {
                clearInterval(fallInterval);
                if (conf) conf.remove();
            }, 4000);
        }
    }
    
    // ---------- EVENT LISTENERS ----------
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
    
    // ---------- LOAD IMAGE ----------
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