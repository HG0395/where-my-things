import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryRepository } from "../src/repositories/memory/MemoryRepository.ts";
import { createSeed } from "../src/mocks/seedData.ts";
import { locationPath } from "../src/lib/locationTree.ts";
import type { ItemDraft } from "../src/domain/types.ts";

const draft: ItemDraft = {
  name: "테스트 물품",
  locationId: "drawer1",
  quantity: 1,
  tags: ["여행"],
  note: "빨간 파우치",
  photo: null,
};
const all = { text: "", location: "", sort: "recent" as const };

test("이름·태그·메모 검색, 하위 위치 포함, 미지정 위치, 공백과 영문 대소문자", () => {
  const repository = new MemoryRepository();
  assert.equal(repository.search({ ...all, text: " 충전기 " }).length, 2);
  assert.equal(repository.search({ ...all, text: "usb-c" }).length, 1);
  assert.equal(
    repository.search({ ...all, text: "파란 구급상자" })[0].name,
    "반창고",
  );
  assert.equal(repository.search({ ...all, location: "bedroom" }).length, 4);
  assert.equal(
    repository.search({ ...all, location: "unassigned" })[0].name,
    "휴대용 손전등",
  );
  assert.equal(
    repository.search({ ...all, location: "bedroom", text: "충전기" }).length,
    1,
  );
  assert.equal(repository.search({ ...all, text: "없는물건" }).length, 0);
});

test("등록·수정·이동·삭제 후 데이터와 필터가 일치한다", () => {
  const repository = new MemoryRepository();
  repository.saveItem({
    ...draft,
    name: "  테스트 물품  ",
    tags: ["여행", "여행", ""],
  });
  const added = repository.search({ ...all, text: "테스트 물품" })[0];
  assert.equal(added.name, "테스트 물품");
  assert.deepEqual(added.tags, ["여행"]);
  repository.saveItem({ ...added, name: "수정한 물품", quantity: 3 }, added.id);
  repository.moveItem(added.id, "desk");
  assert.equal(
    repository.search({ ...all, text: "수정한 물품", location: "bedroom" })
      .length,
    0,
  );
  const moved = repository.search({
    ...all,
    text: "수정한 물품",
    location: "study",
  })[0];
  assert.equal(moved.quantity, 3);
  assert.equal(moved.createdAt, added.createdAt);
  repository.moveItem(added.id, null);
  assert.equal(
    repository.search({ ...all, text: "수정한 물품", location: "unassigned" })
      .length,
    1,
  );
  repository.deleteItem(added.id);
  assert.equal(repository.snapshot().items.length, 15);
});

test("잘못된 수량·빈 이름·존재하지 않는 위치·다른 그룹 위치는 저장되지 않는다", () => {
  const seed = createSeed();
  seed.locations.push({
    id: "other",
    groupId: "other-group",
    name: "다른 그룹",
    parentId: null,
    kind: "공간",
  });
  const repository = new MemoryRepository(seed);
  const before = repository.snapshot();
  for (const quantity of [0, -1, 1.5, NaN, Infinity, 1_000_000])
    assert.throws(() => repository.saveItem({ ...draft, quantity }), /수량/);
  assert.throws(() => repository.saveItem({ ...draft, name: "  " }), /이름/);
  assert.throws(
    () => repository.saveItem({ ...draft, locationId: "unknown" }),
    /위치/,
  );
  assert.throws(
    () => repository.saveItem({ ...draft, locationId: "other" }),
    /위치/,
  );
  assert.throws(
    () => repository.saveItem({ ...draft, tags: ["a".repeat(21)] }),
    /태그/,
  );
  assert.throws(
    () => repository.saveItem({ ...draft, note: "a".repeat(1001) }),
    /메모/,
  );
  assert.deepEqual(repository.snapshot(), before);
});

test("위치 이름과 상위 위치 변경이 기존 물품 경로에 반영된다", () => {
  const repository = new MemoryRepository();
  repository.saveLocation(
    { name: "침실", parentId: "home", kind: "방" },
    "bedroom",
  );
  assert.equal(
    locationPath(repository.snapshot().locations, "drawer1"),
    "우리 집 › 침실 › 서랍장 › 첫째 서랍",
  );
  repository.saveLocation(
    { name: "서랍장", parentId: "living", kind: "가구" },
    "dresser",
  );
  assert.equal(
    locationPath(repository.snapshot().locations, "drawer1"),
    "우리 집 › 거실 › 서랍장 › 첫째 서랍",
  );
  assert.equal(repository.search({ ...all, location: "living" }).length, 8);
  assert.equal(repository.search({ ...all, location: "bedroom" }).length, 0);
});

test("자신·하위 위치로 이동, 없는 상위 위치, 같은 상위의 이름 중복을 차단한다", () => {
  const repository = new MemoryRepository();
  const before = repository.snapshot();
  assert.throws(
    () =>
      repository.saveLocation(
        { name: "우리 집", parentId: "home", kind: "공간" },
        "home",
      ),
    /하위/,
  );
  assert.throws(
    () =>
      repository.saveLocation(
        { name: "우리 집", parentId: "drawer1", kind: "공간" },
        "home",
      ),
    /하위/,
  );
  assert.throws(
    () =>
      repository.saveLocation({
        name: "책상",
        parentId: "unknown",
        kind: "가구",
      }),
    /상위/,
  );
  assert.throws(
    () =>
      repository.saveLocation({ name: "안방", parentId: "home", kind: "방" }),
    /동일한 이름/,
  );
  assert.deepEqual(repository.snapshot(), before);
});

test("하위 위치·물품이 있는 위치는 삭제를 막고, 빈 위치는 추가·삭제한다", () => {
  const repository = new MemoryRepository();
  assert.throws(() => repository.deleteLocation("home"), /하위 위치/);
  assert.throws(() => repository.deleteLocation("drawer1"), /물품/);
  repository.saveLocation({ name: "빈 상자", parentId: "home", kind: "기타" });
  const added = repository
    .snapshot()
    .locations.find((location) => location.name === "빈 상자")!;
  repository.deleteLocation(added.id);
  assert.equal(repository.snapshot().locations.length, 12);
});

test("같은 이름의 물품은 허용하며 저장소 밖의 변경으로 데이터가 오염되지 않는다", () => {
  const repository = new MemoryRepository();
  repository.saveItem({ ...draft, name: "충전기" });
  assert.equal(repository.search({ ...all, text: "충전기" }).length, 3);
  const snapshot = repository.snapshot();
  snapshot.items[0].name = "외부 변경";
  snapshot.items[0].tags.push("외부태그");
  assert.equal(repository.search({ ...all, text: "외부 변경" }).length, 0);
  assert.equal(repository.search({ ...all, text: "외부태그" }).length, 0);
});

test("새 저장소는 초기 데이터로 시작하고 삭제된 대상을 조작하면 오류를 반환한다", () => {
  const repository = new MemoryRepository();
  repository.deleteItem("item-1");
  assert.throws(() => repository.moveItem("item-1", "desk"), /찾을 수/);
  assert.throws(() => repository.deleteItem("item-1"), /찾을 수/);
  assert.equal(new MemoryRepository().snapshot().items.length, 15);
});
