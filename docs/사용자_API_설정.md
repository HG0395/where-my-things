# 사용자 API 설정 안내 — Windows VS Code

이 문서는 새 환경에서 프로젝트 연결을 재현하는 안내입니다. 운영자의 로컬 환경에는 Supabase DB와 두 서버 함수 연결을 완료했습니다. 다른 PC에서는 본인 환경설정을 준비해야 하며 비밀값은 GitHub에 포함하지 않습니다. 결제는 활성화하지 않았습니다. 물품 영구 저장·기기 동기화·가족 초대는 이 설정으로 활성화되지 않습니다.

## 1. 무료 Supabase 프로젝트 준비

Supabase에서 새 프로젝트를 만듭니다. 무료 플랜을 선택하고 유료 플랜·결제를 활성화하지 마세요. 프로젝트 비밀번호는 안전한 곳에 보관합니다. 무료 이용 조건은 가입 시 화면에서 확인하세요.

Authentication 설정에서 Email 로그인을 사용하고 이메일 확인을 켭니다. 개발 Site URL은 Vite 터미널의 Local 주소로 맞춥니다. 무료 이메일 발송 제한 때문에 가입 확인 메일이 제한될 수 있습니다. 실제 운영에는 별도 이메일 설정 검토가 필요합니다.

프로젝트 설정에서 Project URL과 브라우저용 publishable key를 확인합니다. service_role 또는 secret 키와 혼동하지 마세요.

## 2. 프런트엔드 공개 설정

VS Code에서 `.env.example`을 복사해 `.env.local`을 새로 만듭니다. 기존 파일이 있으면 덮어쓰지 말고 내용을 확인하세요.

```dotenv
VITE_SUPABASE_URL=https://본인프로젝트식별자.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=본인의_브라우저용_publishable_key
```

위 두 값만 브라우저에 공개됩니다. Gemini 키·service_role·서버 암호화 키는 여기에 넣으면 안 됩니다. 변경 후 개발 서버를 다시 실행합니다. 프로젝트가 준비되지 않았으면 환경 파일 없이 데모를 사용하세요.

## 3. 데이터베이스 준비

Supabase Dashboard의 SQL Editor에서 아래 파일 전체를 새 쿼리에 붙여 넣고 한 번 실행합니다.

`supabase/migrations/20261009000000_user_gemini_keys.sql`

새 프로젝트를 위한 초기 마이그레이션입니다. 이미 같은 이름의 테이블이 있는 프로젝트에는 그대로 실행하지 말고 먼저 구조를 비교하세요. 생성하는 것은 키·사용량·캐시 테이블입니다. 모든 테이블에 RLS가 켜지며 브라우저 사용자는 직접 읽거나 수정할 수 없습니다. service_role만 서버에서 접근합니다.

## 4. 서버 암호화 키 생성

프로젝트 루트의 VS Code 터미널에서 다음 명령을 한 번 실행합니다. 비밀값을 화면에 출력하지 않고 `.env.server` 파일을 새로 만듭니다. 파일이 이미 있으면 실패하므로 기존 암호화 키를 덮어쓰지 않습니다.

```powershell
node -e "const fs=require('node:fs'),c=require('node:crypto');fs.writeFileSync('.env.server','BYOK_ENCRYPTION_KEY='+c.randomBytes(32).toString('base64')+'\nALLOWED_ORIGINS=http://localhost:5173\n',{flag:'wx'})"
```

`.env.server`는 Git에서 제외됩니다. `ALLOWED_ORIGINS`는 브라우저에서 실제 사용하는 주소와 정확히 같아야 합니다. 현재 개발 서버가 5174라면 `http://localhost:5174`로 수정하세요. 끝에 `/`는 붙이지 않습니다. 공개 배포를 나중에 승인하면 실제 HTTPS 주소를 쉼표로 추가합니다. `*`는 허용하지 않습니다.

암호화 키는 안전한 비밀 보관소에 백업하세요. 잃어버리면 저장된 Gemini 키를 복호화할 수 없습니다. 데이터 이전 없이 암호화 키만 바꾸면 기존 키를 읽을 수 없으므로 이용자가 다시 등록해야 합니다. 이 파일이나 내용을 채팅·GitHub·스크린샷에 올리지 마세요.

## 5. 서버 함수 배포

