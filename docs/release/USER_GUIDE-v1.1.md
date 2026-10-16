# v1.1 사용법

> v1.1.1 Live UI update: Tune / Build and bottom Inspect are visible together. More is in the top navigation. Device evaluation is automatic; Next validates the current design. Lab verification and Export remain explicit. The earlier v1.1.0 Test-button instructions and QA totals below describe the historical UI. Current evidence: `docs/DEVELOPMENT_V111.md` and `artifacts/v111-live/manifest.json`.


1. Platform에서 Si / SiN, O-band / C-band를 고릅니다. 기존 사용자는 원래 설계가 자동 복원됩니다.
2. 첫 안내에서 Track을 선택합니다. 이후 Header의 Track/Level selector로 이동합니다. Level 번호는 Track마다 1–6입니다.
3. Device는 Tune의 Slider / ± / 숫자로 조절합니다. Canvas Drag / Pinch / Pan은 보기만 바꿉니다. Fit으로 원래 보기를 복원합니다.
4. Inspect에서 Goal, Guided Steps, Before/After, 실제 Spectrum, Fab Run, Same-wafer Comparison과 모델 근거를 확인합니다. More에는 Reference, Snapshot, Legacy Copy, AI Rival, DB, 카드, 모델 범위가 있습니다.
5. Test로 현재 조건을 검사한 뒤 PASS / CURRENT이면 Next로 갑니다. 과거 Stars와 현재 설계의 유효성은 별개입니다. Reference는 항상 정답 보장이 아니며, Apply 후에도 실제 검사가 필요합니다.
6. Lab의 Build / Inspect / Verify / More를 사용합니다. Build에는 기존 여섯 Mission과 실제 Parameter가 있습니다. FAIL 행의 위치 보기는 검사로 얻은 Component/Net/좌표만 표시합니다.
7. Circuit Export는 smq-circuit/1 JSON 세 개를 만듭니다. Python GDS 도구를 실행한 engine_verification.json은 More의 Paste에 붙여넣어 Schema / Platform / Design Hash를 검사합니다. Geometry Rechecked와 Foundry Readiness는 별개입니다.
8. Save → 백업 JSON 복사 또는 Text Backup / Restore를 사용합니다. 붙여넣은 백업은 Schema / Checksum 검사와 복원 전 데이터 보관을 거칩니다. 브라우저의 file URL / 프로필이 바뀌면 저장 영역이 달라질 수 있으므로 Text Backup을 보관하세요.

Track 변경은 다른 Track을 덮어쓰지 않습니다. Start New는 Revision에 보관하고 Level 1부터 시작합니다. Legacy 설계는 명시적 Copy로만 가져옵니다. Reference Original은 반복 Apply로 덮어쓰지 않습니다. 공유 Stars / Cards의 전체 초기화는 Legacy 모드에서 수행합니다.

Light 기본, Dark 선택은 저장됩니다. 외부 Font / CDN / Runtime 연결은 필요하지 않습니다.
