# AdSense 연결

사용자가 제공한 공개 게시자 ID `ca-pub-2685311477810917`를 사용합니다. API 비밀키가 아니며 공개 HTML과 ads.txt에 표시하는 값입니다.

## 반영 위치

- 한국어·영어 공개 페이지 10개의 `<head>`에 async AdSense 코드와 `google-adsense-account` 메타 태그를 각각 한 번 넣습니다.
- `/app/`에는 확인용 메타 태그만 넣으며 개인 물품·사진·로그인 화면에 광고 스크립트를 넣지 않습니다.
- 404 페이지에도 광고 스크립트를 넣지 않습니다.
- `public/ads.txt`는 Vite 빌드 시 루트 `/ads.txt`로 복사됩니다. 내용은 다음과 같습니다.

```text
google.com, pub-2685311477810917, DIRECT, f08c47fec0942fa0
```

별도 광고 단위 ID를 만들거나 임의의 광고 슬롯을 추가하지 않았습니다. 자동 광고가 활성화되어 있다면 Google의 계정 설정에 따라 공개 페이지에 표시될 수 있습니다. 코드를 넣는 것만으로 사이트 승인이나 실제 광고 표시가 완료되지는 않습니다.

## 운영자가 확인할 항목

1. https://where-my-things.pages.dev/ads.txt 에서 위 한 줄이 표시되는지 확인합니다.
2. AdSense → 사이트 → `where-my-things.pages.dev`에서 소유권 확인과 필요한 검토 요청을 진행합니다. 기존에 승인된 사이트인지 여기서는 확인하지 않았습니다.
3. 광고 표시 범위·위치는 AdSense 자동 광고 미리보기에서 확인합니다. 자신의 광고를 클릭하거나 반복 노출로 시험하지 마세요.
4. EEA·영국·스위스 이용자에게 광고를 제공하기 전 AdSense 개인정보 보호 및 메시지에서 Google 인증 CMP 메시지와 지역별 동의 처리를 설정합니다. 이 저장소에 CMP나 동의 배너가 이미 구현된 것으로 간주하면 안 됩니다.
5. 공개 개인정보 안내에는 광고 쿠키·외부 서비스 처리와 Google 광고 선택 링크를 반영했습니다. 운영 방식이 바뀌면 함께 수정하세요.

Google 반영에는 시간이 걸릴 수 있습니다. ads.txt가 HTTP 200이어도 계정의 검토·상태 반영은 별개입니다.

공식 안내: [AdSense 코드](https://support.google.com/adsense/answer/9274634?hl=ko), [ads.txt](https://support.google.com/adsense/answer/12171612?hl=ko), [사이트 연결](https://support.google.com/adsense/answer/12169212?hl=ko), [유럽 규정 메시지](https://support.google.com/adsense/answer/10961068?hl=ko).
