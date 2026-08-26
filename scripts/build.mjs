import { copyFile, mkdir } from "node:fs/promises";

const outputDirectory = new URL("../.pages-dist/", import.meta.url);
const publicFiles = ["index.html", "style.css", "script.js"];

await mkdir(outputDirectory, { recursive: true });

await Promise.all(
  publicFiles.map((file) =>
    copyFile(new URL(`../${file}`, import.meta.url), new URL(file, outputDirectory)),
  ),
);
