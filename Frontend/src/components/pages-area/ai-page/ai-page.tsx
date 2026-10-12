import { useState } from "react";
import { api, errorMessage } from "../../../utils/api";

// Two protected pages share request states while retaining separate API operations.
export function AiPage({ questions = false }: { questions?: boolean }) {
    const [text, setText] = useState("");
    const [answer, setAnswer] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    async function send(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy || !text.trim()) return;
        setBusy(true); setError(""); setAnswer("");
        try {
            const response = await api.post<{ answer: string }>(questions ? "/ai/question" : "/ai/recommendation",
                questions ? { question: text.trim() } : { destination: text.trim() }, { timeout: 150000 });
            setAnswer(response.data.answer);
        } catch (failure) { setError(errorMessage(failure)); }
        finally { setBusy(false); }
    }
    return <section className="vacation-form-page">
        <span className="eyebrow">{questions ? "YOUR VACATION COLLECTION" : "A LITTLE INSPIRATION"}</span>
        <h1>{questions ? "Ask about vacations" : "Plan your next escape"}</h1>
        <p className="muted">{questions ? "Ask about active vacations, average prices, or upcoming trips in Europe." : "Enter a destination to get travel ideas and practical tips."}</p>
        <form onSubmit={send}>
            <div className="field">
                <label htmlFor="ai-input">{questions ? "Your question" : "Destination"}</label>
                <textarea id="ai-input" required maxLength={questions ? 1000 : 200} rows={3} value={text}
                    disabled={busy} onChange={event => setText(event.target.value)} />
            </div>
            <button className="button" disabled={busy || !text.trim()}>{busy ? "Thinking…" : questions ? "Ask question" : "Get recommendation"}</button>
        </form>
        {busy && <p role="status">Preparing your answer…</p>}
        {error && <p className="error-message" role="alert">{error}</p>}
        {/* Render plain text so provider output cannot introduce executable HTML. */}
        {answer && <article className="ai-answer" aria-live="polite"><h2>{questions ? "Database answer" : "Travel recommendation"}</h2><p>{answer}</p></article>}
    </section>;
}
