import { useState } from "react";
import type { Snapshot } from "../../domain/types.ts";
import { descendantIds } from "../../lib/locationTree.ts";

export function LocationTree({
  data,
  selected,
  onSelect,
}: {
  data: Snapshot;
  selected: string;
  onSelect: (value: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  function toggle(id: string) {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function children(parentId: string | null, depth = 0) {
    return data.locations
      .filter((location) => location.parentId === parentId)
      .map((location) => {
        const hasChildren = data.locations.some(
          (entry) => entry.parentId === location.id,
        );
        const ids = descendantIds(data.locations, location.id);
        const count = data.items.filter(
          (item) => item.locationId && ids.has(item.locationId),
        ).length;
        return (
          <li key={location.id}>
            <div
              className="tree-row"
              style={{ paddingLeft: `${depth * 13}px` }}
            >
              {hasChildren ? (
                <button
                  type="button"
                  className="tree-toggle"
                  aria-label={`${location.name} ${collapsed.has(location.id) ? "펼치기" : "접기"}`}
                  aria-expanded={!collapsed.has(location.id)}
                  onClick={() => toggle(location.id)}
                >
                  {collapsed.has(location.id) ? "›" : "⌄"}
                </button>
              ) : (
                <span className="tree-spacer" />
              )}
              <button
                type="button"
                className={
                  selected === location.id
                    ? "tree-select selected"
                    : "tree-select"
                }
                onClick={() => onSelect(location.id)}
                aria-pressed={selected === location.id}
              >
                <span className="truncate">{location.name}</span>
                <span className="tree-count">{count}</span>
              </button>
            </div>
            {hasChildren && !collapsed.has(location.id) && (
              <ul>{children(location.id, depth + 1)}</ul>
            )}
          </li>
        );
      });
  }
  return (
    <nav aria-label="보관 위치 필터" className="location-tree">
      <button
        type="button"
        onClick={() => onSelect("")}
        aria-pressed={!selected}
        className={
          !selected
            ? "tree-select selected all-locations"
            : "tree-select all-locations"
        }
      >
        <span>모든 물품</span>
        <span className="tree-count">{data.items.length}</span>
      </button>
      <ul>{children(null)}</ul>
      <button
        type="button"
        onClick={() => onSelect("unassigned")}
        aria-pressed={selected === "unassigned"}
        className={
          selected === "unassigned"
            ? "tree-select selected all-locations"
            : "tree-select all-locations"
        }
      >
        <span>위치 미지정</span>
        <span className="tree-count">
          {data.items.filter((item) => !item.locationId).length}
        </span>
      </button>
    </nav>
  );
}
