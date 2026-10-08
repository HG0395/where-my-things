export async function readPhoto(file: File): Promise<string> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error(
      "JPEG, PNG, WebP 사진만 사용할 수 있어요. HEIC 사진은 JPEG로 변환해 주세요.",
    );
  if (file.size > 5 * 1024 * 1024)
    throw new Error("사진은 5MB 이하로 선택해 주세요.");
  if (!file.size)
    throw new Error("비어 있는 파일입니다. 다른 사진을 선택해 주세요.");
  const result = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("사진을 읽지 못했어요."));
    reader.onerror = () =>
      reject(new Error("사진을 읽지 못했어요. 다시 선택해 주세요."));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.src = result;
  try {
    await image.decode();
  } catch {
    throw new Error("열 수 없는 사진입니다. 다른 파일을 선택해 주세요.");
  }
  if (image.naturalWidth * image.naturalHeight > 40_000_000)
    throw new Error("사진 해상도가 너무 커요. 4천만 화소 이하로 줄여 주세요.");
  return result;
}
