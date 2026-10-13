import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import express from "express";
import request from "supertest";
import type { UploadedFile } from "express-fileupload";

process.env.JWT_SECRET = "test-only-secret-never-used-outside-test-suite";
process.env.MYSQL_PASSWORD = "test-only";
const { ImageStorage, maxImageBytes } = await import("../src/utils/image-storage");
const { uploadMiddleware } = await import("../src/middleware/upload-middleware");
const { errorMiddleware } = await import("../src/middleware/error-middleware");
const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC9sAAAAASUVORK5CYII=",
    "base64",
);
function upload(data = png, mimetype = "image/png"): UploadedFile {
    return {
        name: "../../overwrite.png",
        data,
        size: data.length,
        mimetype,
        truncated: false,
        encoding: "7bit",
        tempFilePath: "",
        md5: "",
        mv: async () => {},
    };
}

test("images receive unique names, preserve content, and can be removed without touching seed images", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "vacationly-image-test-"));
    const storage = new ImageStorage(directory);
    try {
        const first = await storage.save(upload());
        const second = await storage.save(upload());
        assert.notEqual(first, second);
        assert.match(first, /^[a-f0-9-]+\.png$/);
        assert.deepEqual(await fs.readFile(path.join(directory, first)), png);
        const jpeg = await fs.readFile("assets/images/rome.jpg");
        const third = await storage.save(upload(jpeg, "image/jpeg"));
        assert.match(third, /\.jpg$/);
        await assert.rejects(storage.remove("../outside.png"), { status: 400 });
        await assert.rejects(storage.remove("rome.jpg"), { status: 400 });
        await storage.remove(first);
        await storage.remove(first); // Missing files are safe to clean up again.
        await storage.remove(second);
        await storage.remove(third);
        assert.deepEqual(await fs.readdir(directory), []);
    } finally {
        // This directory was created exclusively by this test under the OS temporary folder.
        await fs.rm(directory, { recursive: true, force: true });
    }
});

test("invalid, empty, oversized and multiple images are rejected", async () => {
    const storage = new ImageStorage();
    assert.throws(() => storage.getImage(undefined), { status: 422 });
    assert.equal(storage.getImage(undefined, false), undefined);
    assert.throws(() => storage.getImage({ image: [upload(), upload()] }), { status: 422 });
    assert.throws(() => storage.getImage({ other: upload() }), { status: 422 });
    await assert.rejects(storage.save(upload(Buffer.from("not an image"))), { status: 422 });
    await assert.rejects(storage.save(upload(png, "image/jpeg")), { status: 422 });
    await assert.rejects(storage.save(upload(Buffer.alloc(0))), { status: 422 });
    await assert.rejects(storage.save({ ...upload(), truncated: true }), { status: 413 });
    await assert.rejects(storage.save(upload(Buffer.alloc(maxImageBytes + 1))), { status: 413 });
});

test("multipart parser accepts one image and returns JSON errors for multiple or oversized uploads", async () => {
    const storage = new ImageStorage();
    const app = express();
    // This focused endpoint checks the multipart parser independently of authentication.
    app.post("/upload", uploadMiddleware, (req, res) => {
        const file = storage.getImage(req.files)!;
        res.json({ size: file.size, destination: req.body.destination });
    });
    app.use(errorMiddleware.catchAll);
    const success = await request(app)
        .post("/upload")
        .field("destination", "Rome")
        .attach("image", png, "rome.png");
    assert.equal(success.status, 200);
    assert.deepEqual(success.body, { size: png.length, destination: "Rome" });
    const duplicate = await request(app)
        .post("/upload")
        .attach("image", png, "a.png")
        .attach("image", png, "b.png");
    assert.equal(duplicate.status, 422);
    const large = await request(app)
        .post("/upload")
        .attach("image", Buffer.alloc(maxImageBytes + 1), "large.png");
    assert.equal(large.status, 413);
    assert.equal(typeof large.body.message, "string");
});
