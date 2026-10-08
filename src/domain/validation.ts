import type { ItemDraft, StorageLocation } from "./types.ts";

export function validateItem(
  draft: ItemDraft,
  locations: StorageLocation[],
  groupId: string,
): ItemDraft {
  const name = draft.name.trim();
  if (!name) throw new Error("물품 이름을 입력해 주세요.");
  if (name.length > 80)
    throw new Error("물품 이름은 80자 이하로 입력해 주세요.");
  if (
    !Number.isSafeInteger(draft.quantity) ||
    draft.quantity < 1 ||
    draft.quantity > 999999
  )
    throw new Error("수량은 1부터 999,999까지의 정수로 입력해 주세요.");
  if (
    draft.locationId &&
    !locations.some(
      (location) =>
        location.id === draft.locationId && location.groupId === groupId,
    )
  )
    throw new Error("사용할 수 없는 보관 위치입니다. 다시 선택해 주세요.");
  if (draft.note.length > 1000)
    throw new Error("메모는 1,000자 이하로 입력해 주세요.");
  const tags = [
    ...new Set(draft.tags.map((tag) => tag.trim()).filter(Boolean)),
  ];
  if (tags.length > 10 || tags.some((tag) => tag.length > 20))
    throw new Error("태그는 최대 10개, 각 20자 이하로 입력해 주세요.");
  return { ...draft, name, tags, note: draft.note.trim() };
}
