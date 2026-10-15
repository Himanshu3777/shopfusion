import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, withErrorHandling } from "@/lib/api";
import { requireUser } from "@/lib/rbac";
import { addressSchema } from "@/lib/validation";

export const GET = withErrorHandling(async () => {
  const user = await requireUser();
  const items = await db.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  return ok({ items });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const user = await requireUser();
  const body = addressSchema.parse(await req.json());

  const address = await db.$transaction(async (tx) => {
    if (body.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id },
        data: { isDefault: false },
      });
    }
    return tx.address.create({ data: { ...body, userId: user.id } });
  });

  return ok(address, 201);
});
