import { Router, type IRouter, type RequestHandler } from "express";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db, communityReportsTable } from "@workspace/db";
import {
  adminLoginHandler,
  adminLogoutHandler,
  requireAdminSession,
  loginRateLimit,
} from "../lib/admin-auth";

const router: IRouter = Router();

const requireSameOrigin: RequestHandler = (req, res, next) => {
  const origin = req.get("origin");
  const host = req.get("host");

  if (!origin || !host) {
    res.status(403).json({ error: "Origin verification failed." });
    return;
  }

  try {
    const originUrl = new URL(origin);
    if (originUrl.host !== host) {
      res.status(403).json({ error: "Origin verification failed." });
      return;
    }
  } catch {
    res.status(403).json({ error: "Origin verification failed." });
    return;
  }

  next();
};

router.post("/admin/login", requireSameOrigin, loginRateLimit, adminLoginHandler);
router.post("/admin/logout", requireSameOrigin, adminLogoutHandler);

router.get("/admin/session", requireAdminSession, (_req, res) => {
  res.json({ authenticated: true });
});

router.get("/admin/reports", requireAdminSession, async (req, res): Promise<void> => {
  const status =
    typeof req.query.status === "string" ? req.query.status : "pending";
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";
  const countryCode =
    typeof req.query.countryCode === "string"
      ? req.query.countryCode.trim().toUpperCase()
      : "";

  if (!["pending", "approved", "rejected", "all"].includes(status)) {
    res.status(400).json({ error: "Invalid report status." });
    return;
  }

  if (search.length > 200 || countryCode.length > 2) {
    res.status(400).json({ error: "Invalid search filters." });
    return;
  }

  try {
    const conditions = [];

    if (status !== "all") {
      conditions.push(
        eq(
          communityReportsTable.status,
          status as "pending" | "approved" | "rejected",
        ),
      );
    }

    if (countryCode) {
      conditions.push(eq(communityReportsTable.countryCode, countryCode));
    }

    if (search) {
      const pattern = `%${search.replace(/[%_\\]/g, "\\$&")}%`;
      conditions.push(
        or(
          ilike(communityReportsTable.headline, pattern),
          ilike(communityReportsTable.countryName, pattern),
          ilike(communityReportsTable.authorName, pattern),
          ilike(communityReportsTable.body, pattern),
        )!,
      );
    }

    const reports = await db
      .select()
      .from(communityReportsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(communityReportsTable.createdAt))
      .limit(200);

    res.json(reports);
  } catch (error) {
    req.log.error({ err: error }, "Failed to load dashboard reports");
    res.status(500).json({ error: "Could not load reports." });
  }
});

router.patch(
  "/admin/reports/:id",
  requireSameOrigin,
  requireAdminSession,
  async (req, res): Promise<void> => {
    const id = req.params.id;
    const status = req.body?.status;
    const reviewerNote =
      typeof req.body?.reviewerNote === "string"
        ? req.body.reviewerNote.trim()
        : "";

    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
    ) {
      res.status(400).json({ error: "Invalid report ID." });
      return;
    }

    if (status !== "approved" && status !== "rejected") {
      res.status(400).json({
        error: "Status must be approved or rejected.",
      });
      return;
    }

    if (reviewerNote.length > 2000) {
      res.status(400).json({
        error: "Reviewer note cannot exceed 2000 characters.",
      });
      return;
    }

    try {
      const [report] = await db
        .update(communityReportsTable)
        .set({
          status,
          reviewedAt: new Date(),
          reviewerNote: reviewerNote || null,
        })
        .where(eq(communityReportsTable.id, id))
        .returning();

      if (!report) {
        res.status(404).json({ error: "Report not found." });
        return;
      }

      res.json({ message: `Report ${status}.`, report });
    } catch (error) {
      req.log.error({ err: error }, "Failed to moderate dashboard report");
      res.status(500).json({ error: "Could not update report." });
    }
  },
);

export default router;
