import type { ItemDraft, LocationKind, Snapshot } from "../../domain/types.ts";
import { validateItem } from "../../domain/validation.ts";
import { descendantIds } from "../../lib/locationTree.ts";
import type {
  InventoryRepository,
  ItemQuery,
  LocationDraft,
} from "../interfaces.ts";
import { createSeed } from "../../mocks/seedData.ts";

export class MemoryRepository implements InventoryRepository {
  private data: Snapshot;
  constructor(seed = createSeed()) {
    this.data = structuredClone(seed);
  }
  snapshot(): Snapshot {
    return structuredClone(this.data);
  }
  search({ text, location, sort }: ItemQuery) {
    const query = text.trim().normalize("NFC").toLocaleLowerCase("ko");
    const ids =
      location && location !== "unassigned"
        ? descendantIds(this.data.locations, location)
        : null;
    const result = this.data.items.filter((item) => {
      const matchText = [item.name, item.note, ...item.tags].some((value) =>
        value.normalize("NFC").toLocaleLowerCase("ko").includes(query),
      );
      const matchLocation =
        !location ||
        (location === "unassigned"
          ? !item.locationId
          : !!item.locationId && ids!.has(item.locationId));
      return matchText && matchLocation;
    });
    result.sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "ko")
        : b.updatedAt.localeCompare(a.updatedAt) ||
          a.name.localeCompare(b.name, "ko"),
    );
    return structuredClone(result);
  }
  saveItem(draft: ItemDraft, id?: string) {
    const clean = validateItem(draft, this.data.locations, this.data.group.id);
    const now = new Date().toISOString();
    if (id) {
      const index = this.data.items.findIndex((item) => item.id === id);
      if (index < 0) throw new Error("물품을 찾을 수 없습니다.");
      this.data.items[index] = {
        ...this.data.items[index],
        ...clean,
        updatedAt: now,
      };
    } else
      this.data.items.unshift({
        ...clean,
        id: crypto.randomUUID(),
        groupId: this.data.group.id,
        createdAt: now,
        updatedAt: now,
      });
  }
  moveItem(id: string, locationId: string | null) {
    const item = this.data.items.find((entry) => entry.id === id);
    if (!item) throw new Error("물품을 찾을 수 없습니다.");
    this.saveItem({ ...item, locationId }, id);
  }
  deleteItem(id: string) {
    if (!this.data.items.some((item) => item.id === id))
      throw new Error("물품을 찾을 수 없습니다.");
    this.data.items = this.data.items.filter((item) => item.id !== id);
  }
  saveLocation(draft: LocationDraft, id?: string) {
    const name = draft.name.trim();
    if (!name || name.length > 50)
      throw new Error("위치 이름은 1자부터 50자까지 입력해 주세요.");
    const kinds: LocationKind[] = ["공간", "방", "가구", "서랍", "기타"];
    if (!kinds.includes(draft.kind))
      throw new Error("올바른 위치 종류를 선택해 주세요.");
    if (id && !this.data.locations.some((entry) => entry.id === id))
      throw new Error("위치를 찾을 수 없습니다.");
    if (
      draft.parentId &&
      !this.data.locations.some(
        (entry) =>
          entry.id === draft.parentId && entry.groupId === this.data.group.id,
      )
    )
      throw new Error("사용할 수 없는 상위 위치입니다.");
    if (
      id &&
      draft.parentId &&
      descendantIds(this.data.locations, id).has(draft.parentId)
    )
      throw new Error("자기 자신이나 하위 위치 안으로 이동할 수 없습니다.");
    if (
      this.data.locations.some(
        (entry) =>
          entry.id !== id &&
          entry.parentId === draft.parentId &&
          entry.name === name,
      )
    )
      throw new Error("같은 상위 위치에 동일한 이름이 있습니다.");
    const value = { ...draft, name, groupId: this.data.group.id };
    if (id)
      this.data.locations = this.data.locations.map((entry) =>
        entry.id === id ? { ...value, id } : entry,
      );
    else this.data.locations.push({ ...value, id: crypto.randomUUID() });
  }
  deleteLocation(id: string) {
    if (!this.data.locations.some((entry) => entry.id === id))
      throw new Error("위치를 찾을 수 없습니다.");
    if (this.data.locations.some((entry) => entry.parentId === id))
      throw new Error(
        "하위 위치가 남아 있어요. 먼저 이동하거나 삭제해 주세요.",
      );
    if (this.data.items.some((entry) => entry.locationId === id))
      throw new Error("물품이 남아 있어요. 먼저 다른 위치로 옮겨 주세요.");
    this.data.locations = this.data.locations.filter(
      (entry) => entry.id !== id,
    );
  }
}
