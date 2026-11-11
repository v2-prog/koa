import "@fontsource-variable/figtree";
import "@fontsource-variable/fraunces/opsz.css";
import "./styles.css";

import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { noteExternalChange } from "@/lib/local-store";
import { router } from "./router";

// Another tab on this device changed something: show it here too.
window.addEventListener("storage", (event) => {
  if (event.storageArea === window.localStorage) noteExternalChange(event.key);
});

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}
