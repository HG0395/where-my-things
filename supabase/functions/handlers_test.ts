import { handler as keys } from "./byok-key/handler.ts";
import { handler as recognize } from "./recognize-item/handler.ts";
import { decryptKey, encryptKey } from "./_shared/crypto.ts";

const userA = "11111111-1111-4111-8111-111111111111";
const userB = "22222222-2222-4222-8222-222222222222";
const version = "33333333-3333-4333-8333-333333333333";
const raw = "offline_test_key_not_a_real_google_credential";
const origin = "https://app.example";
const master = btoa(
  String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))),
);
Deno.env.set("SUPABASE_URL", "https://unit-test.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "offline-service-key");
Deno.env.set("BYOK_ENCRYPTION_KEY", master);
Deno.env.set("ALLOWED_ORIGINS", origin);
const request = (body: object, authenticated = true, requestOrigin = origin) =>
  new Request("https://unit-test.supabase.co/functions/v1/test", {
    method: "POST",
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/json",
      ...(authenticated ? { Authorization: "Bearer offline-user-jwt" } : {}),
    },
    body: JSON.stringify(body),
  });
function assert(value: unknown, message = "Assertion failed"): asserts value {
  if (!value) throw new Error(message);
}
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
async function withMock(fn: typeof fetch, run: () => Promise<void>) {
  const original = globalThis.fetch;
  globalThis.fetch = fn;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}
const authResponse = () =>
  response({ id: userA, aud: "authenticated", email: "offline@example.test" });

Deno.test(
  "Requests without a JWT or with a hostile origin never access DB or provider",
  async () => {
    await withMock(
      () => {
        throw new Error("No network call expected");
      },
      async () => {
        assert(
          (await keys(request({ action: "save", key: raw }, false))).status ===
            401,
        );
        assert((await recognize(request({}, false))).status === 401);
        assert(
          (
            await keys(
              request({ action: "status" }, true, "https://evil.example"),
            )
          ).status === 403,
        );
      },
    );
  },
);
Deno.test("Invalid JWT is rejected before database access", async () => {
  let calls = 0;
  await withMock(
    async (input) => {
      calls++;
      assert(String(input).endsWith("/auth/v1/user"));
      return response({ message: "invalid JWT" }, 401);
    },
    async () => {
      assert((await keys(request({ action: "status" }))).status === 401);
      assert(calls === 1);
    },
  );
});
Deno.test(
  "Key saving ignores forged user ID, encrypts ownership, and does not return the raw key",
  async () => {
    let encrypted: {
      p_ciphertext: string;
      p_iv: string;
      p_version: string;
    } | null = null;
    await withMock(
      async (input, init) => {
        const url = String(input);
        if (url.endsWith("/auth/v1/user")) return authResponse();
        assert(url.endsWith("/rest/v1/rpc/byok_save_key"));
        const body = JSON.parse(String(init?.body));
        assert(body.p_user_id === userA);
        assert(body.p_user_id !== userB);
        assert(!String(init?.body).includes(raw));
        encrypted = body;
        return response(null);
      },
      async () => {
        const result = await keys(
          request({ action: "save", key: raw, userId: userB }),
        );
        assert(result.status === 200);
        assert(!(await result.text()).includes(raw));
      },
    );
    assert(encrypted !== null);
    const saved = encrypted as {
      p_ciphertext: string;
      p_iv: string;
      p_version: string;
    };
    assert(
      (await decryptKey(
        saved.p_ciphertext,
        saved.p_iv,
        userA,
        saved.p_version,
        master,
      )) === raw,
    );
  },
);
Deno.test(
  "Key status queries only caller metadata and never fetches ciphertext",
  async () => {
    await withMock(
      async (input) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/auth/v1/user")) return authResponse();
        assert(url.searchParams.get("user_id") === `eq.${userA}`);
        assert(!url.search.includes("ciphertext"));
        return url.pathname.endsWith("/byok_keys")
          ? response({ updated_at: "2026-01-01" })
          : response({ attempts: 2 });
      },
      async () => {
        const result = await keys(request({ action: "status", userId: userB }));
        const body = await result.json();
        assert(body.hasKey === true);
        assert(body.attempts === 2);
        assert(!JSON.stringify(body).includes(raw));
      },
    );
  },
);
Deno.test(
  "Body size is bounded and deleting a key always targets authenticated owner",
  async () => {
    await withMock(
      async (input, init) => {
        const url = String(input);
        if (url.endsWith("/auth/v1/user")) return authResponse();
        assert(url.endsWith("/rest/v1/rpc/byok_delete_key"));
        assert(JSON.parse(String(init?.body)).p_user_id === userA);
        return response(null);
      },
      async () => {
        assert(
          (await keys(request({ action: "save", key: "x".repeat(9000) })))
            .status === 413,
        );
        assert(
          (await keys(request({ action: "delete", userId: userB }))).status ===
            200,
        );
      },
    );
  },
);

