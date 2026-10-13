import { Link, NavLink, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { AppState } from "../../../redux/store";
import { userService } from "../../../services/user-service";
import { Role } from "../../../models/enums";
import { Routing } from "../routing/routing";
import { ScenicBackground } from "./scenic-background";

// Renders the shared header, navigation, page content, and footer.
export function Layout() {
    const { user } = useSelector((state: AppState) => state.auth);
    const navigate = useNavigate();
    // Clears the session and returns the browser to the sign-in page.
    function logout() {
        userService.logout();
        navigate("/login");
    }

    return (
        <div className="app-shell">
            <ScenicBackground />
            <a className="skip-link" href="#main">
                Skip to content
            </a>
            <header className="site-header">
                <Link
                    className="brand"
                    to={user ? "/vacations" : "/login"}
                    aria-label="Vacationly home"
                >
                    <span className="brand-mark" aria-hidden="true">
                        v.
                    </span>
                    vacationly<span className="brand-dot">.</span>
                </Link>
                <nav aria-label="Main navigation">
                    {user ? (
                        <>
                            <NavLink to="/vacations">Explore vacations</NavLink>
                            <NavLink to="/recommendations">Travel ideas</NavLink>
                            <NavLink to="/questions">Ask vacations</NavLink>
                            {user.roleId === Role.Admin && <NavLink to="/reports">Reports</NavLink>}
                            <span className="user-name">
                                {user.firstName} {user.lastName}
                            </span>
                            {user.roleId === Role.Admin && (
                                <span className="role-badge">Admin</span>
                            )}
                            <button className="button-quiet" onClick={logout}>
                                Sign out <span aria-hidden="true">↗</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <NavLink to="/login">Sign in</NavLink>
                            <Link className="button button-small" to="/register">
                                Create account <span aria-hidden="true">↗</span>
                            </Link>
                        </>
                    )}
                </nav>
            </header>
            <main id="main">
                <Routing />
            </main>
            <footer className="site-footer">
                <span>
                    © {new Date().getFullYear()} Vacationly. A little closer to your next escape.
                </span>
                <Link to="/about">
                    About Vacationly <span aria-hidden="true">↗</span>
                </Link>
            </footer>
        </div>
    );
}
