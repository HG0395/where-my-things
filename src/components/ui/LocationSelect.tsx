import { useI18n } from "../../i18n/context.ts";
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
  const { t } = useI18n();
  return (
    <select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">{t(rootLabel)}</option>
      {orderedLocations(locations).map((location) => (
        <option
          key={location.id}
          value={location.id}
          disabled={excluded.has(location.id)}
        >
          {locationPath(locations, location.id, t("위치 미지정"))}
        </option>
      ))}
    </select>
  );
}
