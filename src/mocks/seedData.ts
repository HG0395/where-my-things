import type { Snapshot } from "../domain/types.ts";

export function createSeed(): Snapshot {
  const groupId = "demo-home";
  const locations: Snapshot["locations"] = [
    { id: "home", groupId, parentId: null, name: "우리 집", kind: "공간" },
    { id: "bedroom", groupId, parentId: "home", name: "안방", kind: "방" },
    {
      id: "dresser",
      groupId,
      parentId: "bedroom",
      name: "서랍장",
      kind: "가구",
    },
    {
      id: "drawer1",
      groupId,
      parentId: "dresser",
      name: "첫째 서랍",
      kind: "서랍",
    },
    {
      id: "drawer2",
      groupId,
      parentId: "dresser",
      name: "둘째 서랍",
      kind: "서랍",
    },
    { id: "living", groupId, parentId: "home", name: "거실", kind: "방" },
    {
      id: "cabinet",
      groupId,
      parentId: "living",
      name: "수납장",
      kind: "가구",
    },
    { id: "study", groupId, parentId: "home", name: "서재", kind: "방" },
    { id: "desk", groupId, parentId: "study", name: "책상", kind: "가구" },
    {
      id: "deskdrawer",
      groupId,
      parentId: "desk",
      name: "책상 서랍",
      kind: "서랍",
    },
    { id: "kitchen", groupId, parentId: "home", name: "주방", kind: "방" },
    { id: "shelf", groupId, parentId: "kitchen", name: "선반", kind: "가구" },
  ];
  const rows: [string, string | null, number, string[], string][] = [
    ["여권", "drawer1", 1, ["여행", "중요"], "여행 준비할 때 가장 먼저 챙기기"],
    ["충전기", "deskdrawer", 2, ["전자기기", "USB-C"], "노트북과 휴대폰용"],
    ["충전기", "drawer2", 1, ["전자기기", "여행"], "여행용 파우치에 보관"],
    ["무선 이어폰", "desk", 1, ["전자기기"], "충전 케이스와 함께 보관"],
    ["건전지", "cabinet", 8, ["생활용품"], "AA 규격"],
    ["반창고", "cabinet", 1, ["구급용품"], "파란 구급상자 안"],
    ["가위", "deskdrawer", 1, ["문구"], "손잡이가 초록색"],
    ["줄자", "cabinet", 1, ["공구"], "3m 줄자"],
    ["겨울 장갑", "drawer2", 2, ["의류", "겨울"], "산책할 때 사용하는 장갑"],
    [
      "인감도장 보관 케이스와 예비 열쇠 묶음",
      "drawer1",
      1,
      ["중요"],
      "갈색 케이스",
    ],
    ["드립 커피 필터", "shelf", 40, ["주방", "커피"], "종이 필터"],
    ["텀블러", "shelf", 2, ["주방"], "외출할 때 챙기기"],
    ["보드게임", "cabinet", 3, ["취미"], "친구들과 함께 하는 게임"],
    ["공책", "desk", 4, ["문구", "공부"], "새 공책"],
    ["휴대용 손전등", null, 1, ["생활용품"], "보관할 위치를 정해야 해요"],
  ];
  const now = "2026-01-01T00:00:00.000Z";
  return {
    group: { id: groupId, name: "우리 집" },
    locations,
    items: rows.map(([name, locationId, quantity, tags, note], index) => ({
      id: `item-${index + 1}`,
      groupId,
      name,
      locationId,
      quantity,
      tags,
      note,
      photo: null,
      createdAt: now,
      updatedAt: now,
    })),
  };
}
