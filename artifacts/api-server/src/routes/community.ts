
import { Router, type IRouter, type RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, communityReportsTable } from "@workspace/db";

const router: IRouter = Router();

const requireAdmin: RequestHandler = (req, res, next) => {
  const expected = process.env.COMMUNITY_NEWS_ADMIN_TOKEN;
  const authorization = req.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!expected || !supplied) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  const expectedBuffer = Buffer.from(expected);
  const suppliedBuffer = Buffer.from(supplied);

  if (
    expectedBuffer.length !== suppliedBuffer.length ||
    !timingSafeEqual(expectedBuffer, suppliedBuffer)
  ) {
    res.status(401).json({ error: "Unauthorized." });
    return;
  }

  next();
};

// Public: submit a report. Every submission starts as pending.
router.post("/community-reports", async (req, res): Promise<void> => {
  const body = req.body ?? {};

  const countryCode =
    typeof body.countryCode === "string"
      ? body.countryCode.trim().toUpperCase()
      : "";

  const countryName =
    typeof body.countryName === "string" ? body.countryName.trim() : "";

  const headline =
    typeof body.headline === "string" ? body.headline.trim() : "";

  const reportBody =
    typeof body.body === "string" ? body.body.trim() : "";

  const authorName =
    typeof body.authorName === "string" ? body.authorName.trim() : "";

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    res.status(400).json({
      error: "A valid two-letter country code is required.",
    });
    return;
  }

  if (!countryName || countryName.length > 100) {
    res.status(400).json({
      error: "Country name must be between 1 and 100 characters.",
    });
    return;
  }

  if (headline.length < 5 || headline.length > 200) {
    res.status(400).json({
      error: "Headline must be between 5 and 200 characters.",
    });
    return;
  }

  if (reportBody.length < 50 || reportBody.length > 20000) {
    res.status(400).json({
      error: "Report body must be between 50 and 20000 characters.",
    });
    return;
  }

  if (authorName.length > 80) {
    res.status(400).json({
      error: "Author name cannot exceed 80 characters.",
    });
    return;
  }

  try {
    const [report] = await db
      .insert(communityReportsTable)
      .values({
        countryCode,
        countryName,
        headline,
        body: reportBody,
        authorName: authorName || null,
      })
      .returning({
        id: communityReportsTable.id,
        status: communityReportsTable.status,
        createdAt: communityReportsTable.createdAt,
      });

    res.status(201).json({
      message: "Report submitted for review.",
      report,
    });
  } catch (error) {
    req.log.error({ err: error }, "Failed to submit community report");
    res.status(500).json({ error: "Could not submit report." });
  }
});

// Public: return approved reports for one country only.
// Internal reviewer information is never exposed publicly.
router.get("/community-reports", async (req, res): Promise<void> => {
  const countryCode =
    typeof req.query.countryCode === "string"
      ? req.query.countryCode.trim().toUpperCase()
      : "";

  if (!/^[A-Z]{2}$/.test(countryCode)) {
    res.status(400).json({
      error: "A valid countryCode query parameter is required.",
    });
    return;
  }

  try {
    const reports = await db
      .select({
        id: communityReportsTable.id,
        countryCode: communityReportsTable.countryCode,
        countryName: communityReportsTable.countryName,
        headline: communityReportsTable.headline,
        body: communityReportsTable.body,
        authorName: communityReportsTable.authorName,
        createdAt: communityReportsTable.createdAt,
      })
      .from(communityReportsTable)
      .where(
        and(
          eq(communityReportsTable.countryCode, countryCode),
          eq(communityReportsTable.status, "approved"),
        ),
      )
      .orderBy(desc(communityReportsTable.createdAt))
      .limit(100);

    res.json(reports);
  } catch (error) {
    req.log.error({ err: error }, "Failed to load approved community reports");
    res.status(500).json({ error: "Could not load community reports." });
  }
});

// Admin: list reports. Defaults to pending reports.
router.get(
  "/admin/community-reports",
  requireAdmin,
  async (req, res): Promise<void> => {
    const status =
      typeof req.query.status === "string" ? req.query.status : "pending";

    if (!["pending", "approved", "rejected", "all"].includes(status)) {
      res.status(400).json({ error: "Invalid report status." });
      return;
    }

    try {
      const reports =
        status === "all"
          ? await db
              .select()
              .from(communityReportsTable)
              .orderBy(desc(communityReportsTable.createdAt))
              .limit(200)
          : await db
              .select()
              .from(communityReportsTable)
              .where(
                eq(
                  communityReportsTable.status,
                  status as "pending" | "approved" | "rejected",
                ),
              )
              .orderBy(desc(communityReportsTable.createdAt))
              .limit(200);

      res.json(reports);
    } catch (error) {
      req.log.error({ err: error }, "Failed to load admin community reports");
      res.status(500).json({ error: "Could not load reports." });
    }
  },
);

// Admin: approve or reject a report.
router.patch(
  "/admin/community-reports/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const id = req.params.id;
    const status = req.body?.status;

    const reviewerNote =
      typeof req.body?.reviewerNote === "string"
        ? req.body.reviewerNote.trim()
        : "";

    // Validate UUID before querying PostgreSQL.
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

      res.json({
        message: `Report ${status}.`,
        report,
      });
    } catch (error) {
      req.log.error({ err: error }, "Failed to review community report");
      res.status(500).json({ error: "Could not review report." });
    }
  },
);

export default router;
