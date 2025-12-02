import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, BALL_SIZE, POWERUPS } from "./GameEngine.js";
const ReplayComposition = ({ replayData }) => {
  const frame = useCurrentFrame();
  const dataIndex = Math.min(Math.floor(frame), replayData.length - 1);
  const state = replayData[Math.max(0, dataIndex)];
  if (!state) return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: { backgroundColor: "#000" }, children: "No Data" }, void 0, false, {
    fileName: "<stdin>",
    lineNumber: 11,
    columnNumber: 24
  });
  const { ball, p1, p2, powerups } = state;
  return /* @__PURE__ */ jsxDEV(AbsoluteFill, { style: {
    backgroundColor: "#050505",
    fontFamily: "Courier New",
    position: "relative"
  }, children: [
    /* @__PURE__ */ jsxDEV("div", { style: {
      position: "absolute",
      left: "50%",
      top: 0,
      bottom: 0,
      width: 2,
      backgroundColor: "#333",
      transform: "translateX(-50%)",
      borderLeft: "2px dashed #333"
    } }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 22,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { style: {
      position: "absolute",
      left: `${ball.x / CANVAS_WIDTH * 100}%`,
      top: `${ball.y / CANVAS_HEIGHT * 100}%`,
      width: `${BALL_SIZE / CANVAS_WIDTH * 100}%`,
      aspectRatio: "1/1",
      backgroundColor: "#fff",
      boxShadow: "0 0 10px #fff",
      borderRadius: "50%"
    } }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 34,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { style: {
      position: "absolute",
      left: 0,
      top: `${p1.y / CANVAS_HEIGHT * 100}%`,
      width: `${PADDLE_WIDTH / CANVAS_WIDTH * 100}%`,
      height: `${p1.height / CANVAS_HEIGHT * 100}%`,
      backgroundColor: "#0ff",
      boxShadow: "0 0 15px #0ff"
    } }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 46,
      columnNumber: 13
    }),
    /* @__PURE__ */ jsxDEV("div", { style: {
      position: "absolute",
      right: 0,
      top: `${p2.y / CANVAS_HEIGHT * 100}%`,
      width: `${PADDLE_WIDTH / CANVAS_WIDTH * 100}%`,
      height: `${p2.height / CANVAS_HEIGHT * 100}%`,
      backgroundColor: "#f0f",
      boxShadow: "0 0 15px #f0f"
    } }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 57,
      columnNumber: 13
    }),
    powerups && powerups.map((p) => /* @__PURE__ */ jsxDEV("div", { style: {
      position: "absolute",
      left: `${p.x / CANVAS_WIDTH * 100}%`,
      top: `${p.y / CANVAS_HEIGHT * 100}%`,
      width: "3%",
      aspectRatio: "1/1",
      borderRadius: "50%",
      backgroundColor: p.type === POWERUPS.BIG_PADDLE ? "#0f0" : "#f00",
      border: "2px solid white",
      transform: "translate(-50%, -50%)"
    } }, p.id, false, {
      fileName: "<stdin>",
      lineNumber: 69,
      columnNumber: 17
    })),
    /* @__PURE__ */ jsxDEV("div", { style: { position: "absolute", bottom: 20, right: 20, color: "white", opacity: 0.5 }, children: "INSTANT REPLAY" }, void 0, false, {
      fileName: "<stdin>",
      lineNumber: 83,
      columnNumber: 13
    })
  ] }, void 0, true, {
    fileName: "<stdin>",
    lineNumber: 16,
    columnNumber: 9
  });
};
export {
  ReplayComposition
};
