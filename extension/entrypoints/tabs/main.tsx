import React from "react"
import ReactDOM from "react-dom/client"
import { setAuthPlatform } from "@tas/utils/appAuth"
import { extensionAuthPlatform } from "../../utils/auth"
import App from "./App"
import "./globals.css"

setAuthPlatform(extensionAuthPlatform)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
