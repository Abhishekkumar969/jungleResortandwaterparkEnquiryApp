import React from "react"
import ThemeProvider from "../src/components/theme-provider"
import "./globals.css"

export default function Layout({ children }) {
  return (
    <div className="app-root">
      {/* You can add a global ThemeProvider or Context here */}
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </div>
  )
}
