// main.jsx — the starting point of the app.
// It finds the empty <div id="root"> in index.html and draws your component into it.

import React from "react";
import ReactDOM from "react-dom/client";
import RCMRConsole from "./RCMRConsole.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RCMRConsole />
  </React.StrictMode>
);
