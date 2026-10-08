import type { StorageLocation } from "../../domain/types.ts";
import { locationPath, orderedLocations } from "../../lib/locationTree.ts";
export function LocationSelect({
  locations,
  value,
  onChange,
  id,
  rootLabel = "위치 미지정",
  excluded = new Set<string>(),
}: {
  locations: StorageLocation[];
  value: string;
  onChange: (value: string) => void;
  id: string;
  rootLabel?: string;
  excluded?: Set<string>;
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{rootLabel}</option>
      {orderedLocations(locations).map((location) => (
        <option
          key={location.id}
          value={location.id}
          disabled={excluded.has(location.id)}
        >
          {locationPath(locations, location.id)}
        </option>
      ))}
    </select>
  );
}
