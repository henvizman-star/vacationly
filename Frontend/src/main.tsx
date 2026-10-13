import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { BrowserRouter } from "react-router-dom";
import { store } from "./redux/store";
import { userService } from "./services/user-service";
import { Layout } from "./components/layout-area/layout/layout";
// Bundle rounded Latin typography locally so the interface does not depend on a font CDN.
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "./index.css";

// Restore a saved session before protected routes decide what to render.
void userService.restoreSession();
createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <Layout />
            </BrowserRouter>
        </Provider>
    </StrictMode>,
);
