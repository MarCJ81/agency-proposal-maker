# engines/ — 이 앱에 그대로 들어 있는 독립 모듈 3개

`apps/agency-proposal-maker/`를 폴더째 복사하면 이 파일들도 함께 가서 바로 동작합니다.
빌드·번들러·npm 설치가 필요 없는 의존성 0의 UMD 모듈이라, 정적 서버에서 `<script>` 세 줄만 넣으면 됩니다.
(브라우저는 `window.CopyPsych` · `window.DesignRef` · `window.AiBridge`, node는 `require()`)

| 파일 | 역할 | 크기 |
| --- | --- | --- |
| `copy-psych-engine.js` | 8대 심리 트리거 진단, PAS·BAB·AIDA·4U 생성, 추상어·공급자어 탐지·교정 | ~54KB |
| `design-ref-engine.js` | 프리셋 8종(4축 DNA), 맥락 추천, 팔레트 추출, CSS/HTML/Canvas, v2 블루프린트·브랜드 키트 | ~242KB |
| `ai-bridge.js` | ChatGPT·Claude·Gemini 링크, AI 답변 → 제안서 필드 분리, Gemini API 요청/응답 | ~20KB |

```html
<script src="engines/copy-psych-engine.js"></script>
<script src="engines/design-ref-engine.js"></script>
<script src="engines/ai-bridge.js"></script>
<script src="core.js"></script>
<script src="design.js"></script>
<script src="data.js"></script>
<script src="app.js"></script>
```

## 사본 관리

- `copy-psych-engine.js`는 `packages/copy-psych-engine.js`와 **바이트 단위로 같은 사본**입니다. 단위 테스트가 검사합니다.
- `design-ref-engine.js`는 **v2.0.0 스냅샷**입니다. 공용 엔진이 계속 갱신되므로 바이트 동일 대신
  `VERSION` · 프리셋 8종 id · v1 API(`recommendDesignRefs`·`paletteFromImageData`·`buildCustomTheme`·`dnaOf`)가
  `packages/`와 호환되는지를 테스트가 확인합니다. 공용 엔진을 올릴 때는 이 파일도 함께 복사하고 `test.js`를 다시 돌리세요.
- `ai-bridge.js`는 이 앱 전용입니다(제안서 필드 파서). 다른 앱의 `engines/ai-bridge.js`와는 파서가 다릅니다.

## 이 앱에서 쓰는 지점

| 엔진 | 앱에서 쓰는 곳 |
| --- | --- |
| CopyPsych | `문구 진단` 탭 — `diagnose` · `detect` · `correct` · `build(PAS/BAB/AIDA/4U)`, `core.js`의 `proposalPsych` 가중치 |
| DesignRef | `디자인` 탭 — `recommendDesignRefs` · `themeFor`(design.js) · `paperTheme`(design.js) · `paletteFromImageData` · `buildCustomTheme` |
| AiBridge | 빌더의 AI 패널 — `linkFor` · `parseProposal` · `buildGeminiRequest` · `parseGeminiResponse` |

## 키·개인정보

이 폴더의 파일에는 **API 키도, 개인정보도 들어 있지 않습니다**(단위 테스트가 검사합니다).
Gemini 키는 사용자가 화면에서 넣는 값이며 `localStorage`에만 남고 저장소에 커밋되지 않습니다.
