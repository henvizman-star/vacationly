import { Link } from "react-router-dom";
// Gives users a way back when no route matches the requested URL.
export function Page404() {
    return <section className="empty-state"><span className="eyebrow">404 / A SMALL DETOUR</span><h1>This stop isn't on the map.</h1><p>Let's get you back to somewhere good.</p><Link className="button" to="/vacations">Back to vacations ↗</Link></section>;
}
