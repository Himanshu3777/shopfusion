import "dotenv/config";

// Route ALL test imports of @/lib/db to the isolated test database.
// Must run before any test file imports the db module (setupFiles guarantee).
if (!process.env.DATABASE_URL_TEST) {
  throw new Error("DATABASE_URL_TEST is not set — copy .env.example to .env");
}
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
process.env.AUTH_SECRET ??= "test-secret-do-not-use-in-prod";
process.env.PAYMENT_PROVIDER = "MOCK";
