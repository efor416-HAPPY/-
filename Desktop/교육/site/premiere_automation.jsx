// premiere_automation.jsx
// Adobe Premiere Pro ExtendScript Automation Script
// 이 스크립트는 프리미어 프로에서 미디어를 가져오고 타임라인 시퀀스를 자동으로 빌드하는 것을 수행합니다.

(function() {
    // 1. 프리미어 프로에 프로젝트가 열려 있는지 확인
    if (!app.project) {
        alert("오류: 실행 중인 Premiere Pro 프로젝트가 없습니다.\n먼저 새 프로젝트를 만들거나 기존 프로젝트를 열어주세요.");
        return;
    }
    
    // QE(Quality Engineering) DOM 모듈 활성화 (타임라인 미세 조정용 API)
    app.enableQE();
    
    // 2. 프로젝트로 가져올 미디어 파일 지정 (이전에 다운로드한 위성사진 이미지 활용)
    var mediaPath = "C:/Users/Owner/Desktop/교육/site/yanggu_haean_hybrid_z15.png";
    var mediaFile = new File(mediaPath);
    
    if (!mediaFile.exists) {
        alert("오류: 가져올 미디어 파일이 지정한 경로에 존재하지 않습니다:\n" + mediaPath);
        return;
    }
    
    // 3. 파일 가져오기 (Import) 실행
    var filePaths = [mediaFile.fsName];
    var suppressUI = true;                  // 사용자 팝업 창 안 띄우기
    var targetBin = app.project.rootItem;    // 프로젝트 최상위 폴더(루트 빈) 지정
    var importAsNumberedStills = false;
    
    var success = app.project.importFiles(filePaths, suppressUI, targetBin, importAsNumberedStills);
    
    if (success) {
        // 4. 방금 가져온 미디어의 프로젝트 아이템 검색
        var root = app.project.rootItem;
        var targetClip = null;
        
        for (var i = 0; i < root.children.numItems; i++) {
            var item = root.children[i];
            if (item.name === mediaFile.name) {
                targetClip = item;
                break;
            }
        }
        
        if (targetClip) {
            // 5. 가져온 클립을 바탕으로 새 시퀀스(Sequence) 생성
            // 이 방식을 사용하면 이미지 규격에 맞는 타임라인이 자동으로 구성됩니다.
            var sequenceName = "양구_위성사진_편집본";
            var newSeq = app.project.createNewSequenceFromClips(sequenceName, [targetClip], root);
            
            if (newSeq) {
                alert("성공: 미디어가 프로젝트에 추가되고 새 시퀀스가 생성되었습니다!\n- 시퀀스명: " + sequenceName + "\n- 삽입된 클립: " + targetClip.name);
            } else {
                alert("경고: 미디어를 가져왔으나 새 시퀀스를 생성하지 못했습니다.");
            }
        } else {
            alert("오류: 미디어 파일은 로드되었으나 프로젝트 내에서 아이템을 찾을 수 없습니다.");
        }
    } else {
        alert("오류: 미디어를 가져오지 못했습니다.");
    }
})();
