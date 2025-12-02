import { Fragment, jsxDEV } from "react/jsx-dev-runtime";
import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@remotion/player";
import { room, initRoom } from "./socket.js";
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  BALL_SIZE,
  POWERUPS,
  initialState,
  updatePhysics,
  initSounds,
  playSound
} from "./GameEngine.js";
import { ReplayComposition } from "./ReplayComposition.jsx";
const App = () => {
  const [gameState, setGameState] = useState("menu");
  const [role, setRole] = useState(null);
  const [myPlayerId, setMyPlayerId] = useState(1);
  const [replayData, setReplayData] = useState([]);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [statusMessage, setStatusMessage] = useState("");
  const canvasRef = useRef(null);
  const requestRef = useRef();
  const gameRef = useRef(JSON.parse(JSON.stringify(initialState)));
  const recordingRef = useRef([]);
  useEffect(() => {
    const setup = async () => {
      await initRoom();
      await initSounds();
      room.subscribeRoomState((state) => {
        if (state.gameActive) {
          if (state.gameState) {
            if (role !== "host") {
              gameRef.current = state.gameState;
              setScore({ p1: state.gameState.p1.score, p2: state.gameState.p2.score });
            }
          }
        } else if (state.matchEnded) {
        }
      });
      room.subscribePresence((presence) => {
        Object.keys(presence).forEach((clientId) => {
          const p = presence[clientId];
          if (p.playerId && p.playerId !== myPlayerId) {
            const targetKey = p.playerId === 1 ? "p1" : "p2";
            gameRef.current[targetKey].y = p.y;
          }
        });
      });
    };
    setup();
  }, [role, myPlayerId]);
  const startGame = async (mode) => {
    setGameState("waiting");
    setStatusMessage("Joining queue...");
    const peers = Object.values(room.peers);
    const myId = room.clientId;
    const sortedIds = Object.keys(room.peers).sort();
    const p1Id = sortedIds[0];
    const p2Id = sortedIds[1];
    if (mode === "practice" || !p2Id) {
      setRole("host");
      setMyPlayerId(1);
      setGameState("playing");
      setStatusMessage("Practice Mode (Solo)");
      startGameLoop(true);
    } else {
      if (myId === p1Id) {
        setRole("host");
        setMyPlayerId(1);
        setGameState("playing");
        startGameLoop(false);
      } else if (myId === p2Id) {
        setRole("client");
        setMyPlayerId(2);
        setGameState("playing");
        startGameLoop(false);
      } else {
        setStatusMessage("Room full. Spectating.");
      }
    }
  };
  const startGameLoop = (isAiMode) => {
    gameRef.current = JSON.parse(JSON.stringify(initialState));
    recordingRef.current = [];
    let lastTime = performance.now();
    const loop = (time) => {
      const dt = (time - lastTime) / 16.66;
      lastTime = time;
      if (gameState !== "playing" && gameState !== "waiting") return;
      if (role === "host") {
        if (isAiMode) {
          const targetY = gameRef.current.ball.y - gameRef.current.p2.height / 2;
          const diff = targetY - gameRef.current.p2.y;
          gameRef.current.p2.y += diff * 0.1;
        }
        const updatedState = updatePhysics(gameRef.current, dt);
        gameRef.current = updatedState;
        room.updateRoomState({
          gameActive: true,
          gameState: gameRef.current
        });
        if (updatedState.justScored) {
          handleScore(updatedState);
        }
      }
      renderGame(gameRef.current);
      recordingRef.current.push(JSON.parse(JSON.stringify(gameRef.current)));
      requestRef.current = requestAnimationFrame(loop);
    };
    requestRef.current = requestAnimationFrame(loop);
  };
  const handleScore = async (state) => {
    const frames = [...recordingRef.current];
    recordingRef.current = [];
    if (role === "host") {
      setScore({ p1: state.p1.score, p2: state.p2.score });
      uploadReplay(frames, state.p1.score, state.p2.score);
    }
  };
  const uploadReplay = async (frames, s1, s2) => {
    try {
      const blob = new Blob([JSON.stringify(frames)], { type: "application/json" });
      const file = new File([blob], `replay_${Date.now()}.json`, { type: "application/json" });
      const url = await window.websim.upload(file);
      const currentUser = await window.websim.getCurrentUser();
      await room.collection("match_replays").create({
        replay_url: url,
        p1_score: s1,
        p2_score: s2,
        played_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.log("Replay uploaded:", url);
    } catch (e) {
      console.error("Failed to upload replay", e);
    }
  };
  const handleInput = (e) => {
    if (gameState !== "playing") return;
    let clientY;
    if (e.touches) {
      clientY = e.touches[0].clientY;
    } else {
      clientY = e.clientY;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleY = CANVAS_HEIGHT / rect.height;
    const y = (clientY - rect.top) * scaleY;
    const paddleH = myPlayerId === 1 ? gameRef.current.p1.height : gameRef.current.p2.height;
    const clampedY = Math.max(0, Math.min(CANVAS_HEIGHT - paddleH, y - paddleH / 2));
    if (myPlayerId === 1) gameRef.current.p1.y = clampedY;
    else gameRef.current.p2.y = clampedY;
    room.updatePresence({
      playerId: myPlayerId,
      y: clampedY
    });
  };
  const renderGame = (state) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#050505";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.strokeStyle = "#333";
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.fillStyle = "#0ff";
    ctx.shadowColor = "#0ff";
    ctx.shadowBlur = 20;
    ctx.fillRect(0, state.p1.y, PADDLE_WIDTH, state.p1.height);
    ctx.fillStyle = "#f0f";
    ctx.shadowColor = "#f0f";
    ctx.fillRect(CANVAS_WIDTH - PADDLE_WIDTH, state.p2.y, PADDLE_WIDTH, state.p2.height);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#fff";
    ctx.beginPath();
    ctx.arc(state.ball.x + BALL_SIZE / 2, state.ball.y + BALL_SIZE / 2, BALL_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();
    state.powerups.forEach((p) => {
      ctx.fillStyle = p.type === POWERUPS.BIG_PADDLE ? "#0f0" : "#f00";
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
    ctx.shadowBlur = 0;
  };
  const viewLastReplay = async () => {
    try {
      const records = await room.collection("match_replays").getList();
      if (records && records.length > 0) {
        const latest = records[0];
        const res = await fetch(latest.replay_url);
        const data = await res.json();
        setReplayData(data);
        setGameState("replay");
      } else {
        alert("No replays found.");
      }
    } catch (e) {
      console.error(e);
      alert("Error loading replay.");
    }
  };
  return /* @__PURE__ */ jsxDEV("div", { className: "game-container", children: gameState === "replay" ? /* @__PURE__ */ jsxDEV("div", { className: "replay-player", children: [
    /* @__PURE__ */ jsxDEV(
      Player,
      {
        component: ReplayComposition,
        inputProps: { replayData },
        durationInFrames: replayData.length || 100,
        fps: 60,
        compositionWidth: CANVAS_WIDTH,
        compositionHeight: CANVAS_HEIGHT,
        style: {
          width: "100%",
          height: "100%",
          maxWidth: "100%",
          maxHeight: "100%"
        },
        controls: true,
        loop: true,
        autoPlay: true
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 290,
        columnNumber: 21
      }
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "ui-layer", children: /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", top: 20, left: 20 }, children: /* @__PURE__ */ jsxDEV("button", { onClick: () => setGameState("menu"), children: "Exit Replay" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 309,
      columnNumber: 29
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 308,
      columnNumber: 25
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 307,
      columnNumber: 21
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 289,
    columnNumber: 17
  }) : /* @__PURE__ */ jsxDEV(Fragment, { children: [
    /* @__PURE__ */ jsxDEV(
      "canvas",
      {
        ref: canvasRef,
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        onMouseMove: handleInput,
        onTouchMove: handleInput,
        onTouchStart: handleInput
      },
      void 0,
      false,
      {
        fileName: "<stdin>",
        lineNumber: 315,
        columnNumber: 21
      }
    ),
    /* @__PURE__ */ jsxDEV("div", { className: "score-board", children: [
      /* @__PURE__ */ jsxDEV("span", { className: "p1-score", children: score.p1 }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 325,
        columnNumber: 25
      }),
      /* @__PURE__ */ jsxDEV("span", { className: "p2-score", children: score.p2 }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 326,
        columnNumber: 25
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 324,
      columnNumber: 21
    }),
    gameState === "menu" && /* @__PURE__ */ jsxDEV("div", { className: "ui-layer", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-content", children: [
      /* @__PURE__ */ jsxDEV("h1", { children: "NEON PONG" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 332,
        columnNumber: 33
      }),
      /* @__PURE__ */ jsxDEV("p", { children: "Multiplayer with Powerups" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 333,
        columnNumber: 33
      }),
      /* @__PURE__ */ jsxDEV("button", { onClick: () => startGame("ranked"), children: "Find Match" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 334,
        columnNumber: 33
      }),
      /* @__PURE__ */ jsxDEV("button", { onClick: () => startGame("practice"), className: "secondary", children: "Practice" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 335,
        columnNumber: 33
      }),
      /* @__PURE__ */ jsxDEV("button", { onClick: viewLastReplay, className: "secondary", children: "Last Replay" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 336,
        columnNumber: 33
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 331,
      columnNumber: 29
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 330,
      columnNumber: 25
    }),
    gameState === "waiting" && /* @__PURE__ */ jsxDEV("div", { className: "ui-layer", children: /* @__PURE__ */ jsxDEV("div", { className: "ui-content", children: [
      /* @__PURE__ */ jsxDEV("h2", { children: "Waiting for Opponent..." }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 344,
        columnNumber: 33
      }),
      /* @__PURE__ */ jsxDEV("p", { children: "Share the URL to invite a friend." }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 345,
        columnNumber: 33
      }),
      /* @__PURE__ */ jsxDEV("button", { onClick: () => {
        navigator.clipboard.writeText(window.location.href);
        setStatusMessage("Link Copied!");
      }, className: "secondary", children: "Copy Link" }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 346,
        columnNumber: 33
      }),
      /* @__PURE__ */ jsxDEV("p", { children: statusMessage }, void 0, false, {
        fileName: "<stdin>",
        lineNumber: 350,
        columnNumber: 33
      })
    ] }, void 0, true, {
      fileName: "<stdin>",
      lineNumber: 343,
      columnNumber: 30
    }) }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 342,
      columnNumber: 25
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 314,
    columnNumber: 17
  }) }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 287,
    columnNumber: 9
  });
};
createRoot(document.getElementById("app")).render(/* @__PURE__ */ jsxDEV(App, {}, void 0, false, {
  fileName: "<stdin>",
  lineNumber: 360,
  columnNumber: 51
}));
