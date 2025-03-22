const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = 300;
const radius = 250;

let settings = {
    sections: 37,
    maxSpeed: 20,
    minSpins: 5,
    maxSpins: 10,
    deceleration: 0.1,
    darkness: 1,
    autoSpin: 0
};
let defaultSettings = { ...settings };
let remainingNumbers = Array.from({ length: settings.sections }, (_, i) => i + 1);
let winners = [];
let angle = Math.PI / 2; // 90 degrees
let spinSpeed = 0;
let spinDistanceRemaining = 0;
let spinning = false;
let autoSpinning = false;
let autoSpinCount = 0;

// Generate pastel colors
function generatePastelColors(numSections, darkness) {
    const colors = [];
    for (let i = 0; i < numSections; i++) {
        const hue = (i / numSections) * 360;
        const rgb = hsvToRgb(hue, 0.4, 0.9);
        const darken = 0.9 - (darkness - 1) * 0.1;
        colors.push(`rgb(${rgb[0] * darken}, ${rgb[1] * darken}, ${rgb[2] * darken})`);
    }
    return colors;
}

function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;
    let r, g, b;
    if (h < 60) [r, g, b] = [c, x, 0];
    else if (h < 120) [r, g, b] = [x, c, 0];
    else if (h < 180) [r, g, b] = [0, c, x];
    else if (h < 240) [r, g, b] = [0, x, c];
    else if (h < 300) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

// Draw wheel
function drawWheel() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const sections = remainingNumbers.length;
    if (sections === 0) return;
    const anglePerSection = 2 * Math.PI / sections;
    const colors = generatePastelColors(sections, settings.darkness);

    for (let i = 0; i < sections; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle + i * anglePerSection, angle + (i + 1) * anglePerSection);
        ctx.fillStyle = colors[i];
        ctx.fill();
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 2;
        ctx.stroke();

        const textAngle = angle + (i + 0.5) * anglePerSection;
        const textX = centerX + (radius - 30) * Math.cos(textAngle);
        const textY = centerY + (radius - 30) * Math.sin(textAngle);
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(textAngle + Math.PI / 2);
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.fillText(remainingNumbers[i], -ctx.measureText(remainingNumbers[i]).width / 2, 5);
        ctx.restore();
    }

    // Draw pointer (matching Python)
    const tipY = centerY + radius - 15; // Red tip at wheel edge
    const baseY = centerY + radius + 45; // Black base below
    ctx.beginPath();
    ctx.moveTo(centerX - 30, baseY); // Left base
    ctx.lineTo(centerX + 30, baseY); // Right base
    ctx.lineTo(centerX, tipY); // Tip
    ctx.fillStyle = 'black';
    ctx.fill();

    const redBaseY = centerY + radius - 3; // Red base just below tip
    ctx.beginPath();
    ctx.moveTo(centerX - 6, redBaseY); // Left red base
    ctx.lineTo(centerX + 6, redBaseY); // Right red base
    ctx.lineTo(centerX, tipY); // Red tip
    ctx.fillStyle = 'red';
    ctx.fill();
}

// Get winning section
function getWinningSection() {
    const sections = remainingNumbers.length;
    if (sections === 0) return null;
    const anglePerSection = 360 / sections;
    const tipAngle = 180; // Pointer at bottom (180° in JS coords)
    let finalAngle = (angle * 180 / Math.PI) % 360; // Wheel angle in degrees
    if (finalAngle < 0) finalAngle += 360;
    let relativeAngle = (finalAngle - tipAngle + 360) % 360; // Angle from pointer to wheel
    const sectionIdx = Math.floor(relativeAngle / anglePerSection);
    const correctedIdx = (sections - sectionIdx - 1 + sections) % sections; // Reverse and adjust
    return remainingNumbers[correctedIdx];
}

// Draw winners table
function drawWinners() {
    const table = document.getElementById('winnersTable');
    table.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const row = table.insertRow();
        for (let j = 0; j < 10; j++) {
            const cell = row.insertCell();
            const idx = i * 10 + j;
            if (idx < winners.length) cell.textContent = winners[idx];
        }
    }
}

