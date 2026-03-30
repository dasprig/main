import "./polyfills";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Load environment variables for development
if (process.env.NODE_ENV === 'development') {
  console.log('🔧 Development mode - Database features enabled');
}

createRoot(document.getElementById("root")!).render(<App />);
