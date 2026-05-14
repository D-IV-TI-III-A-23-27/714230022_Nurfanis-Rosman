let points = [];
let labels = [];
let particles = [];
let ripples = [];

let draggingPointIndex = -1;
let currentMid = null;
let currentAngle = null;

function setup() {
    const container = document.getElementById('canvas-container');
    let canvas = createCanvas(container.offsetWidth, 500);
    canvas.parent('canvas-container');

    for (let i = 0; i < 40; i++) {
        particles.push({
            x: random(width), y: random(height),
            vx: random(-0.3, 0.3), vy: random(-0.3, 0.3),
            size: random(1, 3)
        });
    }

    canvas.elt.oncontextmenu = () => false;
}

function draw() {
    background(255);

    drawBackgroundParticles();

    // Draw Ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
        let r = ripples[i];
        noFill();
        stroke(0, 0, 0, r.alpha);
        strokeWeight(2);
        circle(r.x, r.y, r.radius);
        r.radius += 3;
        r.alpha -= 5;
        if (r.alpha <= 0) ripples.splice(i, 1);
    }

    drawSVM();

    let hoveredPointIndex = -1;
    let hoveredPoint = null;

    // Determine hover for interactions
    for (let i = points.length - 1; i >= 0; i--) {
        let d = dist(mouseX, mouseY, points[i].x, points[i].y);
        if (d < 15) {
            hoveredPointIndex = i;
            hoveredPoint = points[i];
            break; // Only hover the topmost
        }
    }

    // Gambar titik data
    for (let i = 0; i < points.length; i++) {
        let isHovered = (i === hoveredPointIndex);
        let isDragging = (i === draggingPointIndex);

        if (isHovered || isDragging) {
            stroke(0);
            strokeWeight(3);
        } else {
            stroke(255);
            strokeWeight(1.5);
        }

        if (labels[i] === 1) fill(59, 130, 246);
        else fill(239, 68, 68);

        // Breathing effect for all points
        let breathing = sin(frameCount * 0.1 + i) * 1.5;
        let r = 14 + breathing;
        if (isDragging) r += 4;

        circle(points[i].x, points[i].y, r);
    }

    updateTooltip(hoveredPoint);
}

function drawBackgroundParticles() {
    noStroke();
    fill(0, 0, 0, 15);
    particles.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        circle(p.x, p.y, p.size);
    });
}

function drawSVM() {
    if (points.length < 2) return;

    let sumA = createVector(0, 0), countA = 0;
    let sumB = createVector(0, 0), countB = 0;

    let ptsA = [];
    let ptsB = [];

    for (let i = 0; i < points.length; i++) {
        if (labels[i] === 1) {
            sumA.add(points[i]); countA++;
            ptsA.push(points[i]);
        }
        else {
            sumB.add(points[i]); countB++;
            ptsB.push(points[i]);
        }
    }

    if (countA > 0 && countB > 0) {
        let targetCenterA = p5.Vector.div(sumA, countA);
        let targetCenterB = p5.Vector.div(sumB, countB);
        let targetMid = p5.Vector.div(p5.Vector.add(targetCenterA, targetCenterB), 2);
        let diff = p5.Vector.sub(targetCenterB, targetCenterA);
        let targetAngle = diff.heading() + HALF_PI;

        if (currentMid === null) {
            currentMid = targetMid.copy();
            currentAngle = targetAngle;
        } else {
            currentMid.lerp(targetMid, 0.1);
            let a1 = currentAngle;
            let a2 = targetAngle;
            let diffAngle = atan2(sin(a2 - a1), cos(a2 - a1));
            currentAngle += diffAngle * 0.1;
        }

        let hudText = document.getElementById('hud-equation');
        if (hudText) {
            hudText.innerHTML = `f(x) = ${diff.x.toFixed(2)}x + ${diff.y.toFixed(2)}y - ${targetMid.mag().toFixed(2)}<br>Margin Width: ${(diff.mag() / 2).toFixed(1)}px`;
        }

        // Draw Laser Connectors
        let closestA = null, minDistA = Infinity;
        let closestB = null, minDistB = Infinity;

        ptsA.forEach(p => { let d = p5.Vector.dist(p, currentMid); if (d < minDistA) { minDistA = d; closestA = p; } });
        ptsB.forEach(p => { let d = p5.Vector.dist(p, currentMid); if (d < minDistB) { minDistB = d; closestB = p; } });

        if (closestA) {
            stroke(59, 130, 246, 180);
            strokeWeight(2);
            drawingContext.setLineDash([5, 5]);
            line(closestA.x, closestA.y, currentMid.x, currentMid.y);

            // Highlight support vector
            noFill(); stroke(0); strokeWeight(2);
            circle(closestA.x, closestA.y, 24 + sin(frameCount * 0.2) * 4);
        }
        if (closestB) {
            stroke(239, 68, 68, 180);
            strokeWeight(2);
            line(closestB.x, closestB.y, currentMid.x, currentMid.y);

            noFill(); stroke(0); strokeWeight(2);
            circle(closestB.x, closestB.y, 24 + sin(frameCount * 0.2) * 4);
        }
        drawingContext.setLineDash([]);

        push();
        translate(currentMid.x, currentMid.y);
        rotate(currentAngle);

        // Highlight Margin Region
        noStroke();
        fill(56, 189, 248, 10);
        rect(-3000, -35, 6000, 70);

        drawingContext.shadowBlur = 20;
        drawingContext.shadowColor = '#38bdf8';
        stroke(56, 189, 248);
        strokeWeight(4);
        line(-3000, 0, 3000, 0);

        drawingContext.shadowBlur = 0;
        stroke(148, 163, 184, 80);
        drawingContext.setLineDash([10, 10]);
        line(-3000, -35, 3000, -35);
        line(-3000, 35, 3000, 35);
        pop();
        drawingContext.setLineDash([]);
    } else {
        currentMid = null;
        let hudText = document.getElementById('hud-equation');
        if (hudText) hudText.innerHTML = "Need more points...";
    }
}

