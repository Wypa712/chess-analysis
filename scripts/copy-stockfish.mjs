import { copyFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/stockfish/src");
const dest = resolve(root, "public");

mkdirSync(dest, { recursive: true });
copyFileSync(`${src}/stockfish-nnue-16-single.js`, `${dest}/stockfish.js`);
// Copy wasm under both names: original (referenced internally by stockfish.js) and alias
copyFileSync(`${src}/stockfish-nnue-16-single.wasm`, `${dest}/stockfish-nnue-16-single.wasm`);
copyFileSync(`${src}/stockfish-nnue-16-single.wasm`, `${dest}/stockfish.wasm`);
console.log("stockfish files copied to public/");
