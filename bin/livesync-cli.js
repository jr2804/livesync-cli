#!/usr/bin/env node
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const distDir = path.join(__dirname, "..", "dist");
require(path.join(distDir, "index.cjs"));
