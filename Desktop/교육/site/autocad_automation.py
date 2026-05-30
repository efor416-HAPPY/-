# -*- coding: utf-8 -*-
import os
import sys
import array

def run_autocad_automation():
    print("==================================================")
    print("      Autodesk AutoCAD (캐드) API 파이썬 자동화 데모")
    print("==================================================")
    
    # pywin32 라이브러리 검증
    try:
        import win32com.client
    except ImportError:
        print("[오류] pywin32 라이브러리가 필요합니다. 'pip install pywin32'를 실행하세요.")
        return
        
    print("[진행] AutoCAD 프로그램 연결을 시도하는 중...")
    
    acad_app = None
    
    # 1. 활성화된 AutoCAD 어플리케이션 연결 시도
    try:
        acad_app = win32com.client.GetActiveObject("AutoCAD.Application")
        print("  - 실행 중인 AutoCAD 인스턴스에 성공적으로 연결했습니다.")
    except Exception:
        # 실행 중이 아니면 새로 시작 시도
        try:
            print("  - 실행 중인 캐드가 없어 새로 실행을 시도합니다. (시간이 걸릴 수 있습니다...)")
            acad_app = win32com.client.Dispatch("AutoCAD.Application")
            acad_app.Visible = True
            print("  - AutoCAD 프로그램이 정상 시작되었습니다.")
        except Exception as e:
            print("\n[실패] AutoCAD 라이브러리를 연결하거나 프로그램을 실행할 수 없습니다.")
            print("이유: AutoCAD가 설치되어 있지 않거나, COM 자동화 서버 등록이 되어 있지 않습니다.")
            print(f"상세 에러: {e}")
            return

    # AutoCAD 좌표 입력용 double array 헬퍼 함수
    def APoint(x, y, z=0.0):
        return array.array('d', [float(x), float(y), float(z)])

    try:
        # 2. 새 도면(Drawing) 추가
        print("[진행] 새 도면(Drawing) 추가 중...")
        documents = acad_app.Documents
        doc = documents.Add()
        
        # 3. 모델 스페이스(ModelSpace) 접근
        model_space = doc.ModelSpace
        
        # 4. 2D 직선(Line) 그리기 (시작점 -> 끝점)
        print("[진행] 2D 선(Line) 그리기 작업 중...")
        start_pt = APoint(0.0, 0.0)
        end_pt = APoint(100.0, 100.0)
        line = model_space.AddLine(start_pt, end_pt)
        print(f"  - 선 생성 완료 (0, 0) -> (100, 100)")
        
        # 5. 2D 원(Circle) 그리기 (중심점, 반경)
        print("[진행] 2D 원(Circle) 그리기 작업 중...")
        center_pt = APoint(50.0, 50.0)
        radius = 30.0
        circle = model_space.AddCircle(center_pt, radius)
        print(f"  - 원 생성 완료 (중심: 50, 50 / 반경: 30)")
        
        # 6. 문자(MText) 쓰기 (삽입점, 너비, 내용)
        print("[진행] 문자(MText) 작성 중...")
        insert_pt = APoint(10.0, 110.0)
        text_width = 150.0
        text_string = "AutoCAD Python Automation Demo"
        mtext = model_space.AddMText(insert_pt, text_width, text_string)
        mtext.Height = 8.0 # 텍스트 크기 조절
        print("  - MText 생성 완료.")
        
        # 7. 전체 줌(ZoomAll) 수행
        acad_app.ZoomAll()
        
        # 8. 도면 저장
        filename = "AutoCAD_AutoDrawing.dwg"
        filepath = os.path.abspath(filename)
        
        print(f"[진행] 도면 저장 중: {filename}")
        doc.SaveAs(filepath)
        
        print("\n==================================================")
        print("  [성공] AutoCAD 자동화 도면 작성이 완료되었습니다!")
        print(f"  파일 저장 경로: {filepath}")
        print("==================================================")
        
    except Exception as e:
        print(f"\n[오류] AutoCAD API 제어 중 에러가 발생했습니다: {e}")

if __name__ == "__main__":
    run_autocad_automation()
