import type { StorageLocation } from "../domain/types.ts";

export function locationPath(
  locations: StorageLocation[],
  id: string | null,
  unassignedLabel = "위치 미지정",
): string {
  if (!id) return unassignedLabel;
  const names: string[] = [];
  const visited = new Set<string>();
  let current = locations.find((location) => location.id === id);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    names.unshift(current.name);
    current = locations.find((location) => location.id === current?.parentId);
  }
  return names.join(" › ") || unassignedLabel;
}

export function descendantIds(
  locations: StorageLocation[],
  id: string,
): Set<string> {
  const result = new Set([id]);
  const pending = [id];
  while (pending.length) {
    const parent = pending.pop();
    for (const location of locations) {
      if (location.parentId === parent && !result.has(location.id)) {
        result.add(location.id);
        pending.push(location.id);
      }
    }
  }
  return result;
}

export function orderedLocations(
  locations: StorageLocation[],
): StorageLocation[] {
  const result: StorageLocation[] = [];
  const visited = new Set<string>();
  function visit(parentId: string | null) {
    for (const location of locations.filter(
      (entry) => entry.parentId === parentId,
    )) {
      if (visited.has(location.id)) continue;
      visited.add(location.id);
      result.push(location);
      visit(location.id);
    }
  }
  visit(null);
  return result;
}