아래 단계는 실제 Supabase 프로젝트를 연결하고 서버 코드를 배포합니다. 준비된 시점에 실행하세요. CLI 설치·로그인은 처음에 인터넷이 필요합니다.

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref 본인프로젝트식별자
npx.cmd supabase secrets set --env-file .env.server
npx.cmd supabase functions deploy byok-key
npx.cmd supabase functions deploy recognize-item
```

호스팅된 Edge Functions의 기본 서버 환경변수 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`를 사용합니다. service_role 값을 프런트엔드로 복사하지 마세요. 운영자가 공용 Gemini 키를 등록하는 과정은 없습니다.

`supabase/config.toml`의 `verify_jwt=false`는 함수 입구의 자동 JWT 검사를 끄는 설정입니다. 대신 **두 함수 모두** `auth.getUser(전달된 토큰)`으로 Supabase에 직접 확인하고, 인증에 성공한 사용자 ID만 사용합니다. 이 검사는 키·DB 작업보다 먼저 실행됩니다. 따라서 로그인 없이 사용할 수 있는 함수가 아닙니다. 인증 코드를 제거한 변형을 배포하지 마세요. 비대칭 서명 토큰도 이 방식으로 검증합니다. CORS 허용 주소는 추가 방어이며 인증을 대체하지 않습니다.

## 6. 이용자별 사용

1. 앱의 `로그인·AI 설정`에서 이메일과 비밀번호로 가입합니다.
2. 메일을 확인한 뒤 로그인합니다.
3. 각 이용자가 Google AI Studio에서 본인 프로젝트의 Gemini 키를 발급합니다. 무료 한도·모델 제공 여부·사진 데이터 처리 조건을 먼저 확인하고 결제를 켜지 않습니다.
4. API 키 입력과 암호화 보관 동의 후 저장합니다. 저장 단계에는 Gemini 유효성 확인 요청을 보내지 않습니다.
5. 물품 등록에서 사진을 선택하고 Google 전송 동의 후 실제 분석 버튼을 누릅니다.
6. 후보 이름·태그를 확인하고 수동으로 고친 후 물품을 저장합니다.
7. 키는 설정 화면에서 삭제·교체할 수 있습니다. 기존 키 원문은 다시 표시하지 않습니다.

사용량은 한국 시간 하루 20회 시도, 간격 20초, 동시 1건입니다. 실패도 시도 횟수에 포함되며 자동 재시도는 없습니다. 같은 사진의 성공 캐시는 24시간 동안 추가 호출 없이 재사용합니다. 키 삭제·교체로 일일 사용량을 초기화하지 않습니다. 토큰 표시는 제공자 보고값이며 요금 확정값은 아닙니다.

로그인 세션 토큰은 Supabase SDK의 일반 세션 저장 기능을 사용합니다. Gemini 키 원문을 localStorage에 저장하지 않습니다. 운영자는 서버 암호화 키를 가지고 있으므로 등록된 키를 복호화할 수 있습니다. 이 점을 이용자에게 안내하세요.

## 7. 연결 후 직접 확인할 항목

- 계정 A/B가 서로 다른 키와 사용량을 갖는지 확인
- A 로그아웃 후 B 로그인 시 A의 키 상태·물품 화면이 남지 않는지 확인
- 키 없는 계정의 분석 차단, 잘못된 키 안내, 삭제 후 분석 차단 확인
- 같은 사진 재분석에서 캐시 표시와 추가 Gemini 호출 없음 확인
- 연속 요청 간격·일일 한도·동시 요청 차단 확인
- 로그인 없는 함수 호출과 다른 계정 ID를 넣은 요청 차단 확인
- 운영 브라우저 개발 도구·로그·배포 환경에 Gemini 원문 키가 기록되지 않는지 확인

현재 자동 테스트는 실제 API를 호출하지 않습니다. 프로젝트 연결 후 이메일 가입·실제 Edge Functions·Gemini 응답·배포 환경 부하 검증을 별도로 완료해야 합니다. Cloudflare Pages 공개 배포는 이 문서의 작업에 포함하지 않습니다.

오류가 나면 `연결 필요`는 환경변수와 서버 재시작, `서버 설정 필요`는 Secret과 함수 배포, `로그인 만료`는 재로그인, `한도 초과`는 기다린 뒤 수동 요청을 확인합니다. 오류를 공유할 때 비밀키·Authorization 헤더를 포함하지 마세요.

[Supabase 비밀번호 로그인](https://supabase.com/docs/guides/auth/passwords) · [서버 사용자 검증](https://supabase.com/docs/reference/javascript/auth-getuser) · [서버 Secret](https://supabase.com/docs/guides/functions/secrets)
