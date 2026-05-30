# -*- coding: utf-8 -*-
import os
import sys

def run_inventor_automation():
    print("==================================================")
    print("  Autodesk Inventor API 파이썬 자동화 데모")
    print("==================================================")
    
    # pywin32 라이브러리 검증
    try:
        import win32com.client
    except ImportError:
        print("[오류] pywin32 라이브러리가 필요합니다. 'pip install pywin32'를 실행하세요.")
        return
        
    print("[진행] Autodesk Inventor 프로그램 연결을 시도하는 중...")
    
    inventor_app = None
    
    # 1. 활성화된 Inventor 어플리케이션 연결 시도
    try:
        inventor_app = win32com.client.GetActiveObject("Inventor.Application")
        print("  - 실행 중인 Inventor 인스턴스에 성공적으로 연결했습니다.")
    except Exception:
        # 실행 중이 아니면 새로 실행 시도
        try:
            print("  - 실행 중인 인벤터가 없어 새로 실행을 시도합니다. (시간이 걸릴 수 있습니다...)")
            inventor_app = win32com.client.Dispatch("Inventor.Application")
            inventor_app.Visible = True
            print("  - Inventor가 새로 시작되었으며 화면에 표시됩니다.")
        except Exception as e:
            print("\n[실패] Autodesk Inventor 라이브러리를 연결하거나 프로그램을 실행할 수 없습니다.")
            print("이유: 인벤터가 컴퓨터에 설치되어 있지 않거나, COM 등록이 되어 있지 않습니다.")
            print(f"상세 에러: {e}")
            return

    try:
        # 인벤터 내부 버전을 출력하여 정상 통신 확인
        print(f"[정보] Inventor 소프트웨어 버전: {inventor_app.SoftwareVersion.String}")
        
        # 2. 새 부품 문서 (.ipt) 생성
        # kPartDocumentObject = 12290
        print("[진행] 새 부품 문서(.ipt)를 작성하는 중...")
        documents = inventor_app.Documents
        template_path = inventor_app.FileManager.GetTemplateFile(12290)
        part_doc = documents.Add(12290, template_path)
        
        # 3. 컴포넌트 정의 및 매개변수 설정
        comp_def = part_doc.ComponentDefinition
        parameters = comp_def.Parameters
        user_parameters = parameters.UserParameters
        
        print("[진행] 설계 변수(Parameters) 등록 중...")
        # 가로(Width), 세로(Height), 두께(Thickness) 사용자 변수 등록 (기본 mm 단위)
        width_param = user_parameters.AddByExpression("Width", "100 mm", "mm")
        height_param = user_parameters.AddByExpression("Height", "50 mm", "mm")
        thickness_param = user_parameters.AddByExpression("Thickness", "15 mm", "mm")
        
        # 4. 스케치 평면 가져오기 (XY Plane은 기본 3번째 작업 평면)
        # 1: YZ Plane, 2: XZ Plane, 3: XY Plane
        xy_plane = comp_def.WorkPlanes.Item(3)
        sketches = comp_def.Sketches
        sketch = sketches.Add(xy_plane)
        
        print("[진행] XY 평면에 스케치 생성 및 사각형 드로잉 중...")
        # 5. 사각형 그리기 (TransientGeometry 도우미 사용)
        tg = inventor_app.TransientGeometry
        
        # 인벤터 내부 데이터 표준 단위는 cm이므로, 생성한 파라미터 값(Value)을 가져옴 (자동 cm 변환됨)
        w_val = width_param.Value
        h_val = height_param.Value
        
        p1 = tg.CreatePoint2d(0, 0)
        p2 = tg.CreatePoint2d(w_val, h_val)
        
        sketch_lines = sketch.SketchLines
        # 두 점을 지나는 사각형 작성
        sketch_lines.AddAsTwoPointRectangle(p1, p2)
        
        # 6. 스케치로부터 입체 영역(Profile) 추출
        profile = sketch.Profiles.AddForSolid()
        
        print("[진행] 3D 돌출(Extrusion) 작업 실행 중...")
        # 7. 돌출 피처 생성
        extrude_features = comp_def.Features.ExtrudeFeatures
        
        # 돌출 파라미터 정의 작성
        # kJoinOperation = 20481 (합치기 연산)
        extrude_def = extrude_features.CreateExtrudeDefinition(profile, 20481)
        
        # 돌출 두께 및 방향 설정
        # kPositiveExtentDirection = 20354 (양의 방향 돌출)
        extrude_def.SetDistanceExtent(thickness_param.Expression, 20354)
        
        # 피처 추가
        extrude_feature = extrude_features.Add(extrude_def)
        
        # 8. 부품 저장
        filename = "Inventor_AutoBlock.ipt"
        filepath = os.path.abspath(filename)
        
        print(f"[진행] 모델 저장 중: {filename}")
        part_doc.SaveAs(filepath, False)
        
        print("\n==================================================")
        print("  [성공] 인벤터 자동화 3D 모델 생성이 완료되었습니다!")
        print(f"  파일 저장 경로: {filepath}")
        print("==================================================")
        
    except Exception as e:
        print(f"\n[오류] 인벤터 API 제어 중 에러가 발생했습니다: {e}")

if __name__ == "__main__":
    run_inventor_automation()
