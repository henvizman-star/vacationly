import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Generate a portable collection; all destructive management requests target the newly created ID.
function item(name, method, endpoint, body, publicRoute = false) {
    return {
        name,
        request: {
            method,
            url: "{{baseUrl}}" + endpoint,
            ...(publicRoute ? { auth: { type: "noauth" } } : {}),
            ...(body
                ? {
                      body,
                      header:
                          body.mode === "raw"
                              ? [{ key: "Content-Type", value: "application/json" }]
                              : [],
                  }
                : {}),
        },
    };
}
const json = (value) => ({
    mode: "raw",
    raw: JSON.stringify(value, null, 2),
    options: { raw: { language: "json" } },
});
const fields = {
    destination: "Paris",
    country: "France",
    continent: "Europe",
    description: "Explore the city.",
    startDate: "{{startDate}}",
    endDate: "{{endDate}}",
    price: "1290.50",
};
const multipart = (withImage) => ({
    mode: "formdata",
    formdata: [
        ...Object.entries(fields).map(([key, value]) => ({ key, value, type: "text" })),
        ...(withImage ? [{ key: "image", type: "file", src: "" }] : []),
    ],
});
const register = item(
    "Register a regular user",
    "POST",
    "/api/register",
    json({ firstName: "Test", lastName: "User", email: "{{email}}", password: "{{password}}" }),
    true,
);
const login = item(
    "Login (use admin credentials for management)",
    "POST",
    "/api/login",
    json({ email: "{{email}}", password: "{{password}}" }),
    true,
);
for (const entry of [register, login])
    entry.event = [
        {
            listen: "test",
            script: {
                type: "text/javascript",
                exec: [
                    "if (pm.response.code === 200 || pm.response.code === 201) pm.collectionVariables.set('token', pm.response.json());",
                ],
            },
        },
    ];
const add = item("Add vacation (choose an image file)", "POST", "/api/vacations", multipart(true));
add.event = [
    {
        listen: "test",
        script: {
            type: "text/javascript",
            exec: [
                "if (pm.response.code === 201) pm.collectionVariables.set('createdVacationId', String(pm.response.json().id));",
            ],
        },
    },
];
const collection = {
    info: {
        name: "Vacationly — Complete API",
        description:
            "Authenticate as User for likes and Admin for management/reports. Choose future startDate/endDate and a real JPEG/PNG for uploads. AI endpoints require OPENAI_API_KEY on the server. Delete targets only createdVacationId from Add.",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
    },
    auth: { type: "bearer", bearer: [{ key: "token", value: "{{token}}", type: "string" }] },
    variable: Object.entries({
        baseUrl: "http://localhost:4001",
        email: "student@example.com",
        password: "1234",
        token: "",
        vacationId: "1",
        createdVacationId: "",
        startDate: "2030-01-01",
        endDate: "2030-01-05",
    }).map(([key, value]) => ({ key, value })),
    item: [
        item("Health", "GET", "/api/health", null, true),
        register,
        login,
        item("Current user", "GET", "/api/me"),
        ...["all", "liked", "active", "upcoming"].map((filter) =>
            item("Vacations — " + filter, "GET", "/api/vacations?filter=" + filter + "&page=1"),
        ),
        item("Second page", "GET", "/api/vacations?page=2"),
        item("Like", "PUT", "/api/vacations/{{vacationId}}/like"),
        item("Unlike", "DELETE", "/api/vacations/{{vacationId}}/like"),
        add,
        item("Read created vacation", "GET", "/api/vacations/{{createdVacationId}}"),
        item(
            "Edit and keep image",
            "PUT",
            "/api/vacations/{{createdVacationId}}",
            multipart(false),
        ),
        item(
            "Edit and replace image",
            "PUT",
            "/api/vacations/{{createdVacationId}}",
            multipart(true),
        ),
        item("Likes report", "GET", "/api/vacations/report"),
        item("Download CSV", "GET", "/api/vacations/report.csv"),
        item(
            "AI travel recommendation",
            "POST",
            "/api/ai/recommendation",
            json({ destination: "Rome" }),
        ),
        item(
            "Ask database through MCP",
            "POST",
            "/api/ai/question",
            json({ question: "Which upcoming vacations are in Europe?" }),
        ),
        item("Delete created vacation", "DELETE", "/api/vacations/{{createdVacationId}}"),
    ],
};
await fs.writeFile(
    path.join(root, "Backend/Vacationly.postman_collection.json"),
    JSON.stringify(collection, null, 2) + "\n",
);
console.log("Updated complete Postman collection.");
