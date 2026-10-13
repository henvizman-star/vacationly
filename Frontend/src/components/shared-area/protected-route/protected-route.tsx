import { useSelector } from "react-redux";
import { Navigate, Outlet } from "react-router-dom";
import type { AppState } from "../../../redux/store";
import { Role } from "../../../models/enums";
// Waits for session restoration, then redirects guests away from private pages.
export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
    const { user, ready } = useSelector((state: AppState) => state.auth);
    if (!ready)
        return (
            <div className="loading-state" role="status">
                Getting things ready…
            </div>
        );
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && user.roleId !== Role.Admin) return <Navigate to="/vacations" replace />;
    return <Outlet />;
}
