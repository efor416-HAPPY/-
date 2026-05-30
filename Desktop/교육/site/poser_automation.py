# -*- coding: utf-8 -*-
import os
import sys

def run_poser_automation():
    print("==================================================")
    print("    Bondware Poser (포져) API 파이썬 자동화 데모")
    print("==================================================")
    
    # poser 모듈 검증 (Poser 내장 파이썬 환경에서만 임포트 가능)
    try:
        import poser
    except ImportError:
        print("\n[안내] 'poser' 모듈은 포져(Poser) 프로그램 내장 파이썬 환경에서만 실행할 수 있습니다.")
        print("일반 파이썬 터미널에서는 작동하지 않으며, 아래와 같은 방법으로 실행해야 합니다:\n")
        print("방법 1. 포져를 실행한 뒤, 상단 메뉴에서 [Window] -> [Python Shell]을 열어 본 코드를 입력하고 실행합니다.")
        print("방법 2. 작성한 스크립트를 포져 스크립트 메뉴 폴더에 저장하여 메뉴에서 원클릭 실행합니다:")
        print("   설치경로/Runtime/Python/poserScripts/ScriptsMenu/ 폴더 안에 본 파일을 복사해 넣으면")
        print("   포져 상단 메뉴 [Scripts] 하위에 자동으로 등록되어 실행할 수 있습니다.\n")
        print("[참고] 이 스크립트 파일은 포져 내장 엔진이 바로 호출할 수 있도록 로컬 폴더에 저장되었습니다.")
        return

    print("[진행] 포져 파이썬 스크립트 실행 중...")
    
    try:
        # 1. 현재 활성화된 씬(Scene) 가져오기
        scene = poser.Scene()
        print("  - 활성 씬 접근 성공.")
        
        # 2. 3D 기하 프롭(Prop) 생성 (3D 구체 생성)
        # CreatePropFromGeom(GeomName, PropName)
        print("[진행] 3D 구(Sphere) 프롭 생성 및 씬에 추가 중...")
        sphere_prop = scene.CreatePropFromGeom("Sphere", "AutoSphereProp")
        
        # 3. 구체 매개변수(Parameter) 제어 (위치 및 스케일)
        print("[진행] 오브젝트의 위치 및 크기 파라미터 조절 중...")
        
        # Y축 이동 파라미터 제어 (위로 올리기)
        y_tran = sphere_prop.Parameter("yTran")
        if y_tran:
            y_tran.SetValue(1.5)  # 1.5 유닛만큼 위로 이동
            
        # 전체 크기(Scale) 파라미터 제어 (150% 크기)
        scale_param = sphere_prop.Parameter("Scale")
        if scale_param:
            scale_param.SetValue(1.5)
            
        # 4. 재질(Material) 색상 변경 (기본 Preview 재질을 빨간색으로 변경)
        print("[진행] 셰이딩 재질 색상(빨간색) 설정 중...")
        # 첫 번째 재질 또는 "Preview" 이름의 재질 가져오기
        try:
            mat = sphere_prop.Materials()[0]
            if mat:
                # RGB 값을 전달해 확산광 색상 변경 (빨간색: Red=1.0, Green=0.0, Blue=0.0)
                mat.SetDiffuseColor(1.0, 0.0, 0.0)
                print("  - 재질 색상을 빨간색으로 변경 완료.")
        except Exception as mat_err:
            print(f"  - 재질 설정 스킵 (오류: {mat_err})")
            
        # 5. 변경 사항 뷰포트에 반영하기 위해 화면 강제 리드로잉
        scene.DrawAll()
        
        # 6. 프로젝트 파일(.pz3)로 씬 저장
        filename = "Poser_AutoScene.pz3"
        filepath = os.path.abspath(filename)
        
        scene.Save(filepath)
        print("\n==================================================")
        print("  [성공] 포져 자동화 3D 프롭 및 재질 생성이 완료되었습니다!")
        print(f"  프로젝트 저장 경로: {filepath}")
        print("==================================================")
        
    except Exception as e:
        print(f"\n[오류] 포져 API 제어 중 에러가 발생했습니다: {e}")

if __name__ == "__main__":
    run_poser_automation()
