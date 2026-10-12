import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import express from "express";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { createServer } from "../../src/server";
import { appConfig } from "../../src/utils/app-config";
import { dal } from "../../src/utils/dal";
import { cyber } from "../../src/utils/cyber";
import { imageStorage } from "../../src/utils/image-storage";

const requireFrontend = createRequire(path.resolve("../Frontend/package.json"));
const { chromium, expect } = requireFrontend("@playwright/test");
const connection = await mysql.createConnection({ host: appConfig.mysqlHost, port: appConfig.mysqlPort,
    user: appConfig.mysqlUser, password: appConfig.mysqlPassword, database: appConfig.mysqlDatabase,
    dateStrings: true, decimalNumbers: true });
const originalExecute = dal.execute;
const originalSave = imageStorage.save.bind(imageStorage);
const images: string[] = [];
const tag = randomUUID().slice(0, 8);
const adminEmail = "browser-admin-" + tag + "@example.com";
const userEmail = "browser-user-" + tag + "@example.com";
const password = randomUUID();
const destination = "Browser QA " + tag;
const results = path.resolve("../test-results");
await fs.mkdir(results, { recursive: true });
const [engines] = await connection.execute<RowDataPacket[]>(
    "SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('users', 'vacations', 'likes')"
);
assert.equal(engines.length, 3);
assert.ok(engines.every(row => row.ENGINE === "InnoDB"));
await connection.beginTransaction();

