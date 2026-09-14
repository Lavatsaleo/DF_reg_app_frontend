import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import "./index.css";
import "./brand-overrides.css";
import "./brand-components.css";
import "./responsive-fixes.css";
import "./digital-futures-brand.css";
import "./landing-cleanup.css";
import "./application-cleanup.css";
import "./programme-wide-brand.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
