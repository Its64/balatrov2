const config = {
    startScore: 200,
    winScore: 1000,
    colors: { positive: '#2e7d32', negative: '#c62828', neutral: '#616161', upgrade: '#fbc02d', debuff: '#9c27b0' }
};

let state = {
    score: config.startScore,
    spins: 0,
    isSpinning: false,
    currentRotation: 0,
    shieldActive: false,
    multiplierSpinsLeft: 0,
    doubledDebtActive: false, // New Debuff: Deductions are doubled
    slots: [],
    // Dynamic Shop Costs
    shopCosts: { add100: 100, add50: 50 } 
};

function insertAtRandomIndex(entry) {
    const randomIndex = Math.floor(Math.random() * (state.slots.length + 1));
    state.slots.splice(randomIndex, 0, entry);
}

// --- Score Animation Helper ---
function animateScoreChange(oldScore, newScore) {
    const scoreDisplay = document.getElementById('scoreDisplay');
    const difference = newScore - oldScore;
    
    // Add pop animation to the score number
    scoreDisplay.classList.remove('score-increase', 'score-decrease');
    void scoreDisplay.offsetWidth; // Trigger reflow to restart animation
    
    if (difference > 0) {
        scoreDisplay.classList.add('score-increase');
    } else if (difference < 0) {
        scoreDisplay.classList.add('score-decrease');
    }
    
    // Create floating text indicator
    const floatElement = document.createElement('div');
    floatElement.className = `score-float ${difference > 0 ? 'positive' : 'negative'}`;
    floatElement.textContent = (difference > 0 ? '+' : '') + difference;
    
    // Position it at the score display
    const scoreRect = scoreDisplay.getBoundingClientRect();
    floatElement.style.left = scoreRect.left + 'px';
    floatElement.style.top = scoreRect.top + 'px';
    
    document.body.appendChild(floatElement);
    
    // Remove the floating element after animation
    setTimeout(() => floatElement.remove(), 1000);
}

// --- Initial Wheel Setup ---
function initializeWheel() {
    state.slots = [
        { text: "+50", val: 50, type: "positive" },
        { text: "-25", val: -25, type: "negative" },
        { text: "+50", val: 50, type: "positive" },
        { text: "-25", val: -25, type: "negative" },
        { text: "+50", val: 50, type: "positive" },
        { text: "Debuff!", val: 0, type: "debuff", effect: "DOUBLED_DEBT" },
    ];
    drawWheel();
    updateUI();
}

// --- Wheel Rendering (Canvas) ---
function drawWheel() {
    const canvas = document.getElementById('wheelCanvas');
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX;
    
    const numSlices = state.slots.length;
    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < numSlices; i++) {
        const startAngle = i * sliceAngle;
        const endAngle = startAngle + sliceAngle;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, startAngle, endAngle);
        ctx.closePath();

        ctx.fillStyle = config.colors[state.slots[i].type];
        ctx.fill();
        ctx.lineWidth = 1; 
        ctx.strokeStyle = "#121212";
        ctx.stroke();

        // Draw Text
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "white";
        
        const fontSize = numSlices > 20 ? 12 : (numSlices > 15 ? 16 : 20);
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillText(state.slots[i].text, radius - 20, fontSize / 3);
        ctx.restore();
    }
}

// --- Core Game Logic ---
function spinWheel() {
    if (state.isSpinning || state.score <= 0) return;
    state.isSpinning = true;
    
    const oldScore = state.score;
    state.score -= 10
    animateScoreChange(oldScore, state.score);
    updateUI();

    const canvas = document.getElementById('wheelCanvas');
    const spins = Math.floor(Math.random() * 5) + 5; 
    const randomDegrees = Math.floor(Math.random() * 360);
    state.currentRotation += (spins * 360) + randomDegrees;

    canvas.style.transform = `rotate(${state.currentRotation}deg)`;

    setTimeout(() => {
        resolveSpin();
    }, 4000);
}

function resolveSpin() {
    state.spins++;
    const numSlices = state.slots.length;
    const normalizedRotation = state.currentRotation % 360;
    const sliceAngle = 360 / numSlices;
    
    let hitIndex = Math.floor((360 - normalizedRotation + 270) % 360 / sliceAngle);
    const result = state.slots[hitIndex];

    const oldScore = state.score;
    applyResult(result);
    animateScoreChange(oldScore, state.score);
    handlePostSpinChanges(); 
    
    if (state.multiplierSpinsLeft > 0) {
        state.multiplierSpinsLeft--;
    }

    state.isSpinning = false;
    updateUI();
    checkWinLoss();
}

function applyResult(result) {
    let logMsg = `Landed on ${result.text}! `;
    
    // Handle Debuffs
    if (result.type === "debuff") {
        if (result.effect === "DOUBLED_DEBT") {
            state.doubledDebtActive = true;
            logMsg += "Deductions now DOUBLED!";
        }
    }

    // Handle Score Changes
    if (result.val > 0) {
        let added = result.val * (state.multiplierSpinsLeft > 0 ? 2 : 1);
        state.score += added;
        logMsg += `(+${added})`;
    } 
    else if (result.val < 0) {
        if (state.shieldActive) {
            state.shieldActive = false;
            logMsg += "Shielded!";
        } else {
            let deduction = Math.abs(result.val) * (state.doubledDebtActive ? 2 : 1);
            state.score -= deduction;
            logMsg += `(-${deduction})`;
        }
    }
    document.getElementById('actionLog').innerText = logMsg;
}

