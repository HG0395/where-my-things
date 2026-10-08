import { useState } from "react";
import type { FormEvent } from "react";
import type { Item, StorageLocation } from "./domain/types.ts";
import { MemoryRepository } from "./repositories/memory/MemoryRepository.ts";
import { locationPath, orderedLocations } from "./lib/locationTree.ts";
import { Modal } from "./components/ui/Modal.tsx";
import { LocationSelect } from "./components/ui/LocationSelect.tsx";
import { ItemForm } from "./features/items/ItemForm.tsx";
import { LocationManager } from "./features/locations/LocationManager.tsx";
import { LocationTree } from "./features/locations/LocationTree.tsx";

type Panel =
  | { type: "new" }
  | { type: "edit" | "detail" | "move" | "delete"; id: string }
  | { type: "locations" }
  | null;
const symbols: Record<string, string> = {
  전자기기: "⌁",
  여행: "✈",
  중요: "◇",
  생활용품: "▦",
  문구: "✎",
  주방: "◒",
  의류: "♧",
  구급용품: "+",
  공구: "⚒",
  취미: "♟",
};
function itemSymbol(item: Item) {
  return symbols[item.tags[0]] ?? "▧";
}

function MoveForm({
  item,
  locations,
  onMove,
  onClose,
}: {
  item: Item;
  locations: StorageLocation[];
  onMove: (id: string | null) => void;
  onClose: () => void;
}) {
  const [target, setTarget] = useState(item.locationId ?? "");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      onMove(target || null);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }
  return (
    <form onSubmit={submit} className="form-stack">
      <p>
        <strong>{item.name}</strong> 물품을 어디로 옮길까요?
      </p>
      <div className="current-location">
        <span className="eyebrow">현재 위치</span>
        <p className="path">{locationPath(locations, item.locationId)}</p>
      </div>
      <label htmlFor="move-target">새 보관 위치</label>
      <LocationSelect
        locations={locations}
        value={target}
        onChange={setTarget}
        id="move-target"
      />
      <p className="help">
        {target === (item.locationId ?? "")
          ? "현재 위치와 같아요. 다른 위치를 선택해 주세요."
          : `이동할 위치: ${locationPath(locations, target || null)}`}
      </p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <footer className="modal-actions">
        <button type="button" className="button secondary" onClick={onClose}>
          취소
        </button>
        <button
          type="submit"
          className="button primary"
          disabled={target === (item.locationId ?? "")}
        >
          이동 저장
        </button>
      </footer>
    </form>
  );
}

