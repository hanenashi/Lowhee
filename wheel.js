const canvas = document.getElementById('wheel');
const ctx = canvas.getContext('2d');
const centerX = canvas.width / 2;
const centerY = 300;

let settings = {
    sections: 37,
    maxSpeed: 20,
    minSpins: 5,
    maxSpins: 10,
    deceleration: 0.1,
    darkness: 1,
    autoSpin: 0,
    randomize: false,
    centerCircleWidth: 100,
    dotWidth: 5,
    dotOffset: 20,
    centerCircleColor: '#000000',
    dotColor: '#FFFFFF',
    borderColor: '#8b4513',
    borderThickness: 2,
    bgColor: '#000000',
    numberColor: '#000000',
    numberStyle: 'regular',
    wheelSize: 250,
    wheelFontSize: 20,
    tableFontSize: 16,
    spinDirection: 'counterclockwise',
    randomSpinDirection: false,
    flashAnimation: true,
    flashSpeed: 200,
    flashCount: 2,
    flashColor: '#FFFFFF'
};
let defaultSettings = { ...settings };

// Load saved settings
if (localStorage.getItem('wheelSettings')) {
    settings = JSON.parse(localStorage.getItem('wheelSettings'));
}

let remainingNumbers = Array.from({ length: settings.sections }, (_, i) => i + 1);
let winners = [];
let angle = Math.PI / 2;
let spinSpeed = 0;
let spinDistanceRemaining = 0;
let spinning = false;
let autoSpinning = false;
let autoSpinCount = 0;
let flashing = false;

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

// Shuffle array
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// Draw wheel with optional flash
function drawWheel(flashSection = -1, flashColor = null) {
    const radius = settings.wheelSize;
    ctx.fillStyle = settings.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sections = remainingNumbers.length;
    if (sections === 0) return;
    const anglePerSection = 2 * Math.PI / sections;
    const colors = generatePastelColors(sections, settings.darkness);

    for (let i = 0; i < sections; i++) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, angle + i * anglePerSection, angle + (i + 1) * anglePerSection);
        ctx.fillStyle = (i === flashSection && flashColor) ? flashColor : colors[i];
        ctx.fill();
        ctx.strokeStyle = settings.borderColor;
        ctx.lineWidth = settings.borderThickness;
        ctx.stroke();

        const textAngle = angle + (i + 0.5) * anglePerSection;
        const textX = centerX + (radius - 30) * Math.cos(textAngle);
        const textY = centerY + (radius - 30) * Math.sin(textAngle);
        ctx.save();
        ctx.translate(textX, textY);
        ctx.rotate(textAngle + Math.PI / 2);
        ctx.fillStyle = settings.numberColor;
        ctx.font = `${settings.wheelFontSize}px Arial ${settings.numberStyle === 'bold' ? 'bold' : ''}`;
        ctx.fillText(remainingNumbers[i], -ctx.measureText(remainingNumbers[i]).width / 2, 5);
        ctx.restore();
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, settings.centerCircleWidth / 2, 0, 2 * Math.PI);
    ctx.fillStyle = settings.centerCircleColor;
    ctx.fill();

    const dotX = centerX + settings.dotOffset * Math.cos(angle);
    const dotY = centerY + settings.dotOffset * Math.sin(angle);
    ctx.beginPath();
    ctx.arc(dotX, dotY, settings.dotWidth / 2, 0, 2 * Math.PI);
    ctx.fillStyle = settings.dotColor;
    ctx.fill();

    const tipY = centerY + radius - 15;
    const baseY = centerY + radius + 45;
    ctx.beginPath();
    ctx.moveTo(centerX - 30, baseY);
    ctx.lineTo(centerX + 30, baseY);
    ctx.lineTo(centerX, tipY);
    ctx.fillStyle = 'black';
    ctx.fill();

    const redBaseY = centerY + radius - 3;
    ctx.beginPath();
    ctx.moveTo(centerX - 6, redBaseY);
    ctx.lineTo(centerX + 6, redBaseY);
    ctx.lineTo(centerX, tipY);
    ctx.fillStyle = 'red';
    ctx.fill();
}

// Get winning section
function getWinningSection() {
    const sections = remainingNumbers.length;
    if (sections === 0) return null;
    const anglePerSection = 360 / sections;
    const tipAngle = 180;
    let finalAngle = ((angle * 180 / Math.PI) + 90) % 360;
    if (finalAngle < 0) finalAngle += 360;
    let relativeAngle = (tipAngle - finalAngle + 360) % 360;
    const sectionIdx = Math.floor(relativeAngle / anglePerSection);
    return { number: remainingNumbers[sectionIdx], index: sectionIdx };
}

