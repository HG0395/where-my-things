import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  encryptKey,
  decryptKey,
  fingerprint,
} from "../supabase/functions/_shared/crypto.ts";
import {
  geminiBody,
  parseRecognition,
  validateJpeg,
} from "../supabase/functions/_shared/recognition.ts";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const keyVersion = "33333333-3333-4333-8333-333333333333";
const hash = "a".repeat(64);

test("AES-GCM ciphertext is randomized, bound to owner/version and rejects tampering", async () => {
  const master = Buffer.from(
    crypto.getRandomValues(new Uint8Array(32)),
  ).toString("base64");
  const raw = "dummy-key-for-offline-test-only";
  const a = await encryptKey(raw, userA, keyVersion, master);
  const b = await encryptKey(raw, userA, keyVersion, master);
  assert.notEqual(a.ciphertext, b.ciphertext);
  assert.ok(!a.ciphertext.includes(raw));
  assert.equal(
    await decryptKey(a.ciphertext, a.iv, userA, keyVersion, master),
    raw,
  );
  await assert.rejects(() =>
    decryptKey(a.ciphertext, a.iv, userB, keyVersion, master),
  );
  await assert.rejects(() =>
    decryptKey(a.ciphertext, a.iv, userA, userB, master),
  );
  const altered = (a.ciphertext[0] === "A" ? "B" : "A") + a.ciphertext.slice(1);
  await assert.rejects(() =>
    decryptKey(altered, a.iv, userA, keyVersion, master),
  );
});

test("Image fingerprint changes with model/key version; generation has bounded output and no thinking", async () => {
  const bytes = new Uint8Array([1, 2, 3]);
  const a = await fingerprint(bytes, "model-a", keyVersion);
  assert.equal(a.length, 64);
  assert.equal(a, await fingerprint(bytes, "model-a", keyVersion));
  assert.notEqual(a, await fingerprint(bytes, "model-b", keyVersion));
  assert.notEqual(a, await fingerprint(bytes, "model-a", userB));
  assert.notEqual(a, await fingerprint(bytes, "model-a", keyVersion, "en"));
  assert.equal(a, await fingerprint(bytes, "model-a", keyVersion, "ko"));
  const body = geminiBody("test");
  assert.equal(body.generationConfig.maxOutputTokens, 256);
  assert.equal(body.generationConfig.thinkingConfig.thinkingBudget, 0);
  assert.equal(body.contents[0].parts.length, 2);
  const english = geminiBody("test", "en");
  assert.match(english.contents[0].parts[0].text!, /English name/);
  assert.match(body.contents[0].parts[0].text!, /한국어/);
  assert.deepEqual(english.generationConfig, body.generationConfig);
});

test("JPEG dimensions/size and AI result shape are checked before use", () => {
  const jpeg = new Uint8Array([
    255, 216, 255, 192, 0, 8, 8, 0, 100, 0, 100, 0, 255, 217,
  ]);
  assert.equal(
    validateJpeg(Buffer.from(jpeg).toString("base64")).bytes.length,
    jpeg.length,
  );
  jpeg[9] = 16;
  assert.throws(
    () => validateJpeg(Buffer.from(jpeg).toString("base64")),
    /1,024/,
  );
  assert.throws(() => validateJpeg("not+base64!"));
  assert.throws(() => validateJpeg("a".repeat(800_000)));
  assert.throws(() =>
    validateJpeg(Buffer.from("not a jpeg").toString("base64")),
  );
  const payload = {
    candidates: [
      {
        finishReason: "STOP",
        content: {
          parts: [
            {
              text: JSON.stringify({
                name: " 충전기 ",
                tags: ["전자기기", "전자기기"],
              }),
            },
          ],
        },
      },
    ],
    usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 20 },
  };
  assert.deepEqual(parseRecognition(payload), {
    name: "충전기",
    tags: ["전자기기"],
    inputTokens: 300,
    outputTokens: 20,
  });
  assert.throws(() =>
    parseRecognition({ candidates: [{ finishReason: "MAX_TOKENS" }] }),
  );
  assert.throws(() =>
    parseRecognition({
      candidates: [
        {
          finishReason: "STOP",
          content: { parts: [{ text: '{"name":"a","tags":[12]}' }] },
        },
      ],
    }),
  );
});

