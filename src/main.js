import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { redirectIfLoggedToApp } from "@/guards/redirect-if-logged";

function Root() {
  React.useEffect(() => {
    redirectIfLoggedToApp();
  }, []);
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
