import { createInsertSchema } from "drizzle-zod";
import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const communityReportStatus = pgEnum("community_report_status", [
  "pending",
  "approved",
  "rejected",
]);

export const communityReportsTable = pgTable(
  "community_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: varchar("country_code", { length: 2 }).notNull(),
    countryName: varchar("country_name", { length: 100 }).notNull(),
    headline: varchar("headline", { length: 200 }).notNull(),
    body: text("body").notNull(),
    authorName: varchar("author_name", { length: 80 }),
    status: communityReportStatus("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewerNote: text("reviewer_note"),
  },
  (table) => [
    index("community_reports_country_status_idx").on(
      table.countryCode,
      table.status,
    ),
    index("community_reports_created_at_idx").on(table.createdAt),
  ],
);

export const insertCommunityReportSchema = createInsertSchema(
  communityReportsTable,
).omit({
  id: true,
  status: true,
  createdAt: true,
  reviewedAt: true,
  reviewerNote: true,
});

export type InsertCommunityReport = typeof communityReportsTable.$inferInsert;
export type CommunityReport = typeof communityReportsTable.$inferSelect;
