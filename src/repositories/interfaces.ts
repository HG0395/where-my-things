import type {
  Item,
  ItemDraft,
  LocationKind,
  Snapshot,
} from "../domain/types.ts";
export interface ItemQuery {
  text: string;
  location: string;
  sort: "recent" | "name";
}
export interface LocationDraft {
  name: string;
  parentId: string | null;
  kind: LocationKind;
}
export interface InventoryRepository {
  snapshot(): Snapshot;
  search(query: ItemQuery): Item[];
  saveItem(draft: ItemDraft, id?: string): void;
  moveItem(id: string, locationId: string | null): void;
  deleteItem(id: string): void;
  saveLocation(draft: LocationDraft, id?: string): void;
  deleteLocation(id: string): void;
}
