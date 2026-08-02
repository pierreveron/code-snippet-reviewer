import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

import { PrismaClient } from "@/generated/prisma/client";
import { applyFindingSuggestion } from "@/lib/review/apply-suggestion";
import { runReview } from "@/lib/review/run-review";
import { encodeSuggestionPatch } from "@/lib/review/suggestion-patch";

const databases: Array<{ db: PrismaClient; directory: string }> = [];

async function createTestDatabase() {
  const directory = await mkdtemp(path.join(tmpdir(), "snippet-review-"));
  const adapter = new PrismaBetterSqlite3({
    url: `file:${path.join(directory, "test.db")}`,
  });
  const db = new PrismaClient({ adapter });
  databases.push({ db, directory });

  await db.$executeRawUnsafe(`
    CREATE TABLE "Snippet" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "title" TEXT NOT NULL,
      "language" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "contentVersion" INTEGER NOT NULL DEFAULT 0,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL
    )
  `);
  await db.$executeRawUnsafe(`
    CREATE TABLE "Review" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "snippetId" TEXT NOT NULL,
      "runToken" TEXT NOT NULL,
      "sourceVersion" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
      "errorMessage" TEXT,
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL,
      "completedAt" DATETIME,
      CONSTRAINT "Review_snippetId_fkey"
        FOREIGN KEY ("snippetId") REFERENCES "Snippet" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "Review_snippetId_key" ON "Review"("snippetId")',
  );
  await db.$executeRawUnsafe(`
    CREATE TABLE "Finding" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "reviewId" TEXT NOT NULL,
      "startLine" INTEGER NOT NULL,
      "endLine" INTEGER,
      "severity" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "suggestionPatch" TEXT,
      "resolution" TEXT NOT NULL DEFAULT 'OPEN',
      "createdAt" DATETIME NOT NULL,
      "updatedAt" DATETIME NOT NULL,
      CONSTRAINT "Finding_reviewId_fkey"
        FOREIGN KEY ("reviewId") REFERENCES "Review" ("id")
        ON DELETE CASCADE ON UPDATE CASCADE
    )
  `);

  return db;
}

afterEach(async () => {
  await Promise.all(
    databases.splice(0).map(async ({ db, directory }) => {
      await db.$disconnect();
      await rm(directory, { recursive: true, force: true });
    }),
  );
});

async function seedReviewedSnippet(
  db: PrismaClient,
  code: string,
  findings: Array<{
    id: string;
    startLine: number;
    endLine?: number;
    before: string[];
    after: string[];
  }>,
) {
  const now = new Date();
  await db.snippet.create({
    data: {
      id: "snippet",
      title: "Test",
      language: "typescript",
      code,
      contentVersion: 0,
      createdAt: now,
      updatedAt: now,
    },
  });
  await db.review.create({
    data: {
      id: "review",
      snippetId: "snippet",
      runToken: "seed",
      sourceVersion: 0,
      status: "COMPLETED",
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });

  for (const finding of findings) {
    await db.finding.create({
      data: {
        id: finding.id,
        reviewId: "review",
        startLine: finding.startLine,
        endLine: finding.endLine ?? finding.startLine,
        severity: "WARNING",
        category: "BUG",
        description: finding.id,
        suggestionPatch: encodeSuggestionPatch({
          before: finding.before,
          after: finding.after,
        }),
        createdAt: now,
        updatedAt: now,
      },
    });
  }
}

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function barrier(participants: number) {
  let arrived = 0;
  const released = deferred();
  return async () => {
    arrived += 1;
    if (arrived === participants) {
      released.resolve();
    }
    await released.promise;
  };
}

describe("versioned suggestion application", () => {
  it("applies sequential non-overlapping findings and shifts the second", async () => {
    const db = await createTestDatabase();
    await seedReviewedSnippet(db, "a\nbad1\nmiddle\nbad2\nz", [
      {
        id: "first",
        startLine: 2,
        before: ["bad1"],
        after: ["fixed1", "extra"],
      },
      {
        id: "second",
        startLine: 4,
        before: ["bad2"],
        after: ["fixed2"],
      },
    ]);

    const first = await applyFindingSuggestion(db, "first");
    assert.equal(first.ok, true);
    if (!first.ok) return;
    assert.equal(
      first.findings.find((finding) => finding.id === "second")?.startLine,
      5,
    );

    const second = await applyFindingSuggestion(db, "second");
    assert.equal(second.ok, true);
    if (!second.ok) return;
    assert.equal(second.code, "a\nfixed1\nextra\nmiddle\nfixed2\nz");
    assert.equal(second.contentVersion, 2);
  });

  it("rejects an overlapping suggestion after its before block changes", async () => {
    const db = await createTestDatabase();
    await seedReviewedSnippet(db, "a\nbad\nz", [
      { id: "first", startLine: 2, before: ["bad"], after: ["fixed"] },
      { id: "overlap", startLine: 2, before: ["bad"], after: ["other"] },
    ]);

    const applied = await applyFindingSuggestion(db, "first");
    assert.equal(applied.ok, true);
    if (!applied.ok) return;
    assert.equal(
      applied.findings.find((finding) => finding.id === "overlap")?.resolution,
      "STALE",
    );
    const stale = await applyFindingSuggestion(db, "overlap");
    assert.equal(stale.ok, false);
    if (stale.ok) return;
    assert.match(stale.error, /already resolved/);
  });

  it("relocates a uniquely matching before block", async () => {
    const db = await createTestDatabase();
    await seedReviewedSnippet(db, "a\nbad\nz", [
      { id: "moved", startLine: 1, before: ["bad"], after: ["fixed"] },
    ]);

    const result = await applyFindingSuggestion(db, "moved");
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.code, "a\nfixed\nz");
    assert.equal(result.findings[0]?.startLine, 2);
  });

  it("allows only one simultaneous apply to commit", async () => {
    const db = await createTestDatabase();
    await seedReviewedSnippet(db, "bad1\nbad2", [
      { id: "first", startLine: 1, before: ["bad1"], after: ["fixed1"] },
      { id: "second", startLine: 2, before: ["bad2"], after: ["fixed2"] },
    ]);
    const beforeCommit = barrier(2);

    const results = await Promise.all([
      applyFindingSuggestion(db, "first", { beforeCommit }),
      applyFindingSuggestion(db, "second", { beforeCommit }),
    ]);

    assert.equal(results.filter((result) => result.ok).length, 1);
    assert.equal(results.filter((result) => !result.ok).length, 1);
    assert.equal((await db.snippet.findUniqueOrThrow({ where: { id: "snippet" } }))
      .contentVersion, 1);
  });

  it("rejects apply when a manual edit wins the version race", async () => {
    const db = await createTestDatabase();
    await seedReviewedSnippet(db, "bad", [
      { id: "finding", startLine: 1, before: ["bad"], after: ["fixed"] },
    ]);
    const reachedCommit = deferred();
    const releaseCommit = deferred();
    const applying = applyFindingSuggestion(db, "finding", {
      beforeCommit: async () => {
        reachedCommit.resolve();
        await releaseCommit.promise;
      },
    });

    await reachedCommit.promise;
    await db.$transaction(async (tx) => {
      await tx.snippet.update({
        where: { id: "snippet" },
        data: { code: "manual", contentVersion: { increment: 1 } },
      });
      await tx.review.deleteMany({ where: { snippetId: "snippet" } });
    });
    releaseCommit.resolve();

    assert.equal((await applying).ok, false);
    assert.equal(
      (await db.snippet.findUniqueOrThrow({ where: { id: "snippet" } })).code,
      "manual",
    );
  });
});

describe("versioned review runs", () => {
  it("supersedes a review whose snippet is edited during analysis", async () => {
    const db = await createTestDatabase();
    const now = new Date();
    await db.snippet.create({
      data: {
        id: "snippet",
        title: "Test",
        language: "typescript",
        code: "old",
        createdAt: now,
        updatedAt: now,
      },
    });
    const started = deferred();
    const finish = deferred();
    const running = runReview(db, "snippet", async () => {
      started.resolve();
      await finish.promise;
      return [];
    });

    await started.promise;
    await db.$transaction(async (tx) => {
      await tx.snippet.update({
        where: { id: "snippet" },
        data: { code: "new", contentVersion: { increment: 1 } },
      });
      await tx.review.deleteMany({ where: { snippetId: "snippet" } });
    });
    finish.resolve();

    assert.equal((await running).status, "SUPERSEDED");
    assert.equal(
      await db.review.findUnique({ where: { snippetId: "snippet" } }),
      null,
    );
  });

  it("persists only the latest of two review runs", async () => {
    const db = await createTestDatabase();
    const now = new Date();
    await db.snippet.create({
      data: {
        id: "snippet",
        title: "Test",
        language: "typescript",
        code: "code",
        createdAt: now,
        updatedAt: now,
      },
    });
    const firstStarted = deferred();
    const firstFinish = deferred();
    const secondStarted = deferred();
    const secondFinish = deferred();

    const first = runReview(db, "snippet", async () => {
      firstStarted.resolve();
      await firstFinish.promise;
      return [];
    });
    await firstStarted.promise;
    const second = runReview(db, "snippet", async () => {
      secondStarted.resolve();
      await secondFinish.promise;
      return [];
    });
    await secondStarted.promise;

    firstFinish.resolve();
    assert.equal((await first).status, "SUPERSEDED");
    secondFinish.resolve();
    assert.equal((await second).status, "COMPLETED");
    assert.equal(
      (await db.review.findUniqueOrThrow({ where: { snippetId: "snippet" } }))
        .status,
      "COMPLETED",
    );
  });
});
