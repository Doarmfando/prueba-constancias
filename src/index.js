import "./api/webBridge";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const isDev = process.env.NODE_ENV !== "production";

function showOverlayError(title, detail) {
  if (!isDev) return;
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(10,10,10,0.9)";
  overlay.style.color = "#ffdddd";
  overlay.style.fontFamily = "monospace";
  overlay.style.fontSize = "14px";
  overlay.style.zIndex = "9999";
  overlay.style.padding = "24px";
  overlay.style.overflow = "auto";
  overlay.innerHTML = `
    <h1 style="color:#ff6b6b;font-size:20px;margin-bottom:12px;">${title}</h1>
    <pre style="white-space:pre-wrap;">${detail || "Sin detalles"}</pre>
  `;
  document.body.innerHTML = "";
  document.body.appendChild(overlay);
}

console.log("[APP] Iniciando React");
console.log("[APP] Entorno:", process.env.NODE_ENV);
console.log("[APP] electronAPI disponible:", !!window.electronAPI);

window.addEventListener("error", (event) => {
  console.error("[APP] Error global:", event.error);
  if (event.error) {
    showOverlayError("Error de ejecución", event.error.stack || event.error.message);
  }
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("[APP] Promise rechazada:", event.reason);
  if (event.reason) {
    showOverlayError("Promise rechazada", event.reason.stack || event.reason.message);
  }
});

try {
  const container = document.getElementById("root");
  if (!container) {
    throw new Error("No se encontró el contenedor root");
  }
  const root = createRoot(container);
  root.render(<App />);
  console.log("[APP] React montado correctamente");
} catch (error) {
  console.error("[APP] Error al montar React:", error);
  showOverlayError("Error al montar React", error?.stack || error?.message);
}
