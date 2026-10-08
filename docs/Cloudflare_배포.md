# Cloudflare Pages 배포와 흰 화면 복구

## 원인과 수정

문제가 있던 공개 사이트는 HTTP 200이었지만 HTML에서 `/src/main.tsx`를 직접 참조했습니다. Vite 개발 서버 없이 TypeScript와 패키지 import를 실행할 수 없으므로 화면이 비어 있었습니다. Cloudflare Pages 설정에서도 Build command와 Build output이 비어 있었습니다.

Workers & Pages → `where-my-things` → Settings → Build configuration에서 다음을 저장합니다.

| 항목 | 값 |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | 비워 둠: 저장소 루트 |
| Production branch | `main` |
| Node | 저장소 `.node-version`의 22.16.0 |

이후 main에 업로드하면 연결된 GitHub 저장소에서 자동 빌드합니다. 설정만 바꿔서는 이미 배포된 HTML이 바뀌지 않으므로 새 배포 성공을 확인하세요. 소스 폴더 전체를 정적 파일로 업로드하지 마세요.

## 생성되는 경로

`/` 홈, `/guide/` 정리 가이드, `/ai-guide/` 사진·AI 가이드, `/privacy/` 개인정보 안내, `/about/` 소개·문의가 생성됩니다. 영어는 `/en/` 아래 같은 구조입니다. 물품 관리 데모는 `/app/`입니다. 공개 HTML은 JavaScript 없이도 내용과 링크를 제공합니다. 존재하지 않는 URL은 광고 없는 404 페이지로 응답합니다.

## 환경변수와 백엔드

공개 페이지와 데모에는 API 설정이 필요 없습니다. 설정 없는 새 Cloudflare 배포에서는 실제 로그인·분석을 사용할 수 없습니다. 실제 기능을 연결할 때는 Cloudflare 빌드 변수에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` 두 공개 값만 넣습니다. 값을 저장한 뒤 다시 빌드해야 반영됩니다.

Gemini 키, service_role 키, 서버 암호화 키는 VITE 변수나 저장소에 절대로 넣지 마세요. `.env.server`를 Cloudflare에 통째로 가져오지 마세요. 실제 분석에는 Supabase `ALLOWED_ORIGINS`에 정확한 프로덕션 사이트 origin을 추가하고 Auth Site URL과 이메일 확인 리디렉션도 프로덕션으로 설정해야 합니다. 기존 로컬 origin을 무조건 삭제하거나 모든 preview 도메인을 와일드카드로 허용하지 마세요. [서버 설정 안내](사용자_API_설정.md)를 함께 따르세요.

## 콘텐츠 보완 기준

- 독창적인 가치: 이 앱에서 따라 할 수 있는 위치 이름, 물품 이름·태그, 이동 순서, 사진 보정 예시를 직접 작성했습니다.
- 쉬운 탐색: 모든 안내 페이지에 주 메뉴, 관련 안내, 체험 바로가기, 문의 경로를 제공합니다.
- 약속한 기능: 현재 메모리 데모의 초기화와 미구현 동기화를 공개합니다. AI가 보관 위치를 알아낸다고 주장하지 않습니다.
- 중복 방지: 정리법·AI·데이터·소개를 서로 다른 목적의 페이지로 구분합니다. 한국어·영어는 hreflang을 명시합니다.
- 광고: 사용자가 제공한 게시자 ID로 공개 페이지에 AdSense 코드·확인 메타 태그, 루트에 ads.txt를 추가했습니다. 개인 보관함·로그인·404에는 광고 스크립트를 추가하지 않습니다. 실제 게재는 Google의 승인과 설정에 따릅니다. [AdSense 설정](AdSense_설정.md)

참고한 원문: [Google 1부](https://adsense.googleblog.com/2012/04/tips-for-creating-high-quality-sites.html), [Google 한국어 2부](https://adsense-ko.googleblog.com/2012/09/2.html). 오래된 글의 원칙을 반영한 것이며 모든 최신 AdSense 정책 충족이나 승인·수익을 보장하지 않습니다. [Cloudflare 빌드 설정](https://developers.cloudflare.com/pages/configuration/build-configuration/).

## 확인 순서

1. 새 배포의 빌드 로그에 `npm run build`와 `Built 10 public pages`가 있는지 확인합니다.
2. 홈·영어 홈·가이드를 열고, 체험 버튼으로 `/app/`에 들어갑니다.
3. 데모 검색·등록·이동과 모바일 메뉴를 확인합니다.
4. 없는 URL이 홈으로 가장하지 않고 404로 응답하는지 확인합니다.
5. 이전 화면이 보이면 강력 새로고침하고 배포의 커밋 번호가 최신 main인지 확인합니다.
