import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import PomodoroApp from "./App";

const root = document.getElementById("root");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <PomodoroApp />
    </StrictMode>
  );
}