// Run the real application queries in one transaction; rollback all browser test accounts and likes.
dal.execute = async <T>(sql: string, values: unknown[] = []) => (await connection.execute(sql, values))[0] as T;
imageStorage.save = async file => { const name = await originalSave(file); images.push(name); return name; };
const website = express();
const builtClient = path.resolve("../Frontend/dist");
website.use(express.static(builtClient));
website.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => res.sendFile(path.join(builtClient, "index.html")));
website.use(createServer());
const listener = website.listen(0, "127.0.0.1");
await new Promise<void>(resolve => listener.once("listening", resolve));
const address = listener.address();
assert.ok(address && typeof address !== "string");
const baseUrl = "http://127.0.0.1:" + address.port;
let browser: any;
try {
    await connection.execute("INSERT INTO users (firstName, lastName, email, passwordHash, roleId) VALUES (?, ?, ?, ?, 1)",
        ["Browser", "Admin", adminEmail, await cyber.hashPassword(password)]);
    browser = await chromium.launch({ channel: "msedge", headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    page.setDefaultTimeout(15000);
    const errors: string[] = [];
    page.on("pageerror", (error: Error) => errors.push(error.message));
    await page.goto(baseUrl + "/vacations");
    await expect(page.getByRole("heading", { name: "Welcome back." })).toBeVisible();
    await page.goto(baseUrl + "/about");
    await expect(page.getByText("henvizman", { exact: true })).toBeVisible();
    await page.goto(baseUrl + "/login");
    await page.getByLabel("Email address").fill(adminEmail);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: false }).click();
    await expect(page.getByRole("heading", { name: "Where to next?" })).toBeVisible();
    assert.equal(await page.getByRole("button", { name: /^Like / }).count(), 0);
    await page.getByRole("link", { name: "+ Add vacation" }).click();
    await page.getByLabel("Destination", { exact: true }).fill(destination);
    await page.getByLabel("Country", { exact: true }).fill("France");
    await page.getByLabel("Continent", { exact: true }).selectOption("Europe");
    await page.getByLabel("Description", { exact: true }).fill("Created by the real browser integration test.");
    const today = new Date().toISOString().slice(0, 10);
    await page.getByLabel("Start date", { exact: true }).fill(today);
    await page.getByLabel("End date", { exact: true }).fill(today);
    await page.getByLabel("Price (USD)", { exact: true }).fill("1290.50");
    await page.getByLabel("Vacation image").setInputFiles(path.resolve("assets/images/paris.jpg"));
    await page.getByRole("button", { name: "Add vacation", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "was added" })).toBeVisible();
    await page.getByRole("button", { name: "Happening now", exact: true }).click();
    const card = () => page.locator(".vacation-card").filter({ has: page.getByRole("heading", { name: destination, exact: true }) });
    await expect(card()).toBeVisible();
    await card().getByRole("link", { name: "Edit", exact: true }).click();
    await expect(page.getByLabel("Destination", { exact: true })).toHaveValue(destination);
    await page.getByLabel("Start date", { exact: true }).fill("2020-01-01");
    await page.getByLabel("End date", { exact: true }).fill("2020-01-02");
    await page.getByLabel("Price (USD)", { exact: true }).fill("10000");
    await page.screenshot({ path: path.join(results, "edit-real-mysql.png"), fullPage: true });
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(card()).toBeVisible();
    await card().getByRole("link", { name: "Edit", exact: true }).click();
    await expect(page.getByLabel("Destination", { exact: true })).toHaveValue(destination);
    await page.getByLabel("Vacation image").setInputFiles(path.resolve("assets/images/rome.jpg"));
    await page.getByRole("button", { name: "Save changes", exact: true }).click();
    await expect(card()).toBeVisible();
    page.once("dialog", (dialog: any) => dialog.dismiss());
    await card().getByRole("button", { name: "Delete " + destination, exact: true }).click();
    await expect(card()).toBeVisible();
    await page.getByRole("link", { name: "Reports", exact: true }).click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByRole("cell", { name: destination, exact: true })).toBeVisible();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV", exact: true }).click();
    const download = await downloaded;
    await download.saveAs(path.join(results, "browser-report.csv"));
    assert.match(await fs.readFile(path.join(results, "browser-report.csv"), "utf8"), /Destination,Likes/);
    await page.screenshot({ path: path.join(results, "report-real-mysql.png"), fullPage: true });
    await page.getByRole("link", { name: "Explore vacations", exact: true }).click();
    page.once("dialog", (dialog: any) => dialog.accept());
    await card().getByRole("button", { name: "Delete " + destination, exact: true }).click();
    await expect(card()).toHaveCount(0);
    await page.getByRole("button", { name: /Sign out/ }).click();

    // Registration and likes now run through the browser against the same real MySQL schema.
    await page.getByRole("link", { name: /Create account/ }).click();
    await page.getByLabel("First name", { exact: true }).fill("Browser");
    await page.getByLabel("Last name", { exact: true }).fill("User");
    await page.getByLabel("Email address", { exact: true }).fill(userEmail);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: /Create my account/ }).click();
    await expect(page.locator(".vacation-card")).toHaveCount(9);
    await page.getByRole("button", { name: /Next/ }).click();
    await expect(page.locator(".vacation-card")).toHaveCount(3);
    await page.getByRole("button", { name: /Previous/ }).click();
    await page.getByRole("button", { name: "Like Rome", exact: true }).click();
    await expect(page.getByRole("button", { name: "Unlike Rome", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: /My favorites/ }).click();
    await expect(page.locator(".vacation-card")).toHaveCount(1);
    await page.getByRole("button", { name: "Unlike Rome", exact: true }).click();
    await expect(page.getByText("No vacations here yet.", { exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Travel ideas", exact: true }).click();
    await page.getByLabel("Destination", { exact: true }).fill("Rome");
    // Do not spend a real API key in this test; missing-key error handling is verified separately.
    await page.getByRole("link", { name: "Ask vacations", exact: true }).click();
    await expect(page.getByLabel("Your question", { exact: true })).toBeVisible();
    await page.goto(baseUrl + "/vacations/new");
    await expect(page.getByRole("heading", { name: "Where to next?" })).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(results, "mobile-real-mysql.png"), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Where to next?" })).toBeVisible();
    assert.deepEqual(errors, []);
    console.log("Browser + real MySQL passed: auth, roles, CRUD/images, report/CSV, 9+3 paging, likes, session and mobile.");
} finally {
    if (browser) await browser.close();
    await new Promise<void>(resolve => listener.close(() => resolve()));
    dal.execute = originalExecute;
    imageStorage.save = originalSave;
    try {
        await connection.rollback();
        const [rows] = await connection.execute<RowDataPacket[]>("SELECT id FROM users WHERE email IN (?, ?)", [adminEmail, userEmail]);
        assert.equal(rows.length, 0);
    } finally {
        try { for (const image of images) await imageStorage.remove(image); }
        finally { await connection.end(); await dal.close(); }
    }
}
