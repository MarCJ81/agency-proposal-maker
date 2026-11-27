/* ============================================================
   OneTap i18n · KO/EN runtime translation (v1)
   - ?lang=en|ko  >  localStorage 'onetap_lang'  >  navigator.language
   - DOM text and attributes are translated in place and restored on switch.
   - Elements added later by app.js are translated by a MutationObserver.
   - Missing keys are reported to console as "I18N_MISS: <korean>".
   ============================================================ */
(function (root, doc) {
  'use strict';

  var LANG_KEY = 'onetap_lang';
  var COMMON = /*__COMMON__*/ {"닫기":"Close","취소":"Cancel","저장":"Save","저장됨":"Saved","삭제":"Delete","복사":"Copy","복사됨":"Copied","다운로드":"Download","내려받기":"Download","공유":"Share","인쇄":"Print","초기화":"Reset","다시 시도":"Try again","불러오기":"Load","내보내기":"Export","적용":"Apply","추가":"Add","편집":"Edit","수정":"Edit","보기":"View","미리보기":"Preview","설정":"Settings","도움말":"Help","사용법":"Guide","예시":"Example","샘플":"Sample","무료":"Free","유료":"Paid","개인정보":"Privacy","개인정보 처리방침":"Privacy policy","개인정보 처리 안내":"Privacy notice","이용약관":"Terms","홈":"Home","뒤로":"Back","다음":"Next","이전":"Previous","확인":"OK","검색":"Search","필터":"Filter","전체":"All","없음":"None","준비 중":"Coming soon","준비 중입니다":"Coming soon","로딩 중":"Loading","불러오는 중":"Loading","처리 중":"Working","빈칸":"Blank","필수":"Required","선택":"Optional","이름":"Name","제목":"Title","날짜":"Date","시간":"Time","메모":"Note","상태":"Status","결과":"Result","요약":"Summary","상세":"Details","언어":"Language","한국어":"Korean","영어":"English","복사하기":"Copy","링크 복사":"Copy link","전체 복사":"Copy all","다크 모드로 전환":"Switch to dark mode","라이트 모드로 전환":"Switch to light mode","테마 전환":"Toggle theme","라이트/다크":"Light / dark","다크/라이트":"Dark / light","새 탭에서 보기":"Open in new tab","새 창":"New window","본문으로 건너뛰기":"Skip to content","본문으로 바로가기":"Skip to content","맨 위로":"Back to top","더 보기":"Show more","접기":"Collapse","펼치기":"Expand","자주 묻는 질문":"Frequently asked questions","이 브라우저에만 저장됩니다":"Saved only in this browser","이 브라우저에만 저장됩니다 · 서버 전송 0":"Saved only in this browser · zero uploads","서버 전송 없음":"No upload","서버 업로드 없음":"No server upload","100% 브라우저 처리":"100% in-browser","브라우저에서 처리":"Processed in your browser","파일은 서버로 전송되지 않습니다":"Files never leave your device","파일이 서버로 전송되지 않습니다":"Files never leave your device","붙여넣은 코드는 서버로 전송되지 않습니다":"Pasted code never leaves your device"};
  var APP = /*__DICT__*/ {"견적서 스튜디오 — 대행사 견적서·제안서 1분 생성기":"Proposal Studio — agency quotes and proposals in a minute","대행사·프리랜서용 견적서와 프로젝트 제안서를 1분 안에. 실전 단가 프리셋 5종, 수량·단가·할인·VAT 자동 계산, A4 인쇄·PDF 저장까지 서버 없이 브라우저에서.":"Quotes and project proposals for agencies and freelancers in a minute. Five real-world price presets, automatic quantity, price, discount and VAT maths, A4 print and PDF — all in the browser with no server.","견적서 스튜디오 홈":"Proposal Studio home","주요 화면":"Main views","다크 모드로 전환":"Switch to dark mode","라이트/다크":"Light / dark","같은 모양의 A4 PDF 파일로 저장":"Save as an A4 PDF that matches the preview","견적서 빌더":"Quote builder","편집 또는 미리보기":"Edit or preview","문서 구성":"Document layout","프로젝트 제안 및 견적":"Project proposal and quote","○○스튜디오":"Your Studio","홍길동":"Jane Doe","서울특별시 ○○구 ○○로 00":"00 Example-ro, Example-gu, Seoul","○○ 주식회사":"Example Inc.","김담당":"J. Kim","마케팅팀":"Marketing team","부가세 포함 여부":"VAT included or not","한 문장으로 이 제안이 무엇을 하는지":"One sentence on what this proposal does","고객의 지금 상황에서 시작하는 2~3문장. 문구 진단 탭에서 PAS로 자동 생성할 수 있습니다.":"Two or three sentences starting from the client's situation today. The Copy check tab can draft it with PAS.","검토 후 회신 주시면 일정과 착수일을 확정하겠습니다.":"Reply after your review and we will fix the schedule and start date.","지금 어떤 불편이 있고, 이 작업이 무엇을 바꾸는지 3~5문장으로 적습니다.":"Three to five sentences on the current problem and what this work changes.","킥오프 1회":"One kick-off meeting","원고 8편 작성":"8 posts written","발행 및 색인 점검":"Publishing and index checks","원고 8편":"8 posts","유입 리포트":"Traffic report","촬영·모델 섭외":"Shooting and model casting","유료 광고 운영":"Paid ad management","계약금 30% 입금 후 착수, 잔금 70%는 납품 후 7일 이내":"30% deposit to start, 70% balance within 7 days of delivery","납품 후 30일 무상 하자보수, 이후 월 유지보수 협의":"30 days of free defect fixes after delivery, then monthly maintenance on request","산출물 사용권은 잔금 완료 시 이전됩니다.":"Rights to the deliverables transfer on final payment.","일정·범위 변경 시 재견적합니다.":"A change in schedule or scope is re-quoted.","[요약] … [배경] … 처럼 라벨이 있으면 그대로 나눠 넣습니다. 라벨이 없으면 첫 문단을 요약으로 봅니다.":"Labels like [Summary] … [Background] … are mapped as written. Without labels the first paragraph becomes the summary.","API 키 붙여넣기":"Paste your API key","문서 미리보기":"Document preview","확대 축소":"Zoom","축소":"Zoom out","확대":"Zoom in","제안 문구 진단":"Proposal copy check","진단 대상":"Text to check","요약이나 배경을 붙여넣거나 · 문서에서 가져오기 · 를 누르세요.":"Paste the summary or background, or press “Take from document”.","설득 프레임":"Persuasion frame","문서 디자인":"Document design","서비스 단가표":"Service price list","보관함":"Library","본문으로 바로가기":"Skip to content","견적서 스튜디오":"Proposal Studio","빌더":"Builder","문구 진단":"Copy check","디자인":"Design","저장됨":"Saved","요약 복사":"Copy summary","PDF 파일":"PDF file","인쇄 · PDF":"Print · PDF","서버 0 · 가입 0 · 외부 전송 0":"No server · no sign-up · zero uploads","견적서 · 제안서 빌더":"Quote and proposal builder","패키지를 고르고 숫자만 바꾸면 A4 두 쪽과 PDF가 그 자리에서 완성됩니다. 입력한 내용은 이 브라우저에만 남습니다.":"Pick a package, change the numbers, and two A4 pages and a PDF are ready on the spot. What you type stays in this browser.","편집":"Edit","미리보기":"Preview","2쪽":"2 pages","문서 설정":"Document setup","A4 2쪽":"A4, 2 pages","제안서 + 견적서":"Proposal + quote","견적서만":"Quote only","제안서만":"Proposal only","견적번호":"Quote no.","작성일":"Date","유효기간 (일)":"Valid for (days)","작업 시작일":"Start date","작업 기간 (일)":"Duration (days)","문서 제목":"Document title","서비스 패키지":"Service package","단가표 전체 보기":"See the full price list","패키지를 고르면 항목·범위·일정·조건이 한 번에 채워집니다. 지금 내용은 되돌릴 수 있습니다.":"Choosing a package fills in items, scope, schedule and terms at once. Current content can be undone.","공급자":"Provider","(보내는 사람)":"(the sender)","상호 / 활동명":"Business name","담당자":"Contact name","연락처":"Phone","이메일":"Email","사업자번호":"Business number","주소":"Address","수신자":"Recipient","(고객사)":"(the client)","회사명":"Company","부서 / 직함":"Department / title","견적 항목":"Line items","0개":"0 items","+ 항목 추가":"+ Add item","전체 할인":"Overall discount","할인 없음":"No discount","정률 (%)":"Percentage (%)","정액 (원)":"Fixed amount (KRW)","할인 값":"Discount value","부가세":"VAT","별도":"Excluded","포함":"Included","단가는 원 단위로 입력합니다. 수량 × 단가에서 항목 할인을 뺀 금액이 공급가액이 됩니다.":"Prices are in KRW. Quantity × price minus the line discount gives the subtotal.","제안 내용":"Proposal content","제안서 1쪽":"Proposal, page 1","한 줄 요약":"One-line summary","도입 문구":"Opening","설득 한 문단 · 제안서 상단":"one persuasive paragraph · top of the proposal","맺음말":"Closing","비우면 기본 문장":"left empty, a default line is used","제안 배경":"Background","작업 범위":"Scope of work","한 줄에 하나":"one per line","산출물":"Deliverables","제외 범위":"Out of scope","추진 일정":"Schedule","비중 합계 100%":"shares total 100%","마일스톤 3단계의 비중으로 계약금·중도금·잔금 금액이 자동 배분됩니다.":"The deposit, interim and final payments are split by the three milestone shares.","조건":"Terms","견적서 하단":"foot of the quote","결제 조건":"Payment terms","유지보수":"Maintenance","저작권 · 사용권":"Copyright and usage","비고":"Notes","디자인 탭":"Design tab","핀터레스트 스타일 8종으로 미리보기·PDF가 바로 바뀝니다. 고객사 레퍼런스 색을 뽑아 브랜드로 고정할 수도 있습니다.":"Eight Pinterest-style looks switch the preview and the PDF instantly. You can also pull colours from a client reference and lock them as your brand.","내 구독 AI로 제안서 초안":"Draft the proposal with your own AI","프롬프트 복사":"Copy prompt","금액 포함":"include the amount","ChatGPT·Claude는 입력창에 프롬프트가 채워집니다. 비어 있으면 열린 창에서 Ctrl+V로 붙여넣으세요. (로그인 전이면 로그인 후 붙여넣기)":"ChatGPT and Claude open with the prompt filled in. If the box is empty, paste with Ctrl+V in the new window (after signing in first).","받은 초안 붙여넣기 → 제안서에 적용":"Paste a draft → apply it to the proposal","붙여넣으면 요약·배경·범위·산출물을 나눠서 미리 점수를 계산해요.":"Pasted text is split into summary, background, scope and deliverables and scored before you apply it.","제안서에 적용":"Apply to proposal","비우기":"Clear","키 없이 바로 초안 받기":"Draft without a key","하루 5회":"5 runs a day","무료 AI로 초안 받기":"Draft with the free AI","외부 AI 제공자로 전송됩니다. 고객사 실명·연락처 등 민감한 내용은 넣지 마세요.":"This goes to an external AI provider. Do not include client names, phone numbers or other sensitive details.","무료 Gemini API 키로 여기서 바로 생성 (선택)":"Generate here with a free Gemini key (optional)","키가 없어도 위의 세 버튼으로 충분해요. 키를 넣으면 새 창 없이 이 화면에서 초안을 받습니다. 키는 이 브라우저에만 저장되고 Google 주소로만 전송됩니다.":"The three buttons above are enough without a key. With a key, the draft comes back on this screen instead of a new window. The key is stored in this browser and sent only to Google.","Gemini API 키":"Gemini API key","모델":"Model","Gemini로 초안 생성":"Draft with Gemini","키 저장":"Save key","무료 티어는 프로젝트·모델에 따라 한도가 다를 수 있어요. 오류가 나면 모델명을 바꿔 보세요.":"Free-tier limits vary by project and model. If you get an error, try another model name.","보낼 준비":"Ready to send","플레이스홀더(○○, 010-0000-0000)를 실제 정보로 바꾸면 바로 보낼 수 있습니다.":"Replace the placeholders (○○, 010-0000-0000) with real details and it is ready to send.","공급가액":"Subtotal","0원":"₩0","부가세 10%":"VAT 10%","합계":"Total","PDF 파일로 내려받기":"Download as PDF","인쇄로 저장":"Save via print","PDF는 여백·페이지 나눔이 고정됩니다. 인쇄는 브라우저 설정에 따라 달라질 수 있어요.":"The PDF keeps fixed margins and page breaks; printing depends on your browser settings.","A4 · 2쪽":"A4 · 2 pages","디자인 · 스튜디오 기본":"Design · studio default","준비 0/6":"Ready 0/6","분량 초과":"Over length","맞춤":"Fit","인쇄하면 편집 화면은 빠지고 A4 문서만 나옵니다. 브라우저 인쇄 창에서 ‘PDF로 저장’을 고르세요.":"Printing leaves out the editor and prints only the A4 document. Choose “Save as PDF” in the browser's print dialog.","트리거 · PAS·BAB·AIDA·4U":"Triggers · PAS · BAB · AIDA · 4U","8가지 심리 트리거로 지금 문구를 점검하고, PAS·BAB·AIDA·4U로 다시 씁니다. 문장은 여기서 고치고":"Checks your copy against eight psychological triggers and rewrites it with PAS, BAB, AIDA or 4U. Fix the wording here and","제안서에 넣기":"Put it in the proposal","로 한 번에 반영합니다.":" in one step.","빌더로":"To the builder","다시 진단":"Check again","진단할 문구":"Copy to check","문서에서 가져오기":"Take from document","이 문구를 제안서에 넣기":"Put this copy in the proposal","8대 트리거 진단":"Eight-trigger check","진단 전":"Not checked","문구를 넣으면 제안서 기준으로 다시 점수를 매깁니다.":"Add copy and it is scored against proposal standards.","제안서는 구매 페이지가 아니라 희소성·CTA 점수가 낮게 나오는 것이 정상입니다. 점수보다":"A proposal is not a sales page, so low scarcity and CTA scores are normal. Rather than the score, fill the","빈틈 3개":"three biggest gaps","를 먼저 채우세요.":" first.","감점 표현":"Penalised phrases","아직 진단한 문구가 없습니다.":"Nothing checked yet.","안전 교정 적용":"Apply safe fixes","사실은 새로 만들지 않고 군더더기·공급자 표현만 바꿉니다.":"It invents no facts — only padding and provider-centred wording are changed.","설득 문구 생성":"Generate persuasive copy","대상":"Audience","제안":"Offer","독자의 문제":"Reader's problem","얻는 결과":"Result","근거":"Proof","선택":"optional","요청":"Request","요약에 넣기":"Put in the summary","도입 문구로":"Use as the opening","프리셋 · 맥락 추천 · 브랜드 고정":"Presets · context picks · brand lock","견적서·제안서의 미리보기와 PDF를 핀터레스트 스타일 8종으로 원클릭 전환합니다. 맥락 추천 · 레퍼런스 색 추출 · 브랜드 고정까지.":"Switches the preview and PDF of your quote or proposal between eight Pinterest-style looks in one click, with context picks, reference colour extraction and a brand lock.","맥락으로 추천":"Recommend from context","이 제안서에 맞는 안":"Looks that fit this proposal","[맥락으로 추천]을 누르면 고객사·업종·문구 밀도를 읽어 3~4안을 고릅니다.":"Press “Recommend from context” and it reads the client, industry and copy density to pick three or four looks.","핀터레스트 스타일 8종":"Eight Pinterest-style looks","카드를 누르면 바로 적용됩니다":"Press a card to apply it","레퍼런스 이미지에서 색 뽑기":"Pull colours from a reference image","고객사 · 자사":"Client · own brand","고객사 레퍼런스":"Client reference","자사 레퍼런스":"Own brand reference","로고·상세페이지·브랜드 컷을 넣으면 배경·포인트 색을 뽑아 테마로 만듭니다.":"Add a logo, product page or brand shot and it extracts background and accent colours into a theme.","추출 색을 테마로":"Use the extracted colours as a theme","브랜드로 저장":"Save as the brand","브랜드 스타일":"Brand style","패키지 · 실전 단가":"Packages · real prices","대행·프리랜서 시장에서 실제로 견적이 나가는 5가지 패키지입니다. 하나를 고르면 항목·범위·일정·조건이 견적서에 그대로 들어갑니다.":"Five packages that actually get quoted in the agency and freelance market. Pick one and its items, scope, schedule and terms go straight into the quote.","표시 금액은 기본 구성 기준입니다. 범위가 늘면 금액이 올라가며, 실제 견적은 빌더에서 항목 단가를 고쳐 조정합니다. VAT는 별도 기준입니다.":"Prices assume the base scope. More scope raises the price; adjust it by editing line prices in the builder. VAT is excluded.","저장 · JSON 백업":"Saved · JSON backup","작성 중인 문서는 이 브라우저에 계속 자동 저장됩니다. 완성한 견적은 이름을 붙여 보관하고, 다음 고객에게는 템플릿으로 다시 씁니다.":"The document autosaves in this browser. Save a finished quote under a name and reuse it as a template for the next client.","새 문서":"New document","JSON 불러오기":"Load JSON","JSON 내보내기":"Export JSON","현재 문서 저장":"Save this document","아직 보관한 문서가 없습니다.":"Nothing saved yet.","빌더에서 문서를 만든 뒤":"Build a document in the builder, then press","을 누르면 여기에 쌓입니다.":" and it lands here.","빌더로 가기":"Go to the builder","· 서버 없음 · 회원가입 없음 · 외부 전송 0건 · 모든 내용은 이 브라우저(localStorage)에만 저장됩니다.":"· no server · no sign-up · zero uploads · everything is stored only in this browser (localStorage).","기본값은 모두 플레이스홀더입니다. 금액 계산과 인쇄 결과는 브라우저에서 바로 확인하고, 계약 전 세금·법률 조건은 한 번 더 확인하세요.":"The defaults are placeholders. Check the totals and the print result in the browser, and verify tax and legal terms once more before signing.","개인정보 처리방침":"Privacy policy","자동 저장 시작":"Autosave on","숏폼 수집기 개발":"Short-form collector build","SNS 월간 운영":"Monthly social retainer","블로그 SEO 패키지":"Blog SEO package","상세페이지 · 상품 세팅":"Product pages & listings","AI 자동화 · 대시보드":"AI automation & dashboards","항목명":"Item","금액":"Amount","수량":"Qty","단위":"Unit","식":"lot","건":"items","편":"posts","개":"items","종":"kinds","회":"sessions","컷":"shots","월":"months","일":"days","단가":"Unit price","할인":"Discount","할인액 (원)":"Discount (KRW)","단계":"Stage","기간":"Period","비중%":"Share %","스튜디오 기본":"Studio default","추천 1":"Pick 1","추천 2":"Pick 2","추천 3":"Pick 3","기본":"Default","ChatGPT 열기":"Open ChatGPT","붙여넣기":"paste","Claude 열기":"Open Claude","Gemini 열기":"Open Gemini","제안서 프롬프트는 길어서 세 AI 모두 입력창에 자동으로 들어가지 않습니다. 버튼을 누르면 클립보드에 복사되고 새 창이 열리니, 그 창에서 Ctrl+V로 붙여넣으세요.":"The proposal prompt is too long to prefill in any of the three AIs. Pressing a button copies it and opens a new window — paste there with Ctrl+V.","공급자 정보":"Provider details","상호·담당자·연락처를 실제 정보로":"business name, contact and phone in real values","수신자 정보":"Recipient details","고객사명과 담당자":"client company and contact","견적 항목·금액":"Line items and amount","항목 1개 이상, 금액 0원 초과":"at least one item, total above ₩0","범위 2줄 이상":"scope of two lines or more","일정·비중":"Schedule and shares","마일스톤 3단계, 비중 합계 100%":"three milestones, shares totalling 100%","결제·유지보수 조건":"Payment and maintenance terms","결제 조건과 유지보수 조건":"payment and maintenance terms","비어 있거나 플레이스홀더(○○, 010-0000-0000)인 항목을 실제 정보로 바꾸면 바로 보낼 수 있습니다.":"Replace empty or placeholder values (○○, 010-0000-0000) with real details and it is ready to send.","홍길동 · 010-0000-0000":"Jane Doe · 010-0000-0000","프로젝트 제안서":"Project proposal","숏폼 수집기 · 자동화 툴 커스텀 개발":"Short-form collector · custom automation build","○○ 주식회사 김담당 마케팅팀 님 귀하":"To J. Kim, Marketing team, Example Inc.","인스타 릴스·유튜브 쇼츠의 떡상 영상을 자동으로 모아, 채널 평균 대비 배수로 정렬해 주는 사내용 수집기입니다.":"An in-house collector that gathers viral Instagram Reels and YouTube Shorts and ranks them by their multiple against the channel average.","지금은 숏폼 레퍼런스를 매일 손으로 찾아 캡처하고 있습니다. 플랫폼을 오가며 조회수와 반응을 비교하는 데 하루 한두 시간이 들고, 어떤 영상이 실제로 터진 것인지 판단하는 기준도 사람마다 다릅니다.":"Right now short-form references are found and captured by hand every day. An hour or two goes into comparing views and reactions across platforms, and everyone judges a genuine hit differently.","수집 대상·정렬 기준·화면 구성 확정 (킥오프 1회)":"Lock targets, ranking criteria and screens (one kick-off)","플랫폼 2곳 자동 수집 파이프라인 개발 (검색어·해시태그 단위)":"Build the collection pipeline for two platforms (by keyword and hashtag)","채널 평균 대비 배수·시간당 조회 계산 로직":"Multiple-against-average and views-per-hour logic","카드형 대시보드: 필터·정렬·검색·CSV 내보내기":"Card dashboard: filter, sort, search, CSV export","사내 서버 또는 정적 호스팅 배포, 사용 가이드 1부":"Deploy to an internal server or static hosting, with a usage guide","담당자 대상 온라인 교육 1회 (60분)":"One online training session for the team (60 minutes)","웹 수집기 (소스 포함)":"Web collector (source included)","대시보드 화면":"Dashboard screens","사용 가이드 PDF":"Usage guide PDF","교육 녹화본":"Training recording","· 플랫폼 3곳 이상 확장 · 로그인·권한 관리, 결제 기능 · 월 1만 건 이상 대량 수집용 서버 비용":"· expansion beyond three platforms · sign-in and permission management, payments · server cost for more than 10,000 items a month","비중":"Share","킥오프 · 요구 정의":"Kick-off and requirements","1주차 (3일)":"Week 1 (3 days)","수집 엔진 · 대시보드 개발":"Collector and dashboard build","2~3주차 (9일)":"Weeks 2–3 (9 days)","검수 · 배포 · 교육":"Review, deploy, training","3주차 (3일)":"Week 3 (3 days)","결제":"Payment","계약금 20% 입금 후 착수, 중도금 55%는 중간 시연 후, 잔금 25%는 검수 완료 후 7일 이내.":"20% deposit to start, 55% interim after the demo, 25% within 7 days of acceptance.","배포일로부터 30일간 오류 수정 무상. 이후 월 15만 원 유지보수(선택).":"30 days of free bug fixes from launch, then optional maintenance at ₩150,000 a month.","저작권":"Copyright","납품 소스와 산출물의 사용권은 잔금 완료 시 고객사에 이전됩니다. 포트폴리오 게재는 별도 협의합니다.":"Rights to the delivered source and deliverables pass to the client on final payment. Portfolio use is agreed separately.","수집 대상 플랫폼의 이용약관·기술 변경으로 수집이 제한될 수 있으며, 이 경우 대체 방안을 협의합니다.":"Collection may be limited by changes to the target platforms' terms or technology; an alternative is then agreed together.","위와 같이 제안드립니다. 검토 후 회신 주시면 일정과 착수일을 확정하겠습니다.":"This is our proposal. Reply after your review and we will confirm the schedule and start date.","○○스튜디오 · hello@example.com":"Your Studio · hello@example.com","견 적 서":"QUOTATION","유효기간":"Valid for","14일 (2026.12.11까지)":"14 days (until 2026.12.11)","상호":"Business","대표":"Representative","사업자":"Business no.","서울특별시 ○○구 ○○로 00, 0층":"00 Example-ro, Example-gu, Seoul, Floor 0","회사":"Company","김담당 마케팅팀":"J. Kim, Marketing team","프로젝트":"Project","품목 / 상세":"Item / detail","기획 · 요구사항 정의":"Planning and requirements","수집 대상, 정렬 기준, 화면 구성 확정":"Targets, ranking criteria and screens locked","수집 · 정제 파이프라인 개발":"Collection and cleaning pipeline","플랫폼 2곳, 검색어 · 해시태그 단위 자동 수집":"Two platforms, automatic collection by keyword and hashtag","대시보드 UI 개발":"Dashboard UI","카드형 목록, 필터 · 정렬 · 검색 · CSV 내보내기":"Card list, filter, sort, search, CSV export","배포 · 가이드 · 교육":"Deploy, guide, training","호스팅 배포, 사용 가이드 1부, 온라인 교육 60분":"Hosting setup, a usage guide, 60 minutes of online training","합계 금액":"Total","일금 구십칠만구천원정":"Nine hundred and seventy-nine thousand KRW","(VAT 별도)":"(VAT excluded)","결제 일정":"Payment schedule","킥오프 · 요구 정의 · 20%":"Kick-off and requirements · 20%","수집 엔진 · 대시보드 개발 · 55%":"Collector and dashboard build · 55%","검수 · 배포 · 교육 · 25%":"Review, deploy, training · 25%","위 견적은 작성일로부터 14일간 유효합니다.":"This quotation is valid for 14 days from the date of issue.","(인)":"(seal)","○○스튜디오 · 010-0000-0000 · hello@example.com":"Your Studio · 010-0000-0000 · hello@example.com","셋 다":"All three","문제":"Problem","자극":"Agitate","해결":"Solve","브랜드로 고정":"Lock as brand","사용 중":"In use","적용됨":"Applied","이 디자인 적용":"Apply this design","1순위":"1st pick","2순위":"2nd pick","3순위":"3rd pick","4순위":"4th pick","AI 기본값 위험":"Looks like an AI default","인쇄 주의":"caution in print","제안서":"Proposal","검토 요청":"review request","추천 1순위":"Recommended, 1st","추천 2순위":"Recommended, 2nd","추천 3순위":"Recommended, 3rd","추천 4순위":"Recommended, 4th","개발 · 자동화":"Development & automation","89만~150만 원":"₩890,000–1,500,000","VAT 별도":"VAT excluded","확장: 플랫폼 3곳 + 스케줄러 + 계정 관리까지 확장하면 150만 원.":"Extension: adding a third platform, a scheduler and account management brings it to ₩1,500,000.","SNS 운영":"Social media","SNS(스레드 · 인스타) 월간 운영 대행":"Threads and Instagram, managed monthly","월 60만~90만 원":"₩600,000–900,000 a month","스레드·인스타그램을 한 달 단위로 기획·제작·게시·소통까지 맡아, 끊기지 않는 계정 운영을 만듭니다.":"From planning and production to posting and replies, we run your Threads and Instagram accounts month by month without gaps.","콘텐츠 캘린더 · 월간 기획":"Content calendar and monthly planning","원고 · 카드뉴스 제작":"Posts and card news","게시 · 댓글 소통":"Posting and replies","성과 리포트":"Performance report","확장: 릴스·숏폼 4편 제작을 더하면 월 90만 원.":"Extension: adding four Reels or shorts brings it to ₩900,000 a month.","1개월 (4주)":"1 month (4 weeks)","블로그 · SEO":"Blog & SEO","네이버 블로그 SEO 원고 · 채널 관리 패키지":"Naver blog SEO posts and channel management","월 45만~80만 원":"₩450,000–800,000 a month","키워드 선정부터 SEO 원고 작성·발행, 색인 점검, 유입 리포트까지 한 달에 8편을 꾸준히 쌓는 패키지입니다.":"Eight posts a month, from keyword selection through SEO writing, publishing, index checks and a traffic report.","키워드 조사 · 주제 확정":"Keyword research and topics","SEO 원고 작성 · 발행":"SEO writing and publishing","8편 × 35,000":"8 posts × 35,000","채널 세팅 · 색인 점검":"Channel setup and index checks","확장: 주 3회(12편)로 늘리면 월 80만 원.":"Extension: three posts a week (12 a month) brings it to ₩800,000.","1개월 (원고 8편)":"1 month (8 posts)","커머스":"Commerce","스마트스토어 상세페이지 · 상품 세팅 패키지":"Smart store product page and listing package","상품 1개 55만~120만 원":"₩550,000–1,200,000 per product","상품 분석과 후킹 카피부터 상세페이지 구성, 이미지 편집, 상품 등록·옵션·배송 정책 세팅까지 한 번에 끝냅니다.":"Product analysis, hook copy, page layout, image editing and the listing with options and shipping policy — done in one go.","상품 분석 · 후킹 카피":"Product analysis and hook copy","상세페이지 기획 · 퍼블리싱":"Page planning and build","이미지 보정 · 배너 제작":"Image retouching and banners","상품 등록 · 운영 세팅":"Listing and operations setup","확장: 상품 3개 묶음이면 120만 원.":"Extension: a bundle of three products comes to ₩1,200,000.","2주 (10영업일)":"2 weeks (10 business days)","AI · 데이터":"AI & data","AI 업무 자동화 · 대시보드 구축":"AI workflow automation and dashboards","90만~180만 원":"₩900,000–1,800,000","매주 반복되는 취합·정리·보고 업무를 자동화하고, 대표가 보는 숫자를 한 화면 대시보드로 묶습니다.":"Automates the weekly collecting, tidying and reporting, and puts the numbers the founder watches on one dashboard.","업무 진단 · 자동화 설계":"Workflow review and automation design","자동화 시나리오 구축":"Automation scenarios","대시보드 · 리포트 연결":"Dashboard and report wiring","매뉴얼 · 교육 · 하자보수":"Manual, training, fixes","확장: 사내 툴 연동과 권한 설계까지 포함하면 180만 원.":"Extension: adding internal tool integration and permission design brings it to ₩1,800,000.","4주 (20영업일)":"4 weeks (20 business days)","자동 저장 중인 문서":"Document being autosaved","이름 붙여 저장":"Save with a name","아직 저장한 브랜드 스타일이 없습니다. 지금 디자인을 저장하면 다음 견적서도 같은 톤으로 시작합니다.":"No brand style saved yet. Save the current design and your next quote starts in the same tone.","현재 디자인을 브랜드로 저장":"Save the current design as the brand","A안 Crisp Bento — 순백 · 잉크 · 코발트 한 색의 단정한 문서형.":"Option A, Crisp Bento — pure white, ink and one cobalt, a tidy document look.","studio-doc · 대비 WCAG AA 통과":"studio-doc · contrast passes WCAG AA","테크·IT · 제안서 · 정밀 · 밀도 high":"Tech · proposal · precise · high density","테크·IT 적합도 90%":"Tech fit 90%","목적 적합도 96% (제안서)":"Purpose fit 96% (proposal)","무드 “정밀” 일치":"Mood “precise” matched","테크·IT 적합도 98%":"Tech fit 98%","주의: 포인트 색이 파랑·보라 계열(hue 245°) — AI 기본값처럼 보일 수 있음":"Careful: the accent sits in blue-violet (hue 245°) and can look like an AI default","테크·IT 적합도 95%":"Tech fit 95%","흔한 AI 템플릿과 겹치지 않는 조합":"A combination that avoids the usual AI templates","같은 계열이 겹치지 않도록 3~4안을 골랐습니다. 1순위가 마음에 들지 않으면 2순위의 색만 가져오는 방식도 됩니다.":"Three or four options were picked so the colour families don't repeat. If the first doesn't appeal, take only the colours from the second.","프로젝트 제안":"Project proposal","격자·큰 제목·한 점의 원색. 정보가 곧 디자인이다.":"Grid, big headings, one primary colour. The information is the design.","크기가 다른 카드가 기능의 중요도를 말한다.":"Cards of different sizes say which features matter.","크림 에디토리얼":"Cream editorial","종이의 온도. 세리프 제목과 넉넉한 행간.":"The warmth of paper: serif headings and generous leading.","어두운 화면 위 형광 한 점. 스크롤을 멈추는 대비.":"One fluorescent accent on a dark screen — contrast that stops the scroll.","상품이 주인공. 배경은 비우고 혜택만 남긴다.":"The product is the star: empty background, only the benefits left.","3px 검정 테두리, 6px 하드 섀도. 숨기지 않는 레이아웃.":"3px black borders, 6px hard shadows — a layout that hides nothing.","미니멀 럭셔리 세리프":"Minimal luxury serif","큰 여백, 얇은 세리프, 금속빛 한 줄.":"Wide margins, a thin serif, one metallic line.","9.79만":"₩97,900","비비드 팝 카드":"Vivid pop cards","큰 숫자, 둥근 모서리, 장난스러운 강조.":"Big numbers, rounded corners, playful accents.","스위스 타이포 매거진":"Swiss typographic magazine","벤토 그리드 SaaS":"Bento grid SaaS","다크 네온 임팩트":"Dark neon impact","커머스 클린 화이트":"Commerce clean white","네오 브루탈리즘":"Neo-brutalism","1,614자":"1,614 characters","마케팅 대행사·프리랜서의 프로젝트 제안서를 대신 써 주세요. 아래 정보만 근거로, 고객사에 바로 보낼 한국어 제안서 본문을 씁니다.":"Write a project proposal for a marketing agency or freelancer. Use only the information below and write the body of a Korean proposal the client can receive as-is.","2026. 11. 27. · ○○스튜디오":"27 Nov 2026 · Your Studio","○○ 주식회사 마케팅팀은 이 장면을 아실 겁니다. 지금은 숏폼 레퍼런스를 매일 손으로 찾아 캡처하고 있습니다. 익숙해서 그냥 넘기고 있진 않나요?":"The Example Inc. marketing team will recognise this: short-form references are still found and captured by hand every day. Has it become so familiar that nobody questions it?","문제는 여기서 끝나지 않습니다.":"The problem does not stop there.","— 그대로 두면 매번 같은 자리에서 다시 막힙니다. 그때마다 시간과 돈이 조용히 새어 나갑니다.":" — left as it is, the same wall is hit again and again, and time and money quietly leak each time.","숏폼 수집기 · 자동화 툴 커스텀 개발은":"Short-form collector and custom automation build:","이 패키지로 견적":"Quote this package","1 식":"1 lot","문제-자극-해결":"Problem–Agitate–Solve","이전-이후-다리":"Before–After–Bridge","주의-흥미-욕구-행동":"Attention–Interest–Desire–Action","유용·긴급·독특·구체":"Useful · urgent · unique · specific","지금은 숏폼 레퍼런스를 매일 손으로 찾아 캡처하고 있습니다. 플랫폼을 오가며 조회수와 반응을 비교하는 데 하루 한두 시간이 들고, 어떤 영상이 실제로 터진 것인지 판단하는 기준도 사람마다 다릅니다. 이 과정을 자동 수집과 배수 계산으로 바꿔, 기획 회의 전에 후보 20건이 이미 정리되어 있게 만듭니다.":"Right now short-form references are found and captured by hand every day. An hour or two goes into comparing views and reactions across platforms, and everyone judges a genuine hit differently. Replacing that with automatic collection and multiple calculation means twenty candidates are already ranked before the planning meeting.","예: 기획 · 요구사항 정의":"e.g. Planning and requirements","상세 설명 (선택)":"Description (optional)"};
  var PATTERNS = /*__PATTERNS__*/ [[new RegExp("^(\\d+)개 항목$", ""), "$1 items"],[new RegExp("^준비 (\\d+)/(\\d+)$", ""), "Ready $1/$2"],[new RegExp("^(\\d+) 식 × ([\\d,]+)$", ""), "$1 lot × $2"],[new RegExp("^(\\d+)건 × ([\\d,]+)$", ""), "$1 items × $2"],[new RegExp("^(\\d+)회 × ([\\d,]+)$", ""), "$1 sessions × $2"],[new RegExp("^(\\d+)편 × ([\\d,]+)$", ""), "$1 posts × $2"],[new RegExp("^(\\d+)종 × ([\\d,]+)$", ""), "$1 kinds × $2"],[new RegExp("^(\\d+)주 \\((\\d+영업일)\\)$", ""), "$1 weeks ($2 business days)"],[new RegExp("^(\\d+)개월 \\((\\d+주)\\)$", ""), "$1 month ($2 weeks)"],[new RegExp("^범위 (\\d+)개 · 일정 (\\d+)단계$", ""), "$1 scope items · $2 stages"],[new RegExp("^제안서 (\\d+)$", ""), "Proposal $1"],[new RegExp("^PAS · 설득 점수 (\\d+)$", ""), "PAS · persuasion score $1"],[new RegExp("^PAS · (\\d+)자$", ""), "PAS · $1 characters"],[new RegExp("^(.+), 아직도 그대로인가요\\?$", ""), "$1, still the same?"],[new RegExp("^(\\d{4})\\.(\\d{1,2})\\.(\\d{1,2}) ~ (\\d{4})\\.(\\d{1,2})\\.(\\d{1,2}) \\((\\d+)일\\)$", ""), "$1.$2.$3 – $4.$5.$6 ($7 days)"],[new RegExp("^(\\d+)개$", ""), "$1 items"],[new RegExp("^월 ([\\d만~ ]+원)$", ""), "$1 a month"],[new RegExp("^상품 (\\d+)개 ([\\d만~ ]+원)$", ""), "$1 product · $2"],[new RegExp("^([\\d.]+)만~([\\d.]+)만 원$", ""), "₩$1M–$2M"],[new RegExp("^(\\d+)식 × ([\\d,]+)$", ""), "$1 lot × $2"],[new RegExp("^(.+) · (.+)$", ""), "$1 · $2"],[new RegExp("^프롬프트가 길어\\(주소 ([\\d,]+)자\\) 자동 입력 대신 붙여넣기로 안내해요\\.$", ""), "The prompt is long ($1 characters in the URL), so you paste it instead of it being pre-filled."],[new RegExp("^Gemini는 주소 자동 입력이 안 됩니다\\. 클립보드에 복사했으니 열린 창에 붙여넣으세요\\.$", ""), "Gemini cannot prefill from a URL. It is on your clipboard — paste it into the window that opened."],[new RegExp("^문제는 여기서 끝나지 않습니다\\. (.+) — 그대로 두면 매번 같은 자리에서 다시 막힙니다\\. 그때마다 시간과 돈이 조용히 새어 나갑니다\\.$", ""), "The problem does not stop there. $1 — left as it is, the same wall is hit again and again, and time and money quietly leak each time."],[new RegExp("^항목명 (\\d+)$", ""), "Item $1 name"],[new RegExp("^항목 (\\d+) 삭제$", ""), "Delete item $1"],[new RegExp("^상세 (\\d+)$", ""), "Detail $1"],[new RegExp("^(\\d+)주 \\((\\d+)영업일\\)$", ""), "$1 weeks ($2 business days)"]];

  var DICT = {};
  var k;
  for (k in COMMON) if (Object.prototype.hasOwnProperty.call(COMMON, k)) DICT[k] = COMMON[k];
  for (k in APP) if (Object.prototype.hasOwnProperty.call(APP, k)) DICT[k] = APP[k];

  var HANGUL = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7A3]/;
  var SKIP_TAG = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1, SVG: 1 };
  var ATTRS = ['placeholder', 'aria-label', 'title', 'alt'];
  var state = { lang: 'ko' };
  var records = [];
  var missing = {};
  var missingList = [];
  var observer = null;

  /* ---------- language ---------- */
  function detect() {
    try {
      var q = new URLSearchParams(root.location.search).get('lang');
      if (q === 'ko' || q === 'en') return q;
    } catch (e) { /* very old browser */ }
    try {
      var saved = root.localStorage.getItem(LANG_KEY);
      if (saved === 'ko' || saved === 'en') return saved;
    } catch (e) { /* private mode */ }
    var nav = root.navigator.language || root.navigator.userLanguage || 'ko';
    return /^ko/i.test(nav) ? 'ko' : 'en';
  }

  /* ---------- lookup ---------- */
  function report(text) {
    if (missing[text]) return;
    missing[text] = 1;
    missingList.push(text);
    if (root.console && console.warn) console.warn('I18N_MISS: ' + text);
  }

  /* Pattern with capture translation: captures that still hold Korean are looked up too. */
  function applyPattern(core, p) {
    if (!p[0].test(core)) return null;
    var m = p[0].exec(core);
    var caps = [], i, ok = true;
    for (i = 1; i < m.length; i++) {
      var c = m[i];
      if (c == null) { caps[i] = ''; continue; }
      if (HANGUL.test(c)) {
        var t = lookupSmall(c.trim());
        if (t == null) { ok = false; caps[i] = c; } else { caps[i] = t; }
      } else { caps[i] = c; }
    }
    var out = p[1].replace(/\$(\d+)/g, function (all, n) { return caps[+n] != null ? caps[+n] : all; });
    if (!ok || HANGUL.test(out)) return null;
    return out;
  }

  function tr(raw) {
    if (typeof raw !== 'string' || !HANGUL.test(raw)) return raw;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
    var lead = m[1], core = m[2], tail = m[3];
    if (!core) return raw;
    var hit = DICT[core];
    if (hit == null && /\s{2,}|\n/.test(core)) hit = DICT[core.replace(/\s+/g, ' ').trim()];
    if (hit != null) return lead + hit + tail;

    /* Korean date: 2026년 11월 27일 -> November 27, 2026 */
    var dt = /^(\d{4})\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일$/.exec(core);
    if (dt) {
      var MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      var mm = parseInt(dt[2], 10);
      if (mm >= 1 && mm <= 12) return lead + MO[mm - 1] + ' ' + parseInt(dt[3], 10) + ', ' + dt[1] + tail;
    }

    /* money in Korean format: 81만 원 / 2,980,750원  ->  {0} template */
    var money = takeMoney(core);
    if (money.map.length) {
      var tpl = money.text;
      var th = DICT[tpl];
      if (th == null && /\s{2,}|\n/.test(tpl)) th = DICT[tpl.replace(/\s+/g, ' ').trim()];
      if (th == null && /^\{0\}$/.test(tpl.trim())) th = '{0}';
      if (th != null) return lead + putMoney(th, money.map) + tail;
      for (var mi = 0; mi < PATTERNS.length; mi++) {
        var mo = applyPattern(tpl, PATTERNS[mi]);
        if (mo != null) return lead + putMoney(mo, money.map) + tail;
      }
    }
    for (var i = 0; i < PATTERNS.length; i++) {
      var pout = applyPattern(core, PATTERNS[i]);
      if (pout != null) return lead + pout + tail;
    }
    var seg = trSegments(core);
    if (seg != null) return lead + seg + tail;
    report(core);
    return raw;
  }


  /* Korean money -> token template; values are formatted as ₩1,234,567 */
  function won(n) { return '₩' + n.toLocaleString('en-US'); }
  function takeMoney(core) {
    var map = [];
    var out = core.replace(/([\d,]+)\s*만(?:\s*([\d,]+))?\s*원/g, function (all, a, b) {
      var n = parseInt(a.replace(/,/g, ''), 10) * 10000 + (b ? parseInt(b.replace(/,/g, ''), 10) : 0);
      map.push(won(n));
      return '{' + (map.length - 1) + '}';
    });
    out = out.replace(/([+\-]?[\d,]+)\s*원/g, function (all, a) {
      map.push('₩' + a);
      return '{' + (map.length - 1) + '}';
    });
    return { text: out, map: map };
  }
  function putMoney(s, map) {
    return s.replace(/\{(\d+)\}/g, function (all, i) { return map[+i] != null ? map[+i] : all; });
  }

  /* A small unit: dictionary hit or pattern hit, no whitespace trimming. */
  function lookupSmall(unit) {
    var hit = DICT[unit];
    if (hit != null) return hit;
    for (var i = 0; i < PATTERNS.length; i++) {
      var pout = applyPattern(unit, PATTERNS[i]);
      if (pout != null) return pout;
    }
    return null;
  }

  function trPipe(line) {
    var parts = line.split(/\s*\|\s*/);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      var t = lookupSmall(parts[i].trim());
      if (t == null) return null;
      out.push(t);
    }
    return out.join(' | ');
  }

  function trSegments(core) {
    if (core.indexOf('\n') > -1) {
      var lines = core.split('\n');
      var out = [];
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.trim()) { out.push(line); continue; }
        var t = line.indexOf('|') > -1 ? trPipe(line) : lookupSmall(line.trim());
        if (t == null) { if (root.__I18N_DEBUG) (root.__I18N_SEGFAIL = root.__I18N_SEGFAIL || []).push(line); return null; }
        out.push(t);
      }
      return out.join('\n');
    }
    if (core.indexOf('|') > -1) return trPipe(core);
    return null;
  }

  /* ---------- DOM walking ---------- */
  function skipped(el) {
    while (el) {
      if (el.nodeType === 1) {
        if (SKIP_TAG[el.tagName]) return true;
        if (el.getAttribute && (el.hasAttribute('data-i18n-skip') || el.getAttribute('contenteditable') === 'true')) return true;
        if (el.classList && el.classList.contains('onetap-lang')) return true;
      }
      el = el.parentNode;
    }
    return false;
  }

  function trText(node) {
    var v = node.nodeValue;
    if (!v || !HANGUL.test(v)) return;
    var out = tr(v);
    if (out !== v) {
      records.push({ n: node, v: v });
      node.nodeValue = out;
    }
  }

  function trAttrs(el) {
    var i, at, v, out;
    for (i = 0; i < ATTRS.length; i++) {
      at = ATTRS[i];
      if (!el.hasAttribute(at)) continue;
      v = el.getAttribute(at);
      if (!v || !HANGUL.test(v)) continue;
      out = tr(v);
      if (out !== v) {
        records.push({ e: el, a: at, v: v });
        el.setAttribute(at, out);
      }
    }
    if (el.tagName === 'INPUT' && el.hasAttribute('value') && el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'hidden') {
      v = el.getAttribute('value');
      if (v && HANGUL.test(v)) {
        out = tr(v);
        if (out !== v) {
          records.push({ e: el, a: 'value', v: v });
          el.setAttribute('value', out);
          if (el.value === v) el.value = out;
        }
      }
    }
    if (el.tagName === 'INPUT') {
      var ty = (el.type || '').toLowerCase();
      if (ty === 'button' || ty === 'submit' || ty === 'reset') {
        v = el.value;
        if (v && HANGUL.test(v)) {
          out = tr(v);
          if (out !== v) { records.push({ e: el, a: 'value', v: v }); el.value = out; }
        }
      }
    }
  }

  function walk(node) {
    if (node.nodeType === 3) { trText(node); return; }
    if (node.nodeType === 11) {
      for (var f = node.firstChild; f; f = f.nextSibling) walk(f);
      return;
    }
    if (node.nodeType !== 1) return;
    if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE' && node.tagName !== 'SVG' &&
        !(node.classList && node.classList.contains('onetap-lang'))) trAttrs(node);
    if (skipped(node)) return;
    if (node.tagName === 'META') return;
    for (var c = node.firstChild; c; c = c.nextSibling) walk(c);
  }

  function trMeta() {
    var list = doc.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i], v = el.getAttribute('content');
      if (v && HANGUL.test(v)) {
        var out = tr(v);
        if (out !== v) { records.push({ e: el, a: 'content', v: v }); el.setAttribute('content', out); }
      }
    }
  }

  function trJsonLd() {
    var list = doc.querySelectorAll('script[type="application/ld+json"]');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      try {
        var data = JSON.parse(el.textContent);
        var changed = fixJson(data);
        if (changed) el.textContent = JSON.stringify(data);
      } catch (e) { /* leave as is */ }
    }
  }

  function fixJson(o) {
    var changed = false, i;
    if (Array.isArray(o)) {
      for (i = 0; i < o.length; i++) if (fixJson(o[i])) changed = true;
      return changed;
    }
    if (!o || typeof o !== 'object') return false;
    for (var key in o) {
      if (!Object.prototype.hasOwnProperty.call(o, key)) continue;
      var v = o[key];
      if (typeof v === 'string' && HANGUL.test(v)) {
        var out = DICT[v.trim()];
        if (out != null) { o[key] = out; changed = true; }
      } else if (v && typeof v === 'object') {
        if (fixJson(v)) changed = true;
      }
    }
    return changed;
  }

  /* ---------- apply / restore ---------- */
  function trFieldValues() {
    var list = doc.querySelectorAll('input, textarea');
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var ty = (el.type || 'text').toLowerCase();
      if (ty === 'checkbox' || ty === 'radio' || ty === 'hidden' || ty === 'file' || ty === 'date' || ty === 'number') continue;
      if (el === doc.activeElement) continue;
      var v = el.value;
      if (!v || !HANGUL.test(v)) continue;
      var out = tr(v);
      if (out !== v) { records.push({ e: el, a: 'prop:value', v: v }); el.value = out; }
    }
  }

  function applyEn() {
    var title = root.__onetapTitle || (root.__onetapTitle = doc.title);
    walk(doc.body);
    var tpls = doc.querySelectorAll('template');
    for (var ti = 0; ti < tpls.length; ti++) if (tpls[ti].content) walk(tpls[ti].content);
    trFieldValues();
    trMeta();
    trJsonLd();
    doc.documentElement.lang = 'en';
    var t = DICT[title] || DICT[title.trim()];
    doc.title = t || title;
  }

  function restoreKo() {
    for (var i = records.length - 1; i >= 0; i--) {
      var r = records[i];
      if (r.n) { if (r.n.nodeValue !== r.v) r.n.nodeValue = r.v; }
      else if (r.e) {
        if (r.a === 'value' || r.a === 'prop:value') { if (r.e.value !== r.v) r.e.value = r.v; }
        else if (r.e.getAttribute(r.a) !== r.v) r.e.setAttribute(r.a, r.v);
      }
    }
    var title = root.__onetapTitle;
    if (title) doc.title = title;
    doc.documentElement.lang = 'ko';
  }

  /* ---------- language switch UI ---------- */
  function buildSwitch() {
    var wrap = doc.createElement('div');
    wrap.className = 'onetap-lang';
    wrap.setAttribute('role', 'group');
    wrap.innerHTML = '<button type="button" data-onetap-lang="ko" aria-pressed="true">KO</button>' +
      '<button type="button" data-onetap-lang="en" aria-pressed="false">EN</button>';
    var box = doc.querySelector('.top-actions') || doc.querySelector('.topbar__inner') ||
      doc.querySelector('.topbar-inner') || doc.querySelector('.topbar-in') ||
      doc.querySelector('.topbar') || doc.querySelector('header');
    if (box) {
      if (box.classList.contains('top-actions')) box.insertBefore(wrap, box.firstChild);
      else {
        var act = box.querySelector('.top-actions');
        if (act) box.insertBefore(wrap, act); else box.appendChild(wrap);
      }
    } else {
      wrap.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;background:rgba(255,255,255,.9);color:#111';
      doc.body.appendChild(wrap);
    }
    wrap.addEventListener('click', function (ev) {
      var b = ev.target.closest('[data-onetap-lang]');
      if (!b) return;
      setLang(b.getAttribute('data-onetap-lang'));
    });
    return wrap;
  }

  var CSS = '.onetap-lang{display:inline-flex;flex:none;align-items:center;padding:2px;border:1px solid currentColor;border-radius:999px;opacity:.72;transition:opacity .15s;vertical-align:middle;align-self:center}' +
    '.onetap-lang:hover,.onetap-lang:focus-within{opacity:1}' +
    '.onetap-lang button{appearance:none;-webkit-appearance:none;border:0;background:transparent;color:inherit;font:inherit;font-size:10.5px;font-weight:700;letter-spacing:.04em;line-height:1;padding:5px 6px;border-radius:999px;cursor:pointer;min-width:26px;text-align:center}' +
    '.onetap-lang button[aria-pressed="true"]{background:rgba(128,128,128,.3)}' +
    '@media (max-width:520px){.onetap-lang button{padding:4px 4px;font-size:10px;min-width:22px}.onetap-lang{margin-left:2px}}';

  function injectCss() {
    var s = doc.createElement('style');
    s.id = 'onetap-lang-css';
    s.textContent = CSS;
    (doc.head || doc.documentElement).appendChild(s);
  }

  function paintSwitch() {
    var bs = doc.querySelectorAll('[data-onetap-lang]');
    for (var i = 0; i < bs.length; i++) {
      bs[i].setAttribute('aria-pressed', bs[i].getAttribute('data-onetap-lang') === state.lang ? 'true' : 'false');
    }
    var wrap = doc.querySelector('.onetap-lang');
    if (wrap) wrap.setAttribute('aria-label', state.lang === 'ko' ? '언어' : 'Language');
  }

  /* ---------- observe ---------- */
  function startObserver() {
    if (observer || !root.MutationObserver) return;
    observer = new MutationObserver(function (muts) {
      if (state.lang !== 'en') return;
      for (var i = 0; i < muts.length; i++) {
        var m = muts[i];
        if (m.type === 'characterData') { trText(m.target); continue; }
        if (m.type === 'attributes') { if (m.target.nodeType === 1 && !skipped(m.target)) trAttrs(m.target); continue; }
        for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    });
    observer.observe(doc.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title', 'alt'] });
  }

  function setLang(lang) {
    state.lang = lang === 'en' ? 'en' : 'ko';
    try { root.localStorage.setItem(LANG_KEY, state.lang); } catch (e) { /* private mode */ }
    if (state.lang === 'en') {
      applyEn();
      startObserver();
    } else {
      if (observer) { observer.disconnect(); observer = null; }
      restoreKo();
    }
    paintSwitch();
    try { doc.dispatchEvent(new CustomEvent('onetap:lang', { detail: { lang: state.lang } })); } catch (e) { /* old */ }
  }

  function boot() {
    injectCss();
    buildSwitch();
    state.lang = detect();
    if (state.lang === 'en') {
      applyEn();
      startObserver();
    } else {
      doc.documentElement.lang = 'ko';
    }
    paintSwitch();
    root.ONETAP_I18N = {
      lang: function () { return state.lang; },
      setLang: setLang,
      t: tr,
      missing: function () { return missingList.slice(); },
      dict: DICT
    };
  }

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window, document);