// Flash animation
async function flashWinner(winner) {
    if (!settings.flashAnimation || !winner) {
        winners.push(winner.number);
        drawWinners();
        return;
    }

    flashing = true;
    const sectionIdx = winner.index;
    const cellIdx = winners.length;
    const flashColor = settings.flashColor;
    const originalColor = generatePastelColors(remainingNumbers.length, settings.darkness)[sectionIdx];

    for (let i = 0; i < settings.flashCount; i++) {
        drawWheel(sectionIdx, flashColor);
        await new Promise(resolve => setTimeout(resolve, settings.flashSpeed));
        drawWheel(sectionIdx, originalColor);
        await new Promise(resolve => setTimeout(resolve, settings.flashSpeed));
    }

    winners.push(winner.number);
    drawWinners();

    const table = document.getElementById('winnersTable');
    const cell = table.rows[Math.floor(cellIdx / 10)].cells[cellIdx % 10];
    const originalBg = settings.bgColor;

    for (let i = 0; i < settings.flashCount; i++) {
        cell.style.backgroundColor = flashColor;
        await new Promise(resolve => setTimeout(resolve, settings.flashSpeed));
        cell.style.backgroundColor = originalBg;
        await new Promise(resolve => setTimeout(resolve, settings.flashSpeed));
    }

    flashing = false;
}

// Draw winners table
function drawWinners() {
    const table = document.getElementById('winnersTable');
    table.style.setProperty('--table-font-size', `${settings.tableFontSize}px`);
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
    if (!spinning && !flashing && remainingNumbers.length) {
        if (winners.length) {
            remainingNumbers.splice(remainingNumbers.indexOf(winners[winners.length - 1]), 1);
            if (settings.randomize) shuffle(remainingNumbers);
        }
        if (remainingNumbers.length) {
            spinning = true;
            spinSpeed = settings.maxSpeed;
            spinDistanceRemaining = Math.random() * (settings.maxSpins - settings.minSpins) + settings.minSpins * 360;
            if (settings.randomSpinDirection) {
                spinSpeed = Math.random() < 0.5 ? -spinSpeed : spinSpeed;
            } else {
                spinSpeed = settings.spinDirection === 'clockwise' ? spinSpeed : -spinSpeed;
            }
        }
    }
});

document.getElementById('autoSpinBtn').addEventListener('click', () => {
    if (!spinning && !flashing && remainingNumbers.length) {
        autoSpinning = true;
        autoSpinCount = settings.autoSpin;
    }
});

document.getElementById('resetBtn').addEventListener('click', () => {
    angle = Math.PI / 2;
    winners = [];
    spinSpeed = 0;
    spinning = false;
    flashing = false;
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
    document.getElementById('randomize').checked = settings.randomize;
    document.getElementById('centerCircleWidth').value = settings.centerCircleWidth;
    document.getElementById('dotWidth').value = settings.dotWidth;
    document.getElementById('dotOffset').value = settings.dotOffset;
    document.getElementById('centerCircleColor').value = settings.centerCircleColor;
    document.getElementById('dotColor').value = settings.dotColor;
    document.getElementById('borderColor').value = settings.borderColor;
    document.getElementById('borderThickness').value = settings.borderThickness;
    document.getElementById('bgColor').value = settings.bgColor;
    document.getElementById('numberColor').value = settings.numberColor;
    document.getElementById('numberRegular').checked = settings.numberStyle === 'regular';
    document.getElementById('numberBold').checked = settings.numberStyle === 'bold';
    document.getElementById('wheelSize').value = settings.wheelSize;
    document.getElementById('wheelFontSize').value = settings.wheelFontSize;
    document.getElementById('tableFontSize').value = settings.tableFontSize;
    document.getElementById('spinCounterclockwise').checked = settings.spinDirection === 'counterclockwise';
    document.getElementById('spinClockwise').checked = settings.spinDirection === 'clockwise';
    document.getElementById('randomSpinDirection').checked = settings.randomSpinDirection;
    document.getElementById('flashAnimation').checked = settings.flashAnimation;
    document.getElementById('flashSpeed').value = settings.flashSpeed;
    document.getElementById('flashCount').value = settings.flashCount;
    document.getElementById('flashColor').value = settings.flashColor;
});

