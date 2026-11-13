import { Router } from "express";
import { sql } from "../../db.js";
import { notFound } from "../../lib/errors.js";
import { currentUser, requireAuth } from "../../middleware/auth.js";

export const identityRouter = Router();
identityRouter.use(requireAuth);

identityRouter.get("/me", async (req, res) => {
  const user = currentUser(req);
  const [profile] = await sql`
    select display_name, locale, timezone from profiles where id = ${user.id}
  `;
  if (!profile) throw notFound("Profile");
  res.json({ id: user.id, email: user.email, profile });
});
