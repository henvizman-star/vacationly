import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { vacationService } from "../../../services/vacation-service";
import { errorMessage } from "../../../utils/api";

// Graph and accessible table show all vacations, rather than the current card page.
export function VacationReport() {
    const [rows, setRows] = useState<{ id: number; destination: string; likes: number }[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        vacationService
            .getReport()
            .then((data) => {
                if (active) setRows(data);
            })
            .catch((failure) => {
                if (active) setError(errorMessage(failure));
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    // Keep the user on this page when the protected download fails.
    async function download() {
        setDownloading(true);
        setError("");
        try {
            await vacationService.downloadReport();
        } catch (failure) {
            setError(errorMessage(failure));
        } finally {
            setDownloading(false);
        }
    }

    return (
        <section className="explore-page">
            <span className="eyebrow">VACATION INSIGHTS</span>
            <h1>Vacation likes</h1>
            <p className="muted">See which destinations inspire your travelers.</p>
            <button className="button" disabled={downloading || loading} onClick={download}>
                {downloading ? "Downloading…" : "Download CSV"}
            </button>
            {error && (
                <p className="error-message" role="alert">
                    {error}
                </p>
            )}
            {loading ? (
                <p role="status">Loading report…</p>
            ) : (
                <>
                    {rows.length === 0 ? (
                        <p>No vacations to report yet.</p>
                    ) : (
                        <>
                            <div
                                className="report-chart"
                                role="img"
                                aria-label="Vacation likes bar chart. Exact values are in the table below."
                            >
                                <ResponsiveContainer width="100%" height={360}>
                                    <BarChart
                                        data={rows}
                                        margin={{ top: 20, right: 20, bottom: 50, left: 15 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="destination"
                                            angle={-35}
                                            textAnchor="end"
                                            interval={0}
                                            height={85}
                                            label={{
                                                value: "Destination",
                                                position: "insideBottom",
                                                offset: -20,
                                            }}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            label={{
                                                value: "Likes",
                                                angle: -90,
                                                position: "insideLeft",
                                            }}
                                        />
                                        <Tooltip />
                                        <Bar dataKey="likes" name="Likes" fill="var(--blue)" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="report-table-wrap">
                                <table className="report-table">
                                    <caption>Likes for each vacation</caption>
                                    <thead>
                                        <tr>
                                            <th scope="col">Vacation ID</th>
                                            <th scope="col">Destination</th>
                                            <th scope="col">Likes</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr key={row.id}>
                                                <td>{row.id}</td>
                                                <td>{row.destination}</td>
                                                <td>{row.likes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </>
            )}
        </section>
    );
}
