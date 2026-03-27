import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

const basename = '/';

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={basename} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <App />
  </BrowserRouter>
);
