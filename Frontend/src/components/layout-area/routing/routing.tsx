import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "../../shared-area/protected-route/protected-route";
import { AuthPage } from "../../user-area/auth-page/auth-page";
import { VacationList } from "../../vacation-area/vacation-list/vacation-list";
import { AddVacation } from "../../vacation-area/add-vacation/add-vacation";
import { lazy, Suspense } from "react";
import { AiPage } from "../../pages-area/ai-page/ai-page";
import { About } from "../../pages-area/about/about";
import { Page404 } from "../../pages-area/page404/page404";

// Load the chart library only when an administrator opens the reporting page.
const VacationReport = lazy(() =>
    import("../../vacation-area/vacation-report/vacation-report").then((module) => ({
        default: module.VacationReport,
    })),
);

// Maps browser paths to pages and protects the vacation page from guests.
export function Routing() {
    return (
        <Suspense
            fallback={
                <p className="loading-state" role="status">
                    Loading page…
                </p>
            }
        >
            <Routes>
                <Route path="/" element={<Navigate to="/vacations" replace />} />
                <Route path="/login" element={<AuthPage key="login" mode="login" />} />
                <Route path="/register" element={<AuthPage key="register" mode="register" />} />
                <Route element={<ProtectedRoute />}>
                    <Route path="/vacations" element={<VacationList />} />
                    <Route path="/recommendations" element={<AiPage key="recommendations" />} />
                    <Route path="/questions" element={<AiPage key="questions" questions />} />
                </Route>
                <Route element={<ProtectedRoute adminOnly />}>
                    <Route path="/vacations/new" element={<AddVacation key="create" />} />
                    <Route
                        path="/vacations/:id/edit"
                        element={<AddVacation key="edit" editing />}
                    />
                    <Route path="/reports" element={<VacationReport />} />
                </Route>
                <Route path="/about" element={<About />} />
                <Route path="*" element={<Page404 />} />
            </Routes>
        </Suspense>
    );
}