function handlePostSpinChanges() {
    if (Math.random() > 0.5) {
        if (state.slots.length > 5 && Math.random() > 0.5) {
            const randomIndex = Math.floor(Math.random() * state.slots.length);
            if (state.slots[randomIndex].type == "positive" || state.slots[randomIndex].type == "debuff") {
                const removed = state.slots.splice(randomIndex, 1);
                document.getElementById('actionLog').innerText += ` (${removed[0].text} removed)`;
            }
            
        } else {
            // Decide between Bad Entry or Debuff Entry
            const isDebuff = Math.random() > 0.8;
            const entry = isDebuff 
                ? { text: "Debuff!", val: 0, type: "debuff", effect: "DOUBLED_DEBT" }
                : { text: "-50", val: -50, type: "negative" };
            insertAtRandomIndex(entry);
            document.getElementById('actionLog').innerText += " (New entry added)";
        }
        drawWheel();
    }
}

function addRandomBadEntry() {
    const badOptions = [
        { text: "-25", val: -25, type: "negative" },
        { text: "-50", val: -50, type: "negative" }
    ];
    const newEntry = badOptions[Math.floor(Math.random() * badOptions.length)];
    insertAtRandomIndex(newEntry);
    return "(Bad entry added)";
}

function removeRandomEntry() {
    const randomIndex = Math.floor(Math.random() * state.slots.length);
    if (state.slots[randomIndex].type == "positive") {
        const removedEntry = state.slots.splice(randomIndex, 1)[0];
        return `(${removedEntry.text} was removed)`;
    }
}

function checkWinLoss() {
    const restartBtn = document.getElementById('restartBtn');
    if (state.score <= 0) {
        state.score = 0;
        document.getElementById('actionLog').innerText = "Game Over! You ran out of points.";
        restartBtn.style.display = 'block'; // Show restart button
    } else if (state.score >= config.winScore) {
        document.getElementById('actionLog').innerText = "YOU WIN! Reached 1000 points!";
        restartBtn.style.display = 'block'; // Show restart button
    }
    restartBtn.addEventListener('click', (e) => {
        resetGame()
    })
}

// --- Shop Logic ---
const shopActions = {
    buyShield: () => { state.shieldActive = true; },
    buyCleanse: () => { state.doubledDebtActive = false; },
    addEntry100: () => { 
        insertAtRandomIndex({ text: "+100", val: 100, type: "upgrade" });
        state.shopCosts.add100 += 50;
        document.getElementById('add100btn').setAttribute("data-cost", String(state.shopCosts.add100))
        drawWheel();
    },
    addEntry50: () => { 
        insertAtRandomIndex({ text: "+50", val: 50, type: "positive" });
        state.shopCosts.add50 += 25;
        document.getElementById('add50btn').setAttribute("data-cost", String(state.shopCosts.add50))
        drawWheel();
    },
    buyMultiplier: () => { state.multiplierSpinsLeft += 3; },
    deleteNegative: () => {
        const negIndices = state.slots.map((s, i) => s.type === 'negative' || s.type === 'debuff' ? i : -1).filter(i => i !== -1);
        if (negIndices.length > 0) {
            const targetIndex = negIndices[Math.floor(Math.random() * negIndices.length)];
            state.slots.splice(targetIndex, 1);
            drawWheel();
        }
    }
};

document.querySelectorAll('.shop-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const action = btn.dataset.action;
        const cost = parseInt(btn.dataset.cost);
        
        if (state.score >= cost && !state.isSpinning) {
            const oldScore = state.score;
            state.score -= cost;
            animateScoreChange(oldScore, state.score);
            shopActions[action]();
            document.getElementById('actionLog').innerText = `Purchased: ${btn.innerText.split('(')[0].trim()}`;
            updateUI();
        }
    });
});

// --- UI Updates ---
function updateUI() {
    document.getElementById('scoreDisplay').innerText = state.score;

    document.querySelector('[data-action="addEntry100"]').innerHTML = `Add +100 (${state.shopCosts.add100} pts)`;
    document.querySelector('[data-action="addEntry50"]').innerHTML = `Add +50 (${state.shopCosts.add50} pts)`;

    document.getElementById('spinCountDisplay').innerText = state.spins;
    document.getElementById('spinBtn').disabled = state.isSpinning || state.score <= 0 || state.score >= config.winScore;
    
    document.querySelectorAll('.shop-btn').forEach(btn => {
        const cost = parseInt(btn.dataset.cost);
        btn.disabled = state.score < cost || state.isSpinning || state.score <= 0;
    });

    let statusMsg = [];
    if (state.shieldActive) statusMsg.push("🛡️ Shielded");
    if (state.multiplierSpinsLeft > 0) statusMsg.push(`✨ x2 Multiplier (${state.multiplierSpinsLeft} spins left)`);
    document.getElementById('statusDisplay').innerText = statusMsg.join(" | ");
}

function resetGame() {
    state.score = config.startScore;
    state.spins = 0;
    state.isSpinning = false;
    state.currentRotation = 0;
    state.shieldActive = false;
    state.multiplierSpinsLeft = 0;
    state.doubledDebtActive = false;
    state.shopCosts = { add100: 100, add50: 50 };
    
    document.getElementById('wheelCanvas').style.transform = `rotate(0deg)`;
    document.getElementById('restartBtn').style.display = 'none';
    
    initializeWheel();
}

// Init
document.getElementById('spinBtn').addEventListener('click', spinWheel);
initializeWheel();