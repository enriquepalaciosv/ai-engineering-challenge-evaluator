import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDashboard, writeDashboardData } from "../src/storage.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = writeDashboardData(root, buildDashboard(root));
console.log(`Dashboard data refreshed: ${file}`);
