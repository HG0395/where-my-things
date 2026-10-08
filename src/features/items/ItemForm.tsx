import { useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Item, ItemDraft, StorageLocation } from "../../domain/types.ts";
import { LocationSelect } from "../../components/ui/LocationSelect.tsx";
import { readPhoto } from "../../lib/imageValidation.ts";

export function ItemForm({
  item,
  locations,
  initialLocation,
  onSave,
  onClose,
}: {
  item?: Item;
  locations: StorageLocation[];
  initialLocation: string;
  onSave: (draft: ItemDraft) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item?.name ?? "");
  const [locationId, setLocationId] = useState(
    item?.locationId ?? initialLocation,
  );
  const [quantity, setQuantity] = useState(String(item?.quantity ?? 1));
  const [tags, setTags] = useState(item?.tags.join(", ") ?? "");
  const [note, setNote] = useState(item?.note ?? "");
  const [photo, setPhoto] = useState<string | null>(item?.photo ?? null);
  const [error, setError] = useState("");
  const [reading, setReading] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const photoRequest = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  async function selectPhoto(file?: File) {
    if (!file) return;
    const request = ++photoRequest.current;
    setError("");
    setReading(true);
    setShowCandidates(false);
    try {
      const nextPhoto = await readPhoto(file);
      if (request === photoRequest.current) setPhoto(nextPhoto);
    } catch (cause) {
      if (request === photoRequest.current) setError((cause as Error).message);
    } finally {
      if (request === photoRequest.current) setReading(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      onSave({
        name,
        locationId: locationId || null,
        quantity: Number(quantity),
        tags: tags.split(/[,，]/),
        note,
        photo,
      });
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <div className="photo-editor">
        {photo ? (
          <img className="photo-preview" src={photo} alt="선택한 물품 사진" />
        ) : (
          <div className="photo-placeholder">
            <span aria-hidden="true">▧</span>
            <p>사진으로 더 쉽게 기억해요</p>
          </div>
        )}
        <div className="button-row">
          <button
            type="button"
            className="button secondary small"
            disabled={reading}
            onClick={() => fileInput.current?.click()}
          >
            사진 {photo ? "교체" : "선택"}
          </button>
          <button
            type="button"
            className="button secondary small"
            disabled={reading}
            onClick={() => cameraInput.current?.click()}
          >
            사진 촬영
          </button>
          {photo && (
            <button
              type="button"
              className="text-button"
              disabled={reading}
              onClick={() => {
                photoRequest.current++;
                setPhoto(null);
                setShowCandidates(false);
              }}
            >
              사진 제거
            </button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="물품 사진 파일"
          className="file-input"
          onChange={(event) => {
            void selectPhoto(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <input
          ref={cameraInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          aria-label="카메라로 물품 사진 촬영"
          className="file-input"
          onChange={(event) => {
            void selectPhoto(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <p className="help">
          {reading
            ? "사진을 확인하고 있어요…"
            : "선택 사항 · JPEG, PNG, WebP · 최대 5MB. 촬영은 기기에 따라 파일 선택으로 열릴 수 있어요."}
        </p>
      </div>
      <div className="ai-panel">
        <div className="section-row">
          <div>
            <strong>모의 AI 분석</strong>
            <p className="help">
              실제 사진을 인식하지 않습니다. 정해진 후보로 보정 과정을 체험해요.
            </p>
          </div>
          <button
            type="button"
            className="button secondary small"
            disabled={!photo || reading}
            onClick={() => setShowCandidates(true)}
          >
            모의 분석
          </button>
        </div>
        {showCandidates && (
          <div className="candidate-list">
            <p className="help">
              후보를 선택한 뒤 아래 입력값을 직접 고쳐 주세요. 저장 전에는
              등록되지 않아요.
            </p>
            {[
              ["충전기", "전자기기"],
              ["가위", "문구"],
              ["텀블러", "주방"],
            ].map(([candidate, tag]) => (
              <button
                type="button"
                key={candidate}
                className="chip candidate"
                onClick={() => {
                  setName(candidate);
                  setTags(tag);
                }}
              >
                {candidate} · {tag}
              </button>
            ))}
          </div>
        )}
      </div>
      <label htmlFor="item-name">
        물품 이름 <span className="required">필수</span>
      </label>
      <input
        id="item-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={80}
        required
        placeholder="예: 여행용 충전기"
      />
      <div className="form-grid">
        <div>
          <label htmlFor="item-location">보관 위치</label>
          <LocationSelect
            locations={locations}
            value={locationId}
            onChange={setLocationId}
            id="item-location"
          />
        </div>
        <div>
          <label htmlFor="item-quantity">
            수량 <span className="required">필수</span>
          </label>
          <input
            id="item-quantity"
            type="number"
            min="1"
            max="999999"
            step="1"
            required
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </div>
      </div>
      <label htmlFor="item-tags">태그</label>
      <input
        id="item-tags"
        value={tags}
        onChange={(event) => setTags(event.target.value)}
        placeholder="여행, 전자기기"
        aria-describedby="tags-help"
      />
      <p className="help" id="tags-help">
        쉼표로 구분해 주세요. 최대 10개, 각 20자까지 가능해요.
      </p>
      <label htmlFor="item-note">메모</label>
      <textarea
        id="item-note"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="색상, 특징, 함께 보관한 물건 등을 적어 주세요."
      />
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <footer className="modal-actions">
        <button type="button" className="button secondary" onClick={onClose}>
          취소
        </button>
        <button type="submit" disabled={reading} className="button primary">
          {item ? "수정 저장" : "물품 등록"}
        </button>
      </footer>
    </form>
  );
}
