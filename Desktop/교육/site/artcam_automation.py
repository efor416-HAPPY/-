# -*- coding: utf-8 -*-
import os
import sys

def run_artcam_automation():
    print("==================================================")
    print("      Autodesk ArtCAM (아트캠) API 파이썬 자동화 데모")
    print("==================================================")
    
    # pywin32 라이브러리 검증
    try:
        import win32com.client
    except ImportError:
        print("[오류] pywin32 라이브러리가 필요합니다. 'pip install pywin32'를 실행하세요.")
        return
        
    print("[진행] ArtCAM 프로그램 연결을 시도하는 중...")
    
    artcam_app = None
    
    # 1. 활성화된 ArtCAM 어플리케이션 연결 시도
    try:
        artcam_app = win32com.client.GetActiveObject("ArtCAM.Application")
        print("  - 실행 중인 ArtCAM 인스턴스에 성공적으로 연결했습니다.")
    except Exception:
        # 실행 중이 아니면 새로 시작 시도
        try:
            print("  - 실행 중인 아트캠이 없어 새로 실행을 시도합니다. (시간이 걸릴 수 있습니다...)")
            artcam_app = win32com.client.Dispatch("ArtCAM.Application")
            artcam_app.Visible = True
            print("  - ArtCAM 프로그램이 정상 시작되었습니다.")
        except Exception as e:
            print("\n[실패] ArtCAM 라이브러리를 연결하거나 프로그램을 실행할 수 없습니다.")
            print("이유: ArtCAM 또는 후속작인 Carveco가 설치되어 있지 않거나, COM 등록이 되어 있지 않습니다.")
            print(f"상세 에러: {e}")
            return

    try:
        # 2. 어플리케이션 이름 출력 확인
        print(f"[정보] 연결된 ArtCAM 어플리케이션 이름: {artcam_app.Name}")
        
        # 3. 새 모델(New Model) 생성 (가로 200mm, 세로 200mm, 해상도 1000x1000, 원점 위치 설정)
        # ArtCAM COM API: NewModel(XSize, YSize, Resolution, Units) - 보통 0: mm, 1: inch
        print("[진행] 새 작업 모델(New Model: 200mm x 200mm) 생성 중...")
        try:
            # 200x200mm 크기의 신규 프로젝트 모델 개설
            model = artcam_app.NewModel(200.0, 200.0, 1000, 0) # 0 = Metric (mm)
            print("  - 신규 모델 평면 공간 생성 완료.")
        except AttributeError:
            print("  - 일반 NewModel 호출 실패. 대체 Documents 컬렉션 접근 시도...")
            model = artcam_app.Documents.Add()
            print("  - 대체 문서 추가 완료.")

        # 4. 모델 내에 2D 벡터 원(Circle) 그리기
        # ArtCAM COM API: CreateCircle(CenterX, CenterY, Radius)
        print("[진행] 가공 영역 중앙에 2D 원형 벡터 생성 중...")
        try:
            # 중앙 위치에 반경 50mm의 원 드로잉
            circle_vector = model.CreateCircle(100.0, 100.0, 50.0)
            print(f"  - 원형 가공 벡터 생성 완료: {circle_vector}")
        except Exception as vec_err:
            print(f"  - 벡터 드로잉 스킵 (버전별 API 상이): {vec_err}")
            print("  - 팁: 보유하신 ArtCAM 버전에 맞춰 model.CreateCircle 또는 model.ActiveLayer.AddCircle을 사용해 주세요.")
            
        # 5. 모델 저장
        filename = "Artcam_AutoModel.art"
        filepath = os.path.abspath(filename)
        
        print(f"[진행] 모델 저장 중: {filename}")
        try:
            model.SaveAs(filepath)
            print("\n==================================================")
            print("  [성공] ArtCAM 자동화 모델 및 벡터 생성이 완료되었습니다!")
            print(f"  파일 저장 경로: {filepath}")
            print("==================================================")
        except Exception as save_err:
            print(f"  - 파일 자동 저장 실패: {save_err}")
            
    except Exception as e:
        print(f"\n[오류] ArtCAM API 제어 중 에러가 발생했습니다: {e}")

if __name__ == "__main__":
    run_artcam_automation()
