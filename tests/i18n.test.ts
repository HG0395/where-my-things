import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import { english } from "../src/i18n/catalog.ts";
import { normalizeLanguage, translate } from "../src/i18n/translate.ts";
import { locationPath } from "../src/lib/locationTree.ts";
import { MemoryRepository } from "../src/repositories/memory/MemoryRepository.ts";

test("Language preference accepts only Korean/English and defaults safely to Korean", () => {
  for (const value of [null, undefined, "fr", "en-US", "<script>", {}, 0])
    assert.equal(normalizeLanguage(value), "ko");
  assert.equal(normalizeLanguage("en"), "en");
  assert.equal(normalizeLanguage("ko"), "ko");
});
test("Messages interpolate user content literally without translating it or reinterpreting placeholders", () => {
  assert.equal(
    translate("{name} 물품을 삭제할까요?", "en", { name: "여권 {count} <b>" }),
    "Delete 여권 {count} <b>?",
  );
  assert.equal(
    translate("{name} 물품을 삭제할까요?", "ko", { name: "Passport" }),
    "Passport 물품을 삭제할까요?",
  );
  assert.equal(translate("Unknown message", "en"), "Unknown message");
  for (const [ko, en] of Object.entries(english)) {
    assert.ok(en.trim(), `Empty translation: ${ko}`);
    const tokens = (text: string) =>
      [...text.matchAll(/\{\w+\}/g)].map((match) => match[0]).sort();
    assert.deepEqual(tokens(en), tokens(ko), `Placeholder mismatch: ${ko}`);
  }
});
test("All local/server validation errors have English translations", async () => {
  const files = [
    "src/domain/validation.ts",
    "src/repositories/memory/MemoryRepository.ts",
    "src/lib/imageValidation.ts",
    "src/lib/byokApi.ts",
    "src/features/auth/AccountSettings.tsx",
    "supabase/functions/_shared/http.ts",
    "supabase/functions/_shared/recognition.ts",
    "supabase/functions/byok-key/handler.ts",
    "supabase/functions/recognize-item/handler.ts",
  ];
  let checked = 0;
  for (const file of files) {
    const source = await readFile(
      new URL("../" + file, import.meta.url),
      "utf8",
    );
    const ast = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    function visit(node: ts.Node) {
      if (
        ts.isNewExpression(node) &&
        ["Error", "HttpError"].includes(node.expression.getText(ast))
      ) {
        function strings(value: ts.Node) {
          if (ts.isStringLiteral(value) && /[가-힣]/.test(value.text)) {
            assert.ok(
              Object.hasOwn(english, value.text),
              `Missing English error: ${value.text}`,
            );
            checked++;
          }
          ts.forEachChild(value, strings);
        }
        strings(node);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  assert.ok(checked > 45);
});
test("English location paths preserve stored Korean names and use English only for missing locations", () => {
  const repository = new MemoryRepository();
  const before = repository.snapshot();
  const location = before.locations[0];
  assert.ok(
    locationPath(
      before.locations,
      location.id,
      translate("위치 미지정", "en"),
    ).includes(location.name),
  );
  assert.equal(
    locationPath(before.locations, null, translate("위치 미지정", "en")),
    "Unassigned",
  );
  assert.deepEqual(repository.snapshot(), before);
});
