import "dotenv/config";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";
import cloudinary from "../config/cloudinary.js";
import BCAPaper from "../models/examPaper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pdfFolder = path.join(__dirname, "pdfs");

const paperMetadata = {
  "bca-sem2-all-question-papers.pdf": {
    batch: "2025-2028",
    semester: 2,
    type: "combined",
    group: null,
  },
  ...Object.fromEntries(
    [1, 2, 3, 4, 5].map((number) => [
      `2bca${number}-exam-paper-with-solutions.pdf`,
      {
        batch: "2025-2028",
        semester: 2,
        type: "solution",
        group: `2BCA${number}`,
      },
    ]),
  ),
};

const files = fs
  .readdirSync(pdfFolder)
  .filter((file) => file.toLowerCase().endsWith(".pdf"));

const waitFor = (promise, operation, timeoutMs = 30_000) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${operation} timed out after ${timeoutMs / 1_000} seconds.`));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });

const seedPdfs = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured.");
    }

    await waitFor(mongoose.connect(process.env.MONGODB_URI), "MongoDB connection");
    console.log("MongoDB connected");

    for (const file of files) {
      const metadata = paperMetadata[file];

      if (!metadata) {
        console.warn(`Skipped: ${file} has no seed metadata.`);
        continue;
      }

      const filePath = path.join(pdfFolder, file);
      const publicId = `gbc/pyq/${path.parse(file).name}`;

      try {
        const result = await waitFor(
          cloudinary.uploader.upload(filePath, {
            resource_type: "raw",
            public_id: publicId,
            overwrite: true,
          }),
          `Cloudinary upload for ${file}`,
        );

        await BCAPaper.updateOne(
          { cloudinaryPublicId: result.public_id },
          {
            $set: {
              ...metadata,
              fileName: file,
              url: result.secure_url,
              cloudinaryPublicId: result.public_id,
            },
          },
          { upsert: true, runValidators: true },
        );

        console.log(`Seeded: ${file} -> ${result.secure_url}`);
      } catch (error) {
        console.error(`Failed: ${file}`);
        console.error(error);
      }
    }
  } finally {
    await mongoose.disconnect();
  }
};

try {
  await seedPdfs();
  console.log("PDF seeding completed.");
} catch (error) {
  console.error("PDF seed failed:", error);
  process.exitCode = 1;
}
