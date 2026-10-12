import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import type { AppState } from "../../../redux/store";
import { Role } from "../../../models/enums";
import type { VacationFilter, VacationModel, VacationPage } from "../../../models/vacation-model";
import { vacationService } from "../../../services/vacation-service";
import { errorMessage } from "../../../utils/api";
import { VacationCard } from "../vacation-card/vacation-card";

const filters: { value: VacationFilter; label: string }[] = [
    { value: "all", label: "All vacations" }, { value: "liked", label: "My favorites" },
    { value: "active", label: "Happening now" }, { value: "upcoming", label: "Coming up" }
];
// Displays filtered vacation cards and pagination for the signed-in user.
export function VacationList() {
    const location = useLocation();
    const user = useSelector((state: AppState) => state.auth.user);
    const isAdmin = user?.roleId === Role.Admin;
    const [filter, setFilter] = useState<VacationFilter>("all");
    const [page, setPage] = useState(1);
    const [data, setData] = useState<VacationPage | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [revision, setRevision] = useState(0);
    const mutationPending = useRef(false);

    // Reloads when the filter, page, or like state changes; cancels stale requests.
    useEffect(() => {
        const controller = new AbortController();
        setLoading(true); setError(""); setData(null);
        vacationService.getPage(filter, page, controller.signal)
            .then(result => { setData(result); if (result.page !== page) setPage(result.page); })
            .catch(failure => { if (!axios.isCancel(failure)) setError(errorMessage(failure)); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [filter, page, revision]);

    // Saves a like change, then refreshes counts and pagination from the server.
    async function toggleLike(vacation: VacationModel) {
        if (mutationPending.current) return;
        mutationPending.current = true; setBusy(true); setError("");
        try {
            await vacationService.setLike(vacation.id, !vacation.isLiked);
            // Keep the lock until fresh counts and personal like state have arrived.
            const result = await vacationService.getPage(filter, page);
            setData(result);
            if (result.page !== page) setPage(result.page);
        } catch (failure) { setError(errorMessage(failure)); }
        finally { mutationPending.current = false; setBusy(false); }
    }

    // A cancelled confirmation performs no request and leaves the vacation untouched.
    async function deleteVacation(vacation: VacationModel) {
        if (mutationPending.current || !window.confirm("Delete " + vacation.destination + "? This cannot be undone.")) return;
        mutationPending.current = true; setBusy(true); setError("");
        try {
            await vacationService.remove(vacation.id);
            const result = await vacationService.getPage(filter, page);
            setData(result);
            if (result.page !== page) setPage(result.page);
        } catch (failure) { setError(errorMessage(failure)); }
        finally { mutationPending.current = false; setBusy(false); }
    }

    return <section className="explore-page">
        {location.state?.createdDestination && <p className="success-message" role="status">
            {location.state.createdDestination} was added to the collection.
        </p>}
        {location.state?.updatedDestination && <p className="success-message" role="status">
            {location.state.updatedDestination} was updated.
        </p>}
        <div className="explore-hero">
            <div><span className="eyebrow">GO SOMEWHERE GOOD</span>
            <h1>A change of scenery.<br /><em>A world of possibility.</em></h1>
            <p>Explore beautiful destinations and save the ones that stay with you.</p></div>
            <div className="hero-stamp" aria-hidden="true"><span>TAKE THE SCENIC ROUTE</span><b>↗</b><span>MAKE ROOM FOR WONDER</span></div>
        </div>
        <div className="collection-heading"><div><span className="eyebrow">THE VACATION COLLECTION</span><h2>Where to next?</h2></div>
            {isAdmin ? <Link className="button button-small" to="/vacations/new">+ Add vacation</Link>
                : <span className="muted">Sorted by departure date</span>}</div>
        <div className="filter-bar" aria-label="Filter vacations">
            {filters.filter(item => !isAdmin || item.value !== "liked").map(item =>
                <button key={item.value} className={"filter-pill" + (filter === item.value ? " selected" : "")}
                    disabled={busy} aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setPage(1); }}>
                    {item.value === "liked" && <span aria-hidden="true">♡ </span>}{item.label}
                </button>)}
            {!loading && data && <span className="result-count">{data.total} {data.total === 1 ? "vacation" : "vacations"}</span>}
        </div>
        {error && <div className="error-message" role="alert">{error} <button className="inline-button" onClick={() => setRevision(value => value + 1)}>Try again</button></div>}
        {loading ? <div className="loading-state" role="status">Finding your next escape…</div>
            : !error && data && data.total === 0 ? <div className="empty-state"><span aria-hidden="true">✦</span><h2>No vacations here yet.</h2><p>{filter === "liked" ? "Tap a heart on a vacation to save it here." : "Try another filter to explore more destinations."}</p>
                {filter !== "all" && <button className="button" onClick={() => { setFilter("all"); setPage(1); }}>Explore all vacations</button>}</div>
            : !error && data && <div className="vacation-grid">{data.vacations.map(vacation =>
                <VacationCard key={vacation.id} vacation={vacation} isAdmin={isAdmin} busy={busy} onLike={toggleLike} onDelete={deleteVacation} />)}</div>}
        {!loading && data && data.totalPages > 1 && <nav className="pagination" aria-label="Vacation pages">
            <button disabled={busy || data.page === 1} onClick={() => setPage(data.page - 1)}>← Previous</button>
            <span aria-live="polite">Page {data.page} of {data.totalPages}</span>
            <button disabled={busy || data.page === data.totalPages} onClick={() => setPage(data.page + 1)}>Next →</button>
        </nav>}
    </section>;
}
