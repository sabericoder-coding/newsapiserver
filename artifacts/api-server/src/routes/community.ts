
import { Router, type IRouter, type RequestHandler } from "express";
import { timingSafeEqual } from "node:crypto";
import multer from "multer";
import { and, desc, eq } from "drizzle-orm";
import { db, communityReportsTable } from "@workspace/db";
import {
  uploadCommunityReportImage,
  deleteCommunityReportImage,
} from "../lib/appwrite-storage";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
});

const parseCommunityReportImage: RequestHandler = (req, res, next) => {
  upload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        res.status(413).json({
          error: "Image must not exceed 5 MB.",
        });
        return;
      }

      res.status(400).json({
        error: "Invalid image upload. Only one image is allowed.",
      });
      return;
    }

    res.status(400).json({
      error: "Could not process the uploaded image.",
    });
  });
};

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

function detectImageContentType(buffer: Buffer): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "image/png";
  }

  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

// Public: submit a report. Every submission starts as pending.
// An image is optional; text-only JSON submissions remain supported.
router.post(
  "/community-reports",
  parseCommunityReportImage,
  async (req, res): Promise<void> => {
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

    const image = req.file;
    let uploadedFileId: string | null = null;

    if (image) {
      const detectedContentType = detectImageContentType(image.buffer);

      if (
        !detectedContentType ||
        image.mimetype.toLowerCase() !== detectedContentType
      ) {
        res.status(400).json({
          error: "Only valid JPEG, PNG, and WebP images are accepted.",
        });
        return;
      }
    }

    try {
      let imageUrl: string | null = null;

      if (image) {
        const uploaded = await uploadCommunityReportImage(
          image.buffer,
          detectImageContentType(image.buffer)!,
        );

        uploadedFileId = uploaded.fileId;
        imageUrl = uploaded.url;
      }

      const [report] = await db
        .insert(communityReportsTable)
        .values({
          countryCode,
          countryName,
          headline,
          body: reportBody,
          authorName: authorName || null,
          imageUrl,
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

      if (uploadedFileId) {
        try {
          await deleteCommunityReportImage(uploadedFileId);
        } catch (cleanupError) {
          req.log.error(
            { err: cleanupError, fileId: uploadedFileId },
            "Failed to clean up an uploaded image after report submission failed",
          );
        }
      }

      res.status(500).json({
        error: "Could not submit report.",
      });
    }
  },
);

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
        imageUrl: communityReportsTable.imageUrl,
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
    console.error("[Country Pulse] Failed to load approved community reports:", error);
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