function App() {
  const [repository] = useState(() => new MemoryRepository());
  const [data, setData] = useState(() => repository.snapshot());
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [panel, setPanel] = useState<Panel>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const results = repository.search({ text: query, location, sort });
  const selectedItem =
    panel && "id" in panel
      ? data.items.find((item) => item.id === panel.id)
      : undefined;
  const locationLabel =
    location === "unassigned"
      ? "위치 미지정"
      : location
        ? locationPath(data.locations, location)
        : "모든 물품";
  function refresh(message: string) {
    setData(repository.snapshot());
    setNotice(message);
    setActionError("");
  }
  function open(next: Panel) {
    setPanel(next);
    setActionError("");
  }
  const close = () => setPanel(null);

  return (
    <>
      <a href="#main-content" className="skip-link">
        물품 목록으로 건너뛰기
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <a
            className="brand"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              setLocation("");
              setQuery("");
            }}
          >
            <span className="brand-mark" aria-hidden="true">
              ⌕
            </span>
            <span>
              어디뒀지<span className="brand-question">?</span>
            </span>
          </a>
          <p className="brand-caption">기억 대신, 나만의 보관 지도</p>
          <div className="workspace">
            <span className="workspace-icon" aria-hidden="true">
              ⌂
            </span>
            <div>
              <strong>{data.group.name}</strong>
              <span>데모 사용자 · 개인 공간</span>
            </div>
            <span className="demo-dot" aria-hidden="true" />
          </div>
          <div className="sidebar-heading">
            <h2>보관 위치</h2>
            <button
              type="button"
              className="text-button"
              onClick={() => open({ type: "locations" })}
            >
              관리
            </button>
          </div>
          <LocationTree
            data={data}
            selected={location}
            onSelect={setLocation}
          />
          <div className="sidebar-bottom">
            <span className="demo-badge">DEMO</span>
            <p>
              로그인 없이 둘러보는 중이에요.
              <br />
              모든 데이터는 이 화면에서만 유지돼요.
            </p>
          </div>
        </aside>
        <div className="main-shell">
          <header className="topbar">
            <span className="topbar-label">내 물품 보관함</span>
            <div className="button-row">
              <span className="local-indicator">
                <span />
                모의 데이터
              </span>
              <span className="avatar" aria-label="데모 사용자">
                나
              </span>
            </div>
          </header>
          <main id="main-content" className="main-content">
            <div className="page-heading">
              <div>
                <p className="eyebrow">MY INVENTORY</p>
                <h1>찾는 물건, 여기 있어요.</h1>
                <p className="subtitle">
                  어디에 뒀는지 기억하지 않아도 괜찮아요.
                </p>
              </div>
              <button
                type="button"
                className="button primary add-button"
                onClick={() => open({ type: "new" })}
              >
                <span aria-hidden="true">＋</span> 물품 등록
              </button>
            </div>
            <div className="demo-banner">
              <span aria-hidden="true">ⓘ</span>
              <p>
                <strong>데모 모드</strong> · 새로고침하면 물품·위치·사진이
                초기화됩니다. 사진은 서버로 전송되지 않아요.
              </p>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon teal" aria-hidden="true">
                  ▦
                </span>
                <div>
                  <span>등록한 물품</span>
                  <p>
                    {data.items.length}
                    <small>종</small>
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon sand" aria-hidden="true">
                  ⌂
                </span>
                <div>
                  <span>보관 위치</span>
                  <p>
                    {data.locations.length}
                    <small>곳</small>
                  </p>
                </div>
              </div>
              <div className="stat-card">
                <span className="stat-icon lavender" aria-hidden="true">
                  ⌖
                </span>
                <div>
                  <span>위치 미지정</span>
                  <p>
                    {data.items.filter((item) => !item.locationId).length}
                    <small>종</small>
                  </p>
                </div>
              </div>
            </div>
            <section
              className="inventory-section"
              aria-labelledby="inventory-heading"
            >
              <div className="inventory-toolbar">
                <div className="search-field">
                  <span aria-hidden="true">⌕</span>
                  <label className="sr-only" htmlFor="search">
                    물품 검색
                  </label>
                  <input
                    type="search"
                    id="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="물품 이름, 태그, 메모로 검색"
                  />
                  {query && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="검색어 지우기"
                      onClick={() => setQuery("")}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="mobile-location">
                  <label className="sr-only" htmlFor="mobile-location">
                    보관 위치 필터
                  </label>
                  <select
                    id="mobile-location"
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                  >
                    <option value="">모든 위치</option>
                    <option value="unassigned">위치 미지정</option>
                    {orderedLocations(data.locations).map((entry) => (
                      <option value={entry.id} key={entry.id}>
                        {locationPath(data.locations, entry.id)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="button secondary manage-button"
                  onClick={() => open({ type: "locations" })}
                >
                  위치 관리
                </button>
              </div>
              <div className="results-heading">
                <div>
                  <h2 id="inventory-heading">
                    {location ? "이 위치의 물품" : "모든 물품"}{" "}
                    <span>{results.length}</span>
                  </h2>
                  <p className="filter-path">
                    {locationLabel}
                    {location && location !== "unassigned"
                      ? " · 하위 위치 포함"
                      : ""}
                  </p>
                </div>
                <div className="sort-field">
                  <label className="sr-only" htmlFor="sort">
                    물품 정렬
                  </label>
                  <select
                    id="sort"
                    value={sort}
                    onChange={(event) =>
                      setSort(event.target.value as "recent" | "name")
                    }
                  >
                    <option value="recent">최근 변경순</option>
                    <option value="name">이름순</option>
                  </select>
                </div>
              </div>
              <p className="sr-only" role="status">
                검색 결과 {results.length}종
              </p>
              {results.length ? (
                <div className="items-grid">
                  {results.map((item) => (
                    <button
                      type="button"
                      className="item-card"
                      key={item.id}
                      onClick={() => open({ type: "detail", id: item.id })}
                      aria-label={`${item.name}, ${locationPath(data.locations, item.locationId)}, 상세 보기`}
                    >
                      <div
                        className={
                          item.photo
                            ? "item-visual has-photo"
                            : `item-visual tone-${item.tags[0] === "전자기기" ? "blue" : item.tags[0] === "주방" ? "sand" : item.tags[0] === "문구" ? "purple" : "teal"}`
                        }
                      >
                        {item.photo ? (
                          <img src={item.photo} alt="" loading="lazy" />
                        ) : (
                          <span className="item-symbol" aria-hidden="true">
                            {itemSymbol(item)}
                          </span>
                        )}
                        <span className="quantity-badge">
                          {item.quantity}개
                        </span>
                        {!item.photo && (
                          <span className="no-photo">사진 미등록</span>
                        )}
                      </div>
                      <div className="item-card-body">
                        <h3>{item.name}</h3>
                        <p className="item-path">
                          <span aria-hidden="true">⌖</span>
                          {locationPath(data.locations, item.locationId)}
                        </p>
                        <div className="tags">
                          {item.tags.slice(0, 2).map((tag) => (
                            <span className="chip" key={tag}>
                              {tag}
                            </span>
                          ))}
                          {item.tags.length > 2 && (
                            <span className="chip">
                              +{item.tags.length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <span aria-hidden="true">⌕</span>
                  <h3>
                    {query || location
                      ? "검색 결과가 없어요"
                      : "아직 등록된 물품이 없어요"}
                  </h3>
                  <p>
                    {query || location
                      ? "다른 검색어나 보관 위치로 찾아보세요."
                      : "첫 물품을 등록하고 보관 위치를 기록해 보세요."}
                  </p>
                  {query || location ? (
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => {
                        setQuery("");
                        setLocation("");
                      }}
                    >
                      검색·필터 초기화
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="button primary"
                      onClick={() => open({ type: "new" })}
                    >
                      첫 물품 등록
                    </button>
                  )}
                </div>
              )}
            </section>
            <footer className="page-footer">
              어디뒀지? <span>작은 기록으로, 더 가벼운 일상.</span>
            </footer>
          </main>
        </div>
      </div>
      <div className={notice ? "toast visible" : "toast"} role="status">
        {notice}
        {notice && (
          <button
            type="button"
            className="icon-button"
            aria-label="알림 닫기"
            onClick={() => setNotice("")}
          >
            ✕
          </button>
        )}
      </div>
      {(panel?.type === "new" || panel?.type === "edit") && (
        <Modal
          title={panel.type === "new" ? "새 물품 등록" : "물품 수정"}
          onClose={close}
        >
          <ItemForm
            item={selectedItem}
            locations={data.locations}
            initialLocation={
              location && location !== "unassigned" ? location : ""
            }
            onClose={close}
            onSave={(draft) => {
              repository.saveItem(draft, selectedItem?.id);
              refresh(
                selectedItem
                  ? "물품을 수정했어요."
                  : "물품을 등록했어요. 현재 검색·필터에 따라 목록에서 보이지 않을 수 있어요.",
              );
              close();
            }}
          />
        </Modal>
      )}
      {panel?.type === "detail" && selectedItem && (
        <Modal title="물품 상세" onClose={close}>
          <div className="item-detail">
            <div className="detail-visual">
              {selectedItem.photo ? (
                <img
                  src={selectedItem.photo}
                  alt={`${selectedItem.name} 사진`}
                />
              ) : (
                <>
                  <span aria-hidden="true">{itemSymbol(selectedItem)}</span>
                  <p>등록된 사진이 없어요</p>
                </>
              )}
            </div>
            <div className="section-row">
              <h3>{selectedItem.name}</h3>
              <span className="chip">{selectedItem.quantity}개</span>
            </div>
            <div className="current-location">
              <span className="eyebrow">보관 위치</span>
              <p className="path">
                {locationPath(data.locations, selectedItem.locationId)}
              </p>
            </div>
            <div className="tags">
              {selectedItem.tags.map((tag) => (
                <span className="chip" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
            <div>
              <h4>메모</h4>
              <p className="detail-note">
                {selectedItem.note || "작성한 메모가 없어요."}
              </p>
            </div>
            <p className="help">
              최근 변경:{" "}
              {new Date(selectedItem.updatedAt).toLocaleString("ko-KR")}
            </p>
            <footer className="modal-actions detail-actions">
              <button
                type="button"
                className="text-button danger-text"
                onClick={() => open({ type: "delete", id: selectedItem.id })}
              >
                삭제
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => open({ type: "move", id: selectedItem.id })}
              >
                위치 이동
              </button>
              <button
                type="button"
                className="button primary"
                onClick={() => open({ type: "edit", id: selectedItem.id })}
              >
                수정
              </button>
            </footer>
          </div>
        </Modal>
      )}
      {panel?.type === "move" && selectedItem && (
        <Modal title="물품 위치 이동" onClose={close}>
          <MoveForm
            item={selectedItem}
            locations={data.locations}
            onClose={close}
            onMove={(id) => {
              repository.moveItem(selectedItem.id, id);
              refresh("보관 위치를 옮겼어요.");
              close();
            }}
          />
        </Modal>
      )}
      {panel?.type === "delete" && selectedItem && (
        <Modal title="물품 삭제" onClose={close}>
          <div className="form-stack">
            <p>
              <strong>{selectedItem.name}</strong> 물품을 삭제할까요?
            </p>
            <p className="help">
              등록한 사진과 메모도 이 데모에서 함께 제거됩니다. 취소하면 그대로
              유지돼요.
            </p>
            {actionError && (
              <p className="error" role="alert">
                {actionError}
              </p>
            )}
            <footer className="modal-actions">
              <button
                type="button"
                className="button secondary"
                onClick={close}
              >
                취소
              </button>
              <button
                type="button"
                className="button danger"
                onClick={() => {
                  try {
                    repository.deleteItem(selectedItem.id);
                    refresh("물품을 삭제했어요.");
                    close();
                  } catch (cause) {
                    setActionError((cause as Error).message);
                  }
                }}
              >
                물품 삭제 확인
              </button>
            </footer>
          </div>
        </Modal>
      )}
      {panel?.type === "locations" && (
        <Modal title="보관 위치 관리" onClose={close} wide>
          <LocationManager
            data={data}
            onSave={(draft, id) => {
              repository.saveLocation(draft, id);
              refresh(
                id
                  ? "위치를 수정했어요. 물품 경로도 함께 바뀌었어요."
                  : "새 위치를 추가했어요.",
              );
            }}
            onDelete={(id) => {
              repository.deleteLocation(id);
              if (location === id) setLocation("");
              refresh("위치를 삭제했어요.");
            }}
          />
        </Modal>
      )}
    </>
  );
}
export default App;
