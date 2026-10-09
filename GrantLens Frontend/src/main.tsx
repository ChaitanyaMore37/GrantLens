import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
for (const preference of ["compact", "motion"])
  if (localStorage.getItem(`grantlens-${preference}`) === "true")
    document.documentElement.classList.add(
      preference === "motion" ? "reduce-motion" : "compact",
    );
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
