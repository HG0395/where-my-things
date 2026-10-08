export type LocationKind = "공간" | "방" | "가구" | "서랍" | "기타";
export interface Group {
  id: string;
  name: string;
}
export interface StorageLocation {
  id: string;
  groupId: string;
  parentId: string | null;
  name: string;
  kind: LocationKind;
}
export interface ItemDraft {
  name: string;
  locationId: string | null;
  quantity: number;
  tags: string[];
  note: string;
  photo: string | null;
}
export interface Item extends ItemDraft {
  id: string;
  groupId: string;
  createdAt: string;
  updatedAt: string;
}
export interface Snapshot {
  group: Group;
  locations: StorageLocation[];
  items: Item[];
}