document.getElementById('saveSettings').addEventListener('click', () => {
    settings.sections = Math.min(Math.max(1, +document.getElementById('sections').value), 100);
    settings.maxSpeed = Math.min(Math.max(1, +document.getElementById('maxSpeed').value), 50);
    settings.minSpins = Math.min(Math.max(1, +document.getElementById('minSpins').value), 20);
    settings.maxSpins = Math.min(Math.max(settings.minSpins, +document.getElementById('maxSpins').value), 30);
    settings.deceleration = Math.min(Math.max(0.01, +document.getElementById('deceleration').value), 1);
    settings.darkness = Math.min(Math.max(1, +document.getElementById('darkness').value), 10);
    settings.autoSpin = Math.min(Math.max(0, +document.getElementById('autoSpinCount').value), 50);
    settings.randomize = document.getElementById('randomize').checked;
    settings.centerCircleWidth = Math.min(Math.max(10, +document.getElementById('centerCircleWidth').value), 200);
    settings.dotWidth = Math.min(Math.max(2, +document.getElementById('dotWidth').value), 20);
    settings.dotOffset = Math.min(Math.max(0, +document.getElementById('dotOffset').value), 100);
    settings.centerCircleColor = document.getElementById('centerCircleColor').value;
    settings.dotColor = document.getElementById('dotColor').value;
    settings.borderColor = document.getElementById('borderColor').value;
    settings.borderThickness = Math.min(Math.max(1, +document.getElementById('borderThickness').value), 10);
    settings.bgColor = document.getElementById('bgColor').value;
    settings.numberColor = document.getElementById('numberColor').value;
    settings.numberStyle = document.getElementById('numberBold').checked ? 'bold' : 'regular';
    settings.wheelSize = Math.min(Math.max(100, +document.getElementById('wheelSize').value), 300);
    settings.wheelFontSize = Math.min(Math.max(10, +document.getElementById('wheelFontSize').value), 50);
    settings.tableFontSize = Math.min(Math.max(10, +document.getElementById('tableFontSize').value), 30);
    settings.spinDirection = document.getElementById('spinClockwise').checked ? 'clockwise' : 'counterclockwise';
    settings.randomSpinDirection = document.getElementById('randomSpinDirection').checked;
    settings.flashAnimation = document.getElementById('flashAnimation').checked;
    settings.flashSpeed = Math.min(Math.max(50, +document.getElementById('flashSpeed').value), 1000);
    settings.flashCount = Math.min(Math.max(1, +document.getElementById('flashCount').value), 10);
    settings.flashColor = document.getElementById('flashColor').value;
    remainingNumbers = Array.from({ length: settings.sections }, (_, i) => i + 1);
    winners = [];
    localStorage.setItem('wheelSettings', JSON.stringify(settings));
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
    document.getElementById('randomize').checked = settings.randomize;
    document.getElementById('centerCircleWidth').value = settings.centerCircleWidth;
    document.getElementById('dotWidth').value = settings.dotWidth;
    document.getElementById('dotOffset').value = settings.dotOffset;
    document.getElementById('centerCircleColor').value = settings.centerCircleColor;
    document.getElementById('dotColor').value = settings.dotColor;
    document.getElementById('borderColor').value = settings.borderColor;
    document.getElementById('borderThickness').value = settings.borderThickness;
    document.getElementById('bgColor').value = settings.bgColor;
    document.getElementById('numberColor').value = settings.numberColor;
    document.getElementById('numberRegular').checked = settings.numberStyle === 'regular';
    document.getElementById('numberBold').checked = settings.numberStyle === 'bold';
    document.getElementById('wheelSize').value = settings.wheelSize;
    document.getElementById('wheelFontSize').value = settings.wheelFontSize;
    document.getElementById('tableFontSize').value = settings.tableFontSize;
    document.getElementById('spinCounterclockwise').checked = settings.spinDirection === 'counterclockwise';
    document.getElementById('spinClockwise').checked = settings.spinDirection === 'clockwise';
    document.getElementById('randomSpinDirection').checked = settings.randomSpinDirection;
    document.getElementById('flashAnimation').checked = settings.flashAnimation;
    document.getElementById('flashSpeed').value = settings.flashSpeed;
    document.getElementById('flashCount').value = settings.flashCount;
    document.getElementById('flashColor').value = settings.flashColor;
});

// Animation loop
function animate() {
    if (spinning && !flashing) {
        angle += spinSpeed * Math.PI / 180;
        spinDistanceRemaining -= Math.abs(spinSpeed);
        if (spinDistanceRemaining <= 0) {
            spinSpeed -= settings.deceleration * Math.sign(spinSpeed);
            if (Math.abs(spinSpeed) < 0.01) { // Tighter threshold
                spinSpeed = 0; // Force stop
                spinning = false;
                const winner = getWinningSection();
                flashWinner(winner).then(() => {
                    if (autoSpinning && autoSpinCount === 0) autoSpinning = false;
                });
            }
        }
    } else if (autoSpinning && !spinning && !flashing && autoSpinCount > 0 && remainingNumbers.length) {
        spinning = true;
        spinSpeed = settings.maxSpeed;
        spinDistanceRemaining = Math.random() * (settings.maxSpins - settings.minSpins) + settings.minSpins * 360;
        if (settings.randomSpinDirection) {
            spinSpeed = Math.random() < 0.5 ? -spinSpeed : spinSpeed;
        } else {
            spinSpeed = settings.spinDirection === 'clockwise' ? spinSpeed : -spinSpeed;
        }
        autoSpinCount--;
        if (winners.length) {
            remainingNumbers.splice(remainingNumbers.indexOf(winners[winners.length - 1]), 1);
            if (settings.randomize) shuffle(remainingNumbers);
        }
    }
    drawWheel();
    if (!spinning && !flashing) drawWinners();
    requestAnimationFrame(animate);
}

animate();
