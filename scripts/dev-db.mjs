// Runs a local Postgres for development (no Docker, no account).
// Data lives in .data/pg. Stop with Ctrl+C.

import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";

const dir = ".data/pg";
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: "grahify",
  password: "grahify-local-dev",
  port: 5433,
  persistent: true,
});

if (!existsSync(`${dir}/PG_VERSION`)) await pg.initialise();
await pg.start();
try {
  await pg.createDatabase("grahify");
} catch {
  // already exists
}
console.log("Postgres ready on localhost:5433 (database: grahify)");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
