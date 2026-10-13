import type { VacationModel } from "../../../models/vacation-model";
import { Link } from "react-router-dom";

const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});
const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
});
// Interprets database dates in UTC so local time zones do not shift the day.
function displayDate(value: string) {
    return date.format(new Date(value + "T00:00:00Z"));
}

type Props = {
    vacation: VacationModel;
    isAdmin: boolean;
    busy: boolean;
    onLike: (vacation: VacationModel) => void;
    onDelete?: (vacation: VacationModel) => void;
};
// Shows one vacation and offers a like button only to regular users.
export function VacationCard({ vacation, isAdmin, busy, onLike, onDelete }: Props) {
    return (
        <article className="vacation-card">
            <div className="card-image">
                <img
                    loading="lazy"
                    src={vacation.imageUrl}
                    alt={vacation.destination + ", " + vacation.country}
                />
                <span className="country-tag">{vacation.country}</span>
                {!isAdmin && (
                    <button
                        className={"like-button" + (vacation.isLiked ? " liked" : "")}
                        aria-label={(vacation.isLiked ? "Unlike " : "Like ") + vacation.destination}
                        aria-pressed={vacation.isLiked}
                        disabled={busy}
                        onClick={() => onLike(vacation)}
                    >
                        <span aria-hidden="true">{vacation.isLiked ? "♥" : "♡"}</span>{" "}
                        {vacation.likesCount}
                    </button>
                )}
            </div>
            <div className="card-body">
                <div className="card-heading">
                    <h2>{vacation.destination}</h2>
                    <span aria-hidden="true">↗</span>
                </div>
                <div className="card-dates">
                    <time dateTime={vacation.startDate}>{displayDate(vacation.startDate)}</time>
                    <span>—</span>
                    <time dateTime={vacation.endDate}>{displayDate(vacation.endDate)}</time>
                </div>
                <p>{vacation.description}</p>
                <div className="card-bottom">
                    <span className="price">{money.format(vacation.price)}</span>
                    <span>
                        {vacation.likesCount}{" "}
                        {vacation.likesCount === 1 ? "traveler likes" : "travelers like"} this
                    </span>
                </div>
                {isAdmin && onDelete && (
                    <div className="card-admin-actions">
                        <Link
                            className="button button-small"
                            to={"/vacations/" + vacation.id + "/edit"}
                        >
                            Edit
                        </Link>
                        <button
                            className="button-quiet"
                            disabled={busy}
                            onClick={() => onDelete(vacation)}
                        >
                            Delete {vacation.destination}
                        </button>
                    </div>
                )}
            </div>
        </article>
    );
}
