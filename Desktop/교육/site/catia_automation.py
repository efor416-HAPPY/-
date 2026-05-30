# -*- coding: utf-8 -*-
import os
import sys

def run_catia_automation():
    print("==================================================")
    print("    Dassault CATIA V5 API 파이썬 자동화 데모")
    print("==================================================")
    
    # pywin32 라이브러리 검증
    try:
        import win32com.client
    except ImportError:
        print("[오류] pywin32 라이브러리가 필요합니다. 'pip install pywin32'를 실행하세요.")
        return

    print("[진행] Dassault CATIA 프로그램 연결을 시도하는 중...")
    
    catia_app = None
    
    # 1. 활성화된 CATIA 어플리케이션 연결 시도
    try:
        # CATIA.Application COM 객체 연결
        catia_app = win32com.client.GetActiveObject("CATIA.Application")
        print("  - 실행 중인 CATIA 인스턴스에 성공적으로 연결했습니다.")
    except Exception:
        # 실행 중이 아니면 새로 시작 시도
        try:
            print("  - 실행 중인 카티아가 없어 새로 실행을 시도합니다. (시간이 걸릴 수 있습니다...)")
            catia_app = win32com.client.Dispatch("CATIA.Application")
            catia_app.Visible = True
            print("  - CATIA 프로그램이 정상 시작되었습니다.")
        except Exception as e:
            print("\n[실패] CATIA 라이브러리를 연결하거나 프로그램을 실행할 수 없습니다.")
            print("이유: CATIA V5가 설치되어 있지 않거나, COM 자동화 서버 등록이 되어 있지 않습니다.")
            print(f"상세 에러: {e}")
            return

    try:
        # 2. 새 Part 문서 (.CATPart) 생성
        print("[진행] 새 Part 문서(.CATPart) 생성 중...")
        documents = catia_app.Documents
        part_doc = documents.Add("Part")
        
        # 3. 파트 및 파트 바디 객체 가져오기
        part = part_doc.Part
        bodies = part.Bodies
        part_body = bodies.Item("PartBody")
        
        # 4. 스케치 생성용 XY 평면 가져오기
        origin_elements = part.OriginElements
        xy_plane = origin_elements.Item(3)  # 1: YZ, 2: XZ, 3: XY Plane
        
        sketches = part_body.Sketches
        sketch = sketches.Add(xy_plane)
        
        print("[진행] 스케치 편집(2D 스케쳐) 모드 열기 및 사각형 작도 중...")
        # 5. 스케치 편집 에디션 열기 (2D 형상 팩토리 사용)
        factory_2d = sketch.OpenEdition()
        
        # 2D 좌표 점들 생성 (단위: mm)
        p1 = factory_2d.CreatePoint(0.0, 0.0)
        p2 = factory_2d.CreatePoint(100.0, 0.0)
        p3 = factory_2d.CreatePoint(100.0, 50.0)
        p4 = factory_2d.CreatePoint(0.0, 50.0)
        
        # 선들 연결하여 직사각형 그리기
        l1 = factory_2d.CreateLine(0.0, 0.0, 100.0, 0.0)
        l1.StartPoint = p1
        l1.EndPoint = p2
        
        l2 = factory_2d.CreateLine(100.0, 0.0, 100.0, 50.0)
        l2.StartPoint = p2
        l2.EndPoint = p3
        
        l3 = factory_2d.CreateLine(100.0, 50.0, 0.0, 50.0)
        l3.StartPoint = p3
        l3.EndPoint = p4
        
        l4 = factory_2d.CreateLine(0.0, 50.0, 0.0, 0.0)
        l4.StartPoint = p4
        l4.EndPoint = p1
        
        # 스케치 편집 모드 닫기 (반드시 닫아야 3D 작업 가능)
        sketch.CloseEdition()
        
        print("[진행] 3D 패드(Pad, 돌출) 피처 생성 중...")
        # 6. 형상 팩토리를 통해 패드(돌출) 생성 (15 mm 두께)
        shape_factory = part.ShapeFactory
        pad = shape_factory.AddNewPad(sketch, 15.0)
        
        # 7. 피처 트리 및 형상 갱신
        part.Update()
        
        # 8. 문서 저장
        filename = "Catia_AutoBlock.CATPart"
        filepath = os.path.abspath(filename)
        
        print(f"[진행] 모델 저장 중: {filename}")
        part_doc.SaveAs(filepath)
        
        print("\n==================================================")
        print("  [성공] CATIA 자동화 3D 모델 생성이 완료되었습니다!")
        print(f"  파일 저장 경로: {filepath}")
        print("==================================================")
        
    except Exception as e:
        print(f"\n[오류] CATIA API 제어 중 에러가 발생했습니다: {e}")

if __name__ == "__main__":
    run_catia_automation()
