import { useState } from "react";
import { useForm } from "react-hook-form";
import { useSelector } from "react-redux";
import { Link, Navigate, useNavigate } from "react-router-dom";
import type { RegistrationModel } from "../../../models/user-model";
import type { AppState } from "../../../redux/store";
import { userService } from "../../../services/user-service";
import { errorMessage } from "../../../utils/api";

// Displays the registration or login form according to the selected mode.
export function AuthPage({ mode }: { mode: "login" | "register" }) {
    const signingUp = mode === "register";
    const { user, ready, error: sessionError } = useSelector((state: AppState) => state.auth);
    const { register, handleSubmit, formState: { isSubmitting } } = useForm<RegistrationModel>();
    const [error, setError] = useState("");
    const navigate = useNavigate();

    // Submits the form and opens the vacations page after successful authentication.
    async function send(values: RegistrationModel) {
        setError("");
        try {
            if (signingUp) await userService.register(values);
            else await userService.login({ email: values.email, password: values.password });
            navigate("/vacations", { replace: true });
        } catch (failure) { setError(errorMessage(failure)); }
    }
    if (!ready) return <div className="loading-state" role="status">Getting things ready…</div>;
    if (user) return <Navigate to="/vacations" replace />;

    return <section className="auth-layout">
        <div className="auth-story">
            <img src="/images/escape.jpg" alt="Whitewashed buildings overlooking the sea in Santorini" />
            <div className="story-shade" />
            <span className="story-kicker">LESS ROUTINE. MORE DISCOVERY.</span>
            <div className="story-copy">
                <span className="eyebrow light">YOUR NEXT CHAPTER STARTS HERE</span>
                <h1>Somewhere<br />you'd rather be.</h1>
                <p>Beautiful places. New perspectives.<br />Find the escape that feels like you.</p>
                <span className="location-label">↗ &nbsp; Santorini, Greece</span>
            </div>
        </div>
        <div className="auth-form-panel">
            <span className="eyebrow">A WORLD OF POSSIBILITIES</span>
            <h2>{signingUp ? "Your next adventure awaits." : "Welcome back."}</h2>
            <p className="muted">{signingUp ? "Create your account and start collecting places you love." : "Sign in to find your next escape and revisit your favorites."}</p>
            <form onSubmit={handleSubmit(send)}>
                {signingUp && <div className="name-fields">
                    <div className="field"><label htmlFor="firstName">First name</label>
                    <input id="firstName" autoComplete="given-name" required maxLength={50} {...register("firstName")} /></div>
                    <div className="field"><label htmlFor="lastName">Last name</label>
                    <input id="lastName" autoComplete="family-name" required maxLength={50} {...register("lastName")} /></div>
                </div>}
                <div className="field"><label htmlFor="email">Email address</label>
                    <input id="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={100} {...register("email")} />
                </div>
                <div className="field"><label htmlFor="password">Password</label>
                    <input id="password" type="password" autoComplete={signingUp ? "new-password" : "current-password"} required minLength={4} maxLength={100} aria-describedby={signingUp ? "password-hint" : undefined} {...register("password")} />
                    {signingUp && <small id="password-hint">At least 4 characters.</small>}
                </div>
                {(error || sessionError) && <div className="error-message" role="alert">{error || sessionError}</div>}
                <button className="button full-width" disabled={isSubmitting}>
                    {isSubmitting ? "One moment…" : signingUp ? "Create my account" : "Sign in"} <span aria-hidden="true">↗</span>
                </button>
            </form>
            <p className="auth-switch">{signingUp ? "Already part of the journey?" : "New to Vacationly?"}{" "}
                <Link to={signingUp ? "/login" : "/register"}>{signingUp ? "Sign in" : "Create an account"}</Link>
            </p>
            <div className="auth-note"><span aria-hidden="true">✦</span> A little inspiration goes a long way.</div>
        </div>
    </section>;
}