function mousePressed() {
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height) return;

    for (let i = points.length - 1; i >= 0; i--) {
        if (dist(mouseX, mouseY, points[i].x, points[i].y) < 15) {
            if (mouseButton === RIGHT) {
                points.splice(i, 1);
                labels.splice(i, 1);
                ripples.push({ x: mouseX, y: mouseY, radius: 10, alpha: 200 });
                updateStatus();
                return;
            } else if (mouseButton === LEFT) {
                draggingPointIndex = i;
                return;
            }
        }
    }

    let label = mouseButton === LEFT ? 1 : -1;

    if (keyIsDown(SHIFT)) {
        for (let i = 0; i < 15; i++) {
            let rx = mouseX + randomGaussian(0, 20);
            let ry = mouseY + randomGaussian(0, 20);
            if (rx > 0 && rx < width && ry > 0 && ry < height) {
                points.push(createVector(rx, ry));
                labels.push(label);
            }
        }
    } else {
        points.push(createVector(mouseX, mouseY));
        labels.push(label);
    }

    ripples.push({ x: mouseX, y: mouseY, radius: 10, alpha: 255 });
    updateStatus();
}

function mouseDragged() {
    if (draggingPointIndex !== -1 && mouseButton === LEFT) {
        points[draggingPointIndex].x = constrain(mouseX, 0, width);
        points[draggingPointIndex].y = constrain(mouseY, 0, height);
    }
}

function mouseReleased() {
    draggingPointIndex = -1;
}

function updateStatus() {
    document.getElementById('status').innerText = `${points.length} Data Points Analyzed`;
}

function updateTooltip(pt) {
    const tooltip = document.getElementById('tooltip');
    if (pt) {
        tooltip.style.display = 'block';
        tooltip.style.left = (mouseX + 15) + 'px';
        tooltip.style.top = (mouseY - 15) + 'px';
        tooltip.innerText = `Pos: ${floor(pt.x)}, ${floor(pt.y)}`;
    } else {
        tooltip.style.display = 'none';
    }
}

function resetPoints() {
    points = [];
    labels = [];
    currentMid = null;
    currentAngle = null;
    ripples = [];
    updateStatus();
    document.getElementById('status').innerText = "Dataset Cleared.";
}

function windowResized() {
    const container = document.getElementById('canvas-container');
    resizeCanvas(container.offsetWidth, 500);
}

// Magnetic Parallax
document.addEventListener('mousemove', (e) => {
    let panels = document.querySelectorAll('.instruction-card, .stats-card');
    if (panels.length > 0) {
        let xOffset = (window.innerWidth / 2 - e.pageX) / 60;
        let yOffset = (window.innerHeight / 2 - e.pageY) / 60;
        panels.forEach(panel => {
            panel.style.transform = `translateY(-5px) rotateY(${-xOffset}deg) rotateX(${yOffset}deg)`;
        });
    }
});