// Event listeners
document.getElementById('spinBtn').addEventListener('click', () => {
    if (!spinning && remainingNumbers.length) {
        if (winners.length) remainingNumbers.splice(remainingNumbers.indexOf(winners[winners.length - 1]), 1);
        if (remainingNumbers.length) {
            spinning = true;
            spinSpeed = settings.maxSpeed;
            spinDistanceRemaining = Math.random() * (settings.maxSpins - settings.minSpins) + settings.minSpins * 360;
        }
    }
});

document.getElementById('autoSpinBtn').addEventListener('click', () => {
    if (!spinning && remainingNumbers.length) {
        autoSpinning = true;
        autoSpinCount = settings.autoSpin;
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    angle = Math.PI / 2;
    winners = [];
    remainingNumbers = Array.from({ length: settings.sections }, (_, i) => i + 1);
});

document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('settingsPanel').style.display = 'block';
    document.getElementById('sections').value = settings.sections;
    document.getElementById('maxSpeed').value = settings.maxSpeed;
    document.getElementById('minSpins').value = settings.minSpins;
    document.getElementById('maxSpins').value = settings.maxSpins;
    document.getElementById('deceleration').value = settings.deceleration;
    document.getElementById('darkness').value = settings.darkness;
    document.getElementById('autoSpinCount').value = settings.autoSpin;
});

document.getElementById('saveSettings').addEventListener('click', () => {
    settings.sections = Math.min(Math.max(1, +document.getElementById('sections').value), 100);
    settings.maxSpeed = Math.min(Math.max(1, +document.getElementById('maxSpeed').value), 50);
    settings.minSpins = Math.min(Math.max(1, +document.getElementById('minSpins').value), 20);
    settings.maxSpins = Math.min(Math.max(settings.minSpins, +document.getElementById('maxSpins').value), 30);
    settings.deceleration = Math.min(Math.max(0.01, +document.getElementById('deceleration').value), 1);
    settings.darkness = Math.min(Math.max(1, +document.getElementById('darkness').value), 10);
    settings.autoSpin = Math.min(Math.max(0, +document.getElementById('autoSpinCount').value), 50);
    remainingNumbers = Array.from({ length: settings.sections }, (_, i) => i + 1);
    winners = [];
    document.getElementById('settingsPanel').style.display = 'none';
});

document.getElementById('resetSettings').addEventListener('click', () => {
    settings = { ...defaultSettings };
    document.getElementById('sections').value = settings.sections;
    document.getElementById('maxSpeed').value = settings.maxSpeed;
    document.getElementById('minSpins').value = settings.minSpins;
    document.getElementById('maxSpins').value = settings.maxSpins;
    document.getElementById('deceleration').value = settings.deceleration;
    document.getElementById('darkness').value = settings.darkness;
    document.getElementById('autoSpinCount').value = settings.autoSpin;
});

// Animation loop
function animate() {
    if (spinning || autoSpinning) {
        if (!spinning && autoSpinning && autoSpinCount > 0 && remainingNumbers.length) {
            spinning = true;
            spinSpeed = settings.maxSpeed;
            spinDistanceRemaining = Math.random() * (settings.maxSpins - settings.minSpins) + settings.minSpins * 360;
            autoSpinCount--;
            if (winners.length) remainingNumbers.splice(remainingNumbers.indexOf(winners[winners.length - 1]), 1);
        }
        if (spinning) {
            angle -= spinSpeed * Math.PI / 180; // Convert to radians
            spinDistanceRemaining -= spinSpeed;
            if (spinDistanceRemaining <= 0) {
                spinSpeed -= settings.deceleration;
                if (spinSpeed <= 0) {
                    spinning = false;
                    const winner = getWinningSection();
                    if (winner !== null) winners.push(winner);
                    if (autoSpinning && autoSpinCount === 0) autoSpinning = false;
                }
            }
        }
    }
    drawWheel();
    drawWinners();
    requestAnimationFrame(animate);
}

animate();
