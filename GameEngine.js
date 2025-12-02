export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const PADDLE_WIDTH = 20;
export const PADDLE_HEIGHT = 100;
export const BALL_SIZE = 10;

// Powerup Types
export const POWERUPS = {
    BIG_PADDLE: 'BIG_PADDLE',
    SMALL_PADDLE: 'SMALL_PADDLE',
    FAST_BALL: 'FAST_BALL',
};

export const initialState = {
    ball: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2, dx: 5, dy: 3 },
    p1: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, height: PADDLE_HEIGHT, score: 0 },
    p2: { y: CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2, height: PADDLE_HEIGHT, score: 0 },
    powerups: [], // { x, y, type, id }
    activePowerup: null,
};

// Pure function to update physics (used by Host)
export function updatePhysics(state, dt) {
    let { ball, p1, p2, powerups, activePowerup } = state;

    // Ball Movement
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall Collision (Top/Bottom)
    if (ball.y <= 0 || ball.y + BALL_SIZE >= CANVAS_HEIGHT) {
        ball.dy *= -1;
        // Clamp to prevent sticking
        ball.y = ball.y <= 0 ? 1 : CANVAS_HEIGHT - BALL_SIZE - 1;
        playSound('hit');
    }

    // Paddle Collision
    // P1 (Left)
    if (ball.x <= PADDLE_WIDTH && ball.y + BALL_SIZE >= p1.y && ball.y <= p1.y + p1.height) {
        ball.dx = Math.abs(ball.dx); // Bounce right
        ball.dx *= 1.05; // Speed up slightly
        playSound('hit');
        checkPowerupEffect(state, 'p1');
    }

    // P2 (Right)
    if (ball.x + BALL_SIZE >= CANVAS_WIDTH - PADDLE_WIDTH && ball.y + BALL_SIZE >= p2.y && ball.y <= p2.y + p2.height) {
        ball.dx = -Math.abs(ball.dx); // Bounce left
        ball.dx *= 1.05;
        playSound('hit');
        checkPowerupEffect(state, 'p2');
    }

    // Scoring
    let scored = false;
    let scorer = null;

    if (ball.x < 0) {
        p2.score++;
        scored = true;
        scorer = 'p2';
    } else if (ball.x > CANVAS_WIDTH) {
        p1.score++;
        scored = true;
        scorer = 'p1';
    }

    if (scored) {
        playSound('score');
        // Reset Ball
        ball.x = CANVAS_WIDTH / 2;
        ball.y = CANVAS_HEIGHT / 2;
        ball.dx = (Math.random() > 0.5 ? 5 : -5);
        ball.dy = (Math.random() * 6 - 3);

        // Reset Powerups
        state.p1.height = PADDLE_HEIGHT;
        state.p2.height = PADDLE_HEIGHT;
    }

    // Powerup Spawning (Random chance)
    if (powerups.length < 1 && Math.random() < 0.002) {
        const types = Object.values(POWERUPS);
        powerups.push({
            id: Math.random().toString(36).substr(2, 9),
            x: CANVAS_WIDTH / 2 + (Math.random() * 200 - 100),
            y: CANVAS_HEIGHT / 2 + (Math.random() * 400 - 200),
            type: types[Math.floor(Math.random() * types.length)]
        });
    }

    // Powerup Collision
    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i];
        const dist = Math.hypot((ball.x + BALL_SIZE/2) - p.x, (ball.y + BALL_SIZE/2) - p.y);
        if (dist < 30) {
            // Apply Powerup to the person who LAST hit the ball?
            // Or just apply globally. Let's apply globally or based on direction.
            // If ball.dx > 0, P1 hit it last (mostly). 
            const beneficiary = ball.dx > 0 ? 'p1' : 'p2';
            applyPowerup(state, p.type, beneficiary);
            playSound('powerup');
            powerups.splice(i, 1);
        }
    }

    return { ...state, lastScorer: scorer, justScored: scored };
}

function applyPowerup(state, type, playerKey) {
    if (type === POWERUPS.BIG_PADDLE) {
        state[playerKey].height = PADDLE_HEIGHT * 1.5;
    } else if (type === POWERUPS.SMALL_PADDLE) {
        // Debuff the opponent
        const opponent = playerKey === 'p1' ? 'p2' : 'p1';
        state[opponent].height = PADDLE_HEIGHT * 0.7;
    } else if (type === POWERUPS.FAST_BALL) {
        state.ball.dx *= 1.5;
        state.ball.dy *= 1.5;
    }
}

function checkPowerupEffect(state, playerKey) {
    // Logic to reset or manage buffs could go here
}

// Simple Audio Context wrapper
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const sounds = {};

async function loadSound(name, url) {
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        sounds[name] = audioBuffer;
    } catch (e) {
        console.error("Audio load error", e);
    }
}

export async function initSounds() {
    await loadSound('hit', 'hit.mp3');
    await loadSound('score', 'score.mp3');
    await loadSound('powerup', 'powerup.mp3');
}

export function playSound(name) {
    if (sounds[name]) {
        const source = audioCtx.createBufferSource();
        source.buffer = sounds[name];
        source.connect(audioCtx.destination);
        source.start(0);
    }
}