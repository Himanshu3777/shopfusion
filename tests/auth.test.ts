import { describe, it, expect, beforeEach } from "vitest";
import { resetDb, req, json, asUser, createUser } from "./helpers";
import { POST as register } from "@/app/api/auth/register/route";
import { POST as forgot } from "@/app/api/auth/forgot-password/route";
import { POST as reset } from "@/app/api/auth/reset-password/route";
import { GET as me, PATCH as updateMe } from "@/app/api/auth/me/route";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

beforeEach(async () => {
  await resetDb();
});

describe("POST /api/auth/register", () => {
  it("creates a customer with cart + wishlist", async () => {
    const res = await register(req("/api/auth/register", { method: "POST", body: { name: "Asha", email: "asha@test.dev", password: "Password@123" } }));
    expect(res.status).toBe(201);
    const j = await json(res);
    expect(j.ok).toBe(true);
    expect(j.data.user.email).toBe("asha@test.dev");
    expect(j.data.user.role).toBe("CUSTOMER");
    expect(j.data.user.passwordHash).toBeUndefined();
    const u = await db.user.findUnique({ where: { email: "asha@test.dev" }, include: { cart: true, wishlist: true } });
    expect(u?.cart).toBeTruthy();
    expect(u?.wishlist).toBeTruthy();
  });

  it("rejects duplicate email with 409", async () => {
    const body = { name: "A", email: "dup@test.dev", password: "Password@123" };
    await register(req("/api/auth/register", { method: "POST", body }));
    const res = await register(req("/api/auth/register", { method: "POST", body }));
    expect(res.status).toBe(409);
  });

  it("rejects weak input with 422", async () => {
    const res = await register(req("/api/auth/register", { method: "POST", body: { name: "", email: "nope", password: "short" } }));
    expect(res.status).toBe(422);
  });
});

describe("GET /api/auth/me", () => {
  it("401 for guests", async () => {
    const res = await me();
    expect(res.status).toBe(401);
  });
  it("returns the session user", async () => {
    const u = await createUser();
    asUser(u);
    const res = await me();
    const j = await json(res);
    expect(j.ok).toBe(true);
    expect(j.data.user.id).toBe(u.id);
  });
});

describe("PATCH /api/auth/me", () => {
  it("updates name and changes password with verification", async () => {
    const u = await createUser();
    asUser(u);
    const res = await updateMe(req("/api/auth/me", { method: "PATCH", body: { name: "New Name", currentPassword: "Password@123", newPassword: "NewPass@456" } }));
    expect(res.status).toBe(200);
    const row = await db.user.findUniqueOrThrow({ where: { id: u.id } });
    expect(row.name).toBe("New Name");
    expect(await verifyPassword("NewPass@456", row.passwordHash!)).toBe(true);
  });
  it("rejects wrong current password", async () => {
    const u = await createUser();
    asUser(u);
    const res = await updateMe(req("/api/auth/me", { method: "PATCH", body: { currentPassword: "wrong", newPassword: "NewPass@456" } }));
    expect(res.status).toBe(400);
  });
});

describe("forgot/reset password", () => {
  it("issues a token and resets the password", async () => {
    await createUser("CUSTOMER", "reset@test.dev");
    const f = await forgot(req("/api/auth/forgot-password", { method: "POST", body: { email: "reset@test.dev" } }));
    expect((await json(f)).ok).toBe(true);
    const created = await db.user.findUniqueOrThrow({ where: { email: "reset@test.dev" } });
    const token = await db.passwordResetToken.findFirstOrThrow({ where: { userId: created.id } });
    const r = await reset(req("/api/auth/reset-password", { method: "POST", body: { token: token.token, password: "BrandNew@789" } }));
    expect(resStatus(r)).toBe(200);
    const row = await db.user.findUniqueOrThrow({ where: { email: "reset@test.dev" } });
    expect(await verifyPassword("BrandNew@789", row.passwordHash!)).toBe(true);
    // token reuse is rejected
    const r2 = await reset(req("/api/auth/reset-password", { method: "POST", body: { token: token.token, password: "Again@123" } }));
    expect(resStatus(r2)).toBe(400);
  });
  it("does not enumerate unknown emails", async () => {
    const f = await forgot(req("/api/auth/forgot-password", { method: "POST", body: { email: "nobody@test.dev" } }));
    expect((await json(f)).ok).toBe(true);
  });
});

function resStatus(r: Response) { return r.status; }
