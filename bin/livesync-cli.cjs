#!/usr/bin/env node
const path = require("path");
const distDir = path.join(__dirname, "..", "dist");
process.chdir(distDir);
require(path.join(distDir, "index.cjs"));
