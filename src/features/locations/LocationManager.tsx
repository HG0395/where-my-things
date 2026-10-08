import { useState } from "react";
import type { FormEvent } from "react";
import type { LocationKind, Snapshot } from "../../domain/types.ts";
import type { LocationDraft } from "../../repositories/interfaces.ts";
import {
  descendantIds,
  locationPath,
  orderedLocations,
} from "../../lib/locationTree.ts";
import { LocationSelect } from "../../components/ui/LocationSelect.tsx";

export function LocationManager({
  data,
  onSave,
  onDelete,
}: {
  data: Snapshot;
  onSave: (draft: LocationDraft, id?: string) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [kind, setKind] = useState<LocationKind>("공간");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  function reset() {
    setEditing(null);
    setName("");
    setParentId("");
    setKind("공간");
    setError("");
    setPendingDelete(null);
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      onSave({ name, parentId: parentId || null, kind }, editing ?? undefined);
      reset();
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  const deleting = data.locations.find((entry) => entry.id === pendingDelete);
  return (
    <div className="location-manager">
      <p className="help">
        공간 안에 방, 가구, 서랍을 자유롭게 구성해 보세요. 물품이나 하위 위치가
        있는 곳은 삭제할 수 없어요.
      </p>
      <form className="form-stack location-edit" onSubmit={submit}>
        <div className="section-row">
          <h3>{editing ? "위치 수정·이동" : "새 위치 추가"}</h3>
          {editing && (
            <button type="button" className="text-button" onClick={reset}>
              새 위치 추가로 돌아가기
            </button>
          )}
        </div>
        <label htmlFor="location-name">
          위치 이름 <span className="required">필수</span>
        </label>
        <input
          id="location-name"
          required
          maxLength={50}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="예: 둘째 서랍"
        />
        <div className="form-grid">
          <div>
            <label htmlFor="location-parent">상위 위치</label>
            <LocationSelect
              id="location-parent"
              locations={data.locations}
              value={parentId}
              onChange={setParentId}
              rootLabel="최상위 공간"
              excluded={
                editing ? descendantIds(data.locations, editing) : undefined
              }
            />
          </div>
          <div>
            <label htmlFor="location-kind">종류</label>
            <select
              id="location-kind"
              value={kind}
              onChange={(event) => setKind(event.target.value as LocationKind)}
            >
              {(["공간", "방", "가구", "서랍", "기타"] as const).map(
                (value) => (
                  <option key={value}>{value}</option>
                ),
              )}
            </select>
          </div>
        </div>
        {error && !pendingDelete && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <div className="button-row">
          <button type="submit" className="button primary small">
            {editing ? "위치 수정 저장" : "위치 추가"}
          </button>
          {editing && (
            <button
              type="button"
              className="button secondary small"
              onClick={reset}
            >
              취소
            </button>
          )}
        </div>
      </form>
      {deleting && (
        <div className="delete-inline" role="group" aria-label="위치 삭제 확인">
          <p>
            <strong>{deleting.name}</strong> 위치를 삭제할까요?
          </p>
          <p className="help">하위 위치 또는 물품이 있으면 삭제가 차단돼요.</p>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="button-row">
            <button
              type="button"
              className="button secondary small"
              onClick={() => setPendingDelete(null)}
            >
              취소
            </button>
            <button
              type="button"
              className="button danger small"
              onClick={() => {
                setError("");
                try {
                  onDelete(deleting.id);
                  reset();
                } catch (cause) {
                  setError((cause as Error).message);
                }
              }}
            >
              위치 삭제 확인
            </button>
          </div>
        </div>
      )}
      <div className="managed-locations">
        {orderedLocations(data.locations).map((location) => (
          <div className="managed-row" key={location.id}>
            <div>
              <span className="eyebrow">{location.kind}</span>
              <p className="path">
                {locationPath(data.locations, location.id)}
              </p>
              <p className="help">
                직접 보관한 물품{" "}
                {
                  data.items.filter((item) => item.locationId === location.id)
                    .length
                }
                종
              </p>
            </div>
            <div className="button-row">
              <button
                type="button"
                className="button secondary small"
                aria-label={`${location.name} 위치 수정`}
                onClick={() => {
                  setEditing(location.id);
                  setName(location.name);
                  setParentId(location.parentId ?? "");
                  setKind(location.kind);
                  setError("");
                  setPendingDelete(null);
                  document.getElementById("location-name")?.focus();
                }}
              >
                수정
              </button>
              <button
                type="button"
                className="text-button danger-text"
                aria-label={`${location.name} 위치 삭제`}
                onClick={() => {
                  setPendingDelete(location.id);
                  setError("");
                }}
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
