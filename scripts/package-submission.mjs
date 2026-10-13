import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const name = process.argv[2] || "henvizman";
if (!/^[A-Za-z][A-Za-z0-9 _-]*$/.test(name))
    throw new Error("Use the student's English name without path characters.");
const output = path.join(root, "artifacts", name);
// Rebuild only the validated staging folder so removed source files cannot survive in a new ZIP.
const artifactsRoot = path.resolve(root, "artifacts");
if (path.dirname(path.resolve(output)) !== artifactsRoot) throw new Error("Invalid staging path.");
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
// Copy only deliverables; secrets, dependencies, build caches and the class reference stay out.
for (const directory of ["Backend", "Frontend", "Database", "scripts", "docs"]) {
    await fs.cp(path.join(root, directory), path.join(output, directory), {
        recursive: true,
        filter: (source) => {
            const base = path.basename(source);
            return (
                !["node_modules", "dist", "uploads", ".env", "test-results", "artifacts"].includes(
                    base,
                ) &&
                !base.startsWith(".env.") &&
                !base.endsWith(".tsbuildinfo")
            );
        },
    });
}
for (const file of [
    "README.md",
    "compose.yaml",
    ".dockerignore",
    ".gitignore",
    ".gitattributes",
    ".prettierrc.json",
    ".prettierignore",
    "package.json",
    "package-lock.json",
]) {
    await fs.copyFile(path.join(root, file), path.join(output, file));
}
if (process.platform !== "win32")
    throw new Error("The ZIP step currently requires PowerShell on Windows.");
// Pass paths as arguments to a fixed PowerShell command, without evaluating student-provided text.
const archive = path.join(root, "artifacts", name + ".zip");
const command =
    "Compress-Archive -LiteralPath $env:VACATIONLY_PACKAGE -DestinationPath $env:VACATIONLY_ZIP -Force";
await new Promise((resolve, reject) => {
    const child = spawn("powershell.exe", ["-NoProfile", "-Command", command], {
        env: { ...process.env, VACATIONLY_PACKAGE: output, VACATIONLY_ZIP: archive },
        stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
        code === 0 ? resolve() : reject(new Error("ZIP creation failed.")),
    );
});
console.log("Created artifacts/" + name + ".zip. Review docs/manual-review.md before uploading.");
