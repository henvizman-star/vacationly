import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { VacationInput } from "../../../models/vacation-model";
import { vacationService } from "../../../services/vacation-service";
import { errorMessage } from "../../../utils/api";

// File inputs return a FileList; the API receives its single selected image separately.
type VacationForm = VacationInput & { image: FileList };

// The surrounding ProtectedRoute allows administrators only; the API checks again.
export function AddVacation({ editing = false }: { editing?: boolean }) {
    const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<VacationForm>();
    const [error, setError] = useState("");
    const [loaded, setLoaded] = useState(!editing);
    const [imageUrl, setImageUrl] = useState("");
    const id = Number(useParams().id);
    const navigate = useNavigate();
    // Match the server's UTC date policy, including when validating a long-open form.
    const today = new Date().toISOString().slice(0, 10);
    const startDate = watch("startDate");

    // Reset React Hook Form from the API and cancel stale requests on navigation.
    useEffect(() => {
        if (!editing) return;
        const controller = new AbortController();
        setLoaded(false);
        setError("");
        vacationService.getOne(id, controller.signal).then(vacation => {
            if (controller.signal.aborted) return;
            const { destination, country, continent, description, startDate, endDate, price } = vacation;
            reset({ destination, country, continent, description, startDate, endDate, price });
            setImageUrl(vacation.imageUrl);
            setLoaded(true);
        }).catch(failure => { if (!controller.signal.aborted) setError(errorMessage(failure)); });
        return () => controller.abort();
    }, [editing, id, reset]);

    // Validate before uploading, preserve the form on failure, and navigate after success.
    async function send(values: VacationForm): Promise<void> {
        setError("");
        const { image: files, ...fields } = values;
        const image = files?.[0];
        const vacation = {
            ...fields,
            destination: fields.destination.trim(),
            country: fields.country.trim(),
            continent: fields.continent.trim(),
            description: fields.description.trim()
        };

        // HTML constraints guide entry; these checks also reject whitespace-only text.
        if (!vacation.destination || !vacation.country || !vacation.continent || !vacation.description) {
            setError("Complete all vacation details.");
            return;
        }
        if (!vacation.startDate || !vacation.endDate ||
            (!editing && vacation.startDate < new Date().toISOString().slice(0, 10)) || vacation.endDate < vacation.startDate) {
            setError(editing ? "End date must be on or after the start date." : "Choose dates from today onward, with the end on or after the start.");
            return;
        }
        if (!Number.isFinite(vacation.price) || vacation.price < 0 || vacation.price > 10000) {
            setError("Price must be between 0 and 10,000 USD.");
            return;
        }
        // Client checks give quick feedback; the server additionally checks file signatures.
        if ((!editing && !image) || (image && (files.length !== 1 || !["image/jpeg", "image/png"].includes(image.type)))) {
            setError("Select one JPEG or PNG image.");
            return;
        }
        if (image && (image.size === 0 || image.size > 5 * 1024 * 1024)) {
            setError("Select a non-empty image no larger than 5 MB.");
            return;
        }

        try {
            const saved = editing ? await vacationService.update(id, vacation, image) : await vacationService.add(vacation, image!);
            navigate("/vacations", { replace: true, state: editing ? { updatedDestination: saved.destination } : { createdDestination: saved.destination } });
        } catch (failure) {
            setError(errorMessage(failure));
        }
    }

    if (!loaded) return <section className="vacation-form-page">
        {error ? <p role="alert" className="error-message">{error}</p> : <p role="status">Loading vacation…</p>}
        <Link to="/vacations">Back to vacations</Link>
    </section>;

    return <section className="vacation-form-page">
        <span className="eyebrow">GROW THE COLLECTION</span>
        <h1>{editing ? "Edit vacation" : "Add a vacation"}</h1>
        <p className="muted">{editing ? "Keep the current image or choose a replacement. Past dates are allowed." : "All fields are required."} Prices are in USD.</p>
        <form onSubmit={handleSubmit(send)}>
            {/* Prevent editing or repeated submission while the upload is in progress. */}
            <fieldset disabled={isSubmitting}>
                <div className="field">
                    <label htmlFor="destination">Destination</label>
                    <input id="destination" required maxLength={100} {...register("destination")} />
                </div>
                <div className="name-fields">
                    <div className="field">
                        <label htmlFor="country">Country</label>
                        <input id="country" required maxLength={100} {...register("country")} />
                    </div>
                    <div className="field">
                        <label htmlFor="continent">Continent</label>
                        <select id="continent" required {...register("continent")}>
                            <option value="">Select a continent</option>
                            {["Africa", "Antarctica", "Asia", "Europe", "North America", "Oceania", "South America"].map(continent =>
                                <option key={continent} value={continent}>{continent}</option>)}
                        </select>
                    </div>
                </div>
                <div className="field">
                    <label htmlFor="description">Description</label>
                    <textarea id="description" required maxLength={10000} rows={5} {...register("description")} />
                </div>
                <div className="name-fields">
                    <div className="field">
                        <label htmlFor="startDate">Start date</label>
                        <input id="startDate" type="date" required min={editing ? undefined : today} {...register("startDate")} />
                    </div>
                    <div className="field">
                        <label htmlFor="endDate">End date</label>
                        <input id="endDate" type="date" required min={editing ? startDate : startDate && startDate > today ? startDate : today} {...register("endDate")} />
                    </div>
                </div>
                <div className="field">
                    <label htmlFor="price">Price (USD)</label>
                    <input id="price" type="number" required min={0} max={10000} step="0.01" {...register("price", { valueAsNumber: true })} />
                </div>
                <div className="field">
                    <label htmlFor="image">Vacation image</label>
                    {editing && <img className="current-image" src={imageUrl} alt="Current vacation" />}
                    <input id="image" type="file" required={!editing} accept="image/jpeg,image/png" aria-describedby="image-hint" {...register("image")} />
                    <small id="image-hint">One JPEG or PNG image, up to 5 MB.</small>
                </div>
                {error && <div className="error-message" role="alert">{error}</div>}
                <div className="vacation-form-actions">
                    <button className="button" type="submit">{isSubmitting ? "Saving vacation…" : editing ? "Save changes" : "Add vacation"}</button>
                    {!isSubmitting && <Link to="/vacations">Cancel</Link>}
                </div>
            </fieldset>
        </form>
    </section>;
}
