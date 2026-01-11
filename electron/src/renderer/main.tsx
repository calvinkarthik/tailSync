import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import { NotchWindow } from "./components/NotchWindow"
import "./styles.css"

const params = new URLSearchParams(window.location.search)
const isNotchWindow = params.get("window") === "notch"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isNotchWindow ? <NotchWindow /> : <App />}
  </React.StrictMode>,
)