const jpeg = btoa(
  String.fromCharCode(
    ...new Uint8Array([
      255, 216, 255, 192, 0, 8, 8, 0, 100, 0, 100, 0, 255, 217,
    ]),
  ),
);
Deno.test(
  "Cached analyses make zero provider calls; a fresh analysis uses only the owner key",
  async () => {
    const encrypted = await encryptKey(raw, userA, version, master);
    let cached = true;
    let providerCalls = 0;
    await withMock(
      async (input, init) => {
        const url = new URL(String(input));
        if (url.pathname.endsWith("/auth/v1/user")) return authResponse();
        if (url.pathname.endsWith("/byok_keys")) {
          assert(url.searchParams.get("user_id") === `eq.${userA}`);
          return response({ ...encrypted, version });
        }
        if (url.pathname.endsWith("/rpc/byok_reserve")) {
          const body = JSON.parse(String(init?.body));
          assert(body.p_user_id === userA);
          return response(
            cached
              ? {
                  status: "cached",
                  result: {
                    name: "가위",
                    tags: ["문구"],
                    inputTokens: 100,
                    outputTokens: 10,
                  },
                }
              : { status: "reserved", jobId: version },
          );
        }
        if (url.hostname === "generativelanguage.googleapis.com") {
          providerCalls++;
          assert(new Headers(init?.headers).get("x-goog-api-key") === raw);
          assert(!url.search.includes(raw));
          const body = JSON.parse(String(init?.body));
          assert(body.generationConfig.maxOutputTokens === 256);
          assert(body.generationConfig.thinkingConfig.thinkingBudget === 0);
          return response({
            candidates: [
              {
                finishReason: "STOP",
                content: {
                  parts: [{ text: '{"name":"가위","tags":["문구"]}' }],
                },
              },
            ],
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 },
          });
        }
        assert(url.pathname.endsWith("/rpc/byok_finish"));
        return response(true);
      },
      async () => {
        const first = await recognize(request({ image: jpeg, userId: userB }));
        const cacheResult = await first.json();
        assert(cacheResult.cached);
        assert(cacheResult.chargedTokens === 0);
        assert(providerCalls === 0);
        cached = false;
        const second = await recognize(request({ image: jpeg, userId: userB }));
        const fresh = await second.json();
        assert(second.status === 200);
        assert(!fresh.cached);
        assert(fresh.chargedTokens === 110);
        assert(Number(providerCalls) === 1);
      },
    );
  },
);
Deno.test(
  "Daily quota stops before provider access and provider errors do not expose credentials",
  async () => {
    const encrypted = await encryptKey(raw, userA, version, master);
    let limited = true;
    let providerCalls = 0;
    await withMock(
      async (input) => {
        const url = String(input);
        if (url.endsWith("/auth/v1/user")) return authResponse();
        if (url.includes("/byok_keys?"))
          return response({ ...encrypted, version });
        if (url.endsWith("/rpc/byok_reserve"))
          return response(
            limited
              ? { status: "daily_limit" }
              : { status: "reserved", jobId: version },
          );
        if (url.includes("generativelanguage.googleapis.com")) {
          providerCalls++;
          return response({ error: raw }, 403);
        }
        assert(url.endsWith("/rpc/byok_finish"));
        return response(true);
      },
      async () => {
        assert((await recognize(request({ image: jpeg }))).status === 429);
        assert(providerCalls === 0);
        limited = false;
        const result = await recognize(request({ image: jpeg }));
        assert(result.status === 422);
        assert(!(await result.text()).includes(raw));
        assert(Number(providerCalls) === 1);
      },
    );
  },
);