test("PostgreSQL migration enforces ownership, quotas, cache isolation and browser access denial", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth; create table auth.users(id uuid primary key);
      insert into auth.users values('${userA}'),('${userB}');`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/20261009000000_user_gemini_keys.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const call = async (sql: string, args: unknown[] = []) =>
      (await db.query<{ value: any }>(sql, args)).rows[0]?.value;
    const save = (user: string, version = keyVersion) =>
      db.query("select public.byok_save_key($1,$2,$3,$4)", [
        user,
        "ciphertext",
        "iv",
        version,
      ]);
    const reserve = (user: string, fingerprint = hash, version = keyVersion) =>
      call("select public.byok_reserve($1,$2,$3) as value", [
        user,
        fingerprint,
        version,
      ]);
    const finish = (user: string, id: string, result: object | null) =>
      call("select public.byok_finish($1,$2,$3) as value", [user, id, result]);
    const age = () =>
      db.query(
        "update public.byok_usage set last_requested_at = now() - interval '1 minute'",
      );
    const result = {
      name: "충전기",
      tags: ["전자기기"],
      inputTokens: 100,
      outputTokens: 10,
    };

    await t.test(
      "No key, spoofed key version, and cross-user completion cannot access results",
      async () => {
        assert.equal((await reserve(userA)).status, "missing_key");
        await save(userA);
        await save(userB);
        assert.equal((await reserve(userA, hash, userB)).status, "missing_key");
        const first = await reserve(userA);
        assert.equal(first.status, "reserved");
        assert.equal(await finish(userB, first.jobId, result), false);
        assert.equal((await reserve(userA)).status, "busy");
        assert.equal(await finish(userA, first.jobId, result), true);
        assert.equal((await reserve(userA)).status, "cached");
        const other = await reserve(userB);
        assert.equal(other.status, "reserved");
        assert.equal(await finish(userB, other.jobId, null), true);
      },
    );
    await t.test(
      "Key rotation/deletion invalidate cache and retain attempt counters",
      async () => {
        await save(userA);
        assert.equal((await reserve(userA)).status, "cooldown");
        assert.equal(
          await call(
            "select attempts as value from public.byok_usage where user_id=$1",
            [userA],
          ),
          1,
        );
        await db.query("select public.byok_delete_key($1)", [userA]);
        assert.equal((await reserve(userA)).status, "missing_key");
        await save(userA);
        assert.equal((await reserve(userA)).status, "cooldown");
        await age();
        assert.equal((await reserve(userA)).status, "reserved");
      },
    );
    await t.test(
      "Expired jobs can retry; late completion cannot overwrite new reservations",
      async () => {
        const oldId = (
          await db.query<{ id: string }>(
            "select id from public.byok_jobs where user_id=$1",
            [userA],
          )
        ).rows[0].id;
        await db.query(
          "update public.byok_jobs set expires_at = now() - interval '1 second' where user_id=$1",
          [userA],
        );
        await age();
        const next = await reserve(userA);
        assert.equal(next.status, "reserved");
        assert.notEqual(next.jobId, oldId);
        assert.equal(await finish(userA, oldId, result), false);
        assert.equal(await finish(userA, next.jobId, result), true);
      },
    );
    await t.test(
      "The twentieth request is allowed, the next is blocked, and cached requests remain free",
      async () => {
        await db.query(
          "update public.byok_usage set attempts=19 where user_id=$1",
          [userA],
        );
        await age();
        const next = await reserve(userA, "b".repeat(64));
        assert.equal(next.status, "reserved");
        await finish(userA, next.jobId, result);
        assert.equal(
          (await reserve(userA, "c".repeat(64))).status,
          "daily_limit",
        );
        assert.equal((await reserve(userA, "b".repeat(64))).status, "cached");
        assert.equal(
          await call(
            "select attempts as value from public.byok_usage where user_id=$1",
            [userA],
          ),
          20,
        );
      },
    );
    await t.test(
      "Anonymous/authenticated browser roles cannot read ciphertext or invoke server RPCs",
      async () => {
        for (const role of ["anon", "authenticated"]) {
          await db.exec(`set role ${role}`);
          try {
            await assert.rejects(
              () => db.query("select * from public.byok_keys"),
              /permission denied/,
            );
            await assert.rejects(() => reserve(userA), /permission denied/);
            await assert.rejects(() => save(userA), /permission denied/);
            await assert.rejects(
              () => db.query("select public.byok_delete_key($1)", [userA]),
              /permission denied/,
            );
          } finally {
            await db.exec("reset role");
          }
        }
        // Even accidentally granting table SELECT does not bypass default-deny RLS.
        await db.exec(
          "grant select on public.byok_keys to authenticated; set role authenticated",
        );
        try {
          assert.equal(
            (await db.query("select * from public.byok_keys")).rows.length,
            0,
          );
        } finally {
          await db.exec("reset role");
        }
      },
    );
    await t.test(
      "Deleting an auth account cascades key/cache/usage cleanup",
      async () => {
        await db.query("delete from auth.users where id=$1", [userA]);
        for (const table of ["byok_keys", "byok_jobs", "byok_usage"]) {
          assert.equal(
            await call(
              `select count(*)::int as value from public.${table} where user_id=$1`,
              [userA],
            ),
            0,
          );
        }
      },
    );
  } finally {
    await db.close();
  }
});
