# -*- coding: utf-8 -*-
import os
import sys

def run_maya_automation():
    print("==================================================")
    print("    Autodesk Maya (마야) API 파이썬 자동화 데모")
    print("==================================================")
    
    # maya.cmds 모듈 검증 (마야 내장 파이썬 환경에서만 임포트 가능)
    try:
        import maya.cmds as cmds
    except ImportError:
        print("\n[안내] 'maya.cmds' 모듈은 마야(Maya) 내장 파이썬 환경에서만 실행할 수 있습니다.")
        print("일반 파이썬 터미널에서는 작동하지 않으며, 아래와 같은 방법으로 실행해야 합니다:\n")
        print("방법 1. 마야를 실행한 뒤, 우측 하단의 [Script Editor]를 열어 Python 탭에 본 코드를 붙여넣고 실행합니다.")
        print("방법 2. 마야에 포함된 내장 독립형 파이썬 엔진(mayapy.exe)을 통해 터미널에서 스크립트를 직접 실행합니다:")
        print("   mayapy.exe maya_automation.py\n")
        print("방법 3. 마야를 백그라운드(배치 모드)로 실행하여 자동화 처리합니다:")
        print("   maya -batch -command \"python(\\\"exec(open('maya_automation.py').read())\\\")\"\n")
        print("[참고] 이 스크립트 파일은 마야가 바로 인식하여 구동할 수 있도록 로컬 폴더에 저장되었습니다.")
        return

    print("[진행] 마야 파이썬 스크립트 실행 중...")
    
    # 1. 새 씬(Scene) 생성 (강제 덮어쓰기 설정)
    cmds.file(new=True, force=True)
    print("  - 기존 씬 초기화 및 새 씬 개설 완료.")
    
    # 2. 3D 폴리곤 구(Sphere) 생성
    # radius=2.0(반경), name="AutoSphere"
    print("[진행] 3D 폴리곤 구(Sphere) 메쉬 생성 중...")
    sphere_node = cmds.polySphere(radius=2.0, subdivisionsX=20, subdivisionsY=20, name="AutoBouncingSphere")[0]
    
    # 3. 객체를 공중에 배치 (초기 위치 Y축 5.0)
    cmds.move(0, 5.0, 0, sphere_node)
    
    # 4. 재질(Material) 생성 및 셰이딩 노드 세팅 (금색 블린 셰이더)
    print("[진행] 골드 블린(Blinn) 셰이더 및 재질 연결 설정 중...")
    shader = cmds.shadingNode('blinn', asShader=True, name="GoldBlinnShader")
    
    # 속성 값 조정 (RGB 골드 컬러 및 스펙큘러 조절)
    cmds.setAttr(f"{shader}.color", 1.0, 0.766, 0.336, type="double3") # 베이스 골드 컬러
    cmds.setAttr(f"{shader}.diffuse", 0.8)                              # 디퓨즈 반사율
    cmds.setAttr(f"{shader}.specularColor", 1.0, 0.9, 0.7, type="double3") # 스펙큘러 하이라이트
    cmds.setAttr(f"{shader}.eccentricity", 0.2)                         # 광택 집중도
    
    # 셰이딩 세트(Shading Group) 생성 및 셰이더 연결
    shading_group = cmds.sets(renderable=True, noSurfaceShader=True, empty=True, name=f"{shader}SG")
    cmds.connectAttr(f"{shader}.outColor", f"{shading_group}.surfaceShader", force=True)
    
    # 구 오브젝트에 재질 할당
    cmds.sets(sphere_node, edit=True, forceElement=shading_group)
    print("  - 재질 할당 완료.")

    # 5. 애니메이션 키프레임 셋업 (구의 바운싱 모션 자동 제작)
    print("[진행] 바운싱(위아래 반동) 애니메이션 키프레임 적용 중...")
    
    # 프레임 1: Y축 5.0 (시작 위치)
    cmds.currentTime(1)
    cmds.setKeyframe(sphere_node, attribute="translateY", value=5.0)
    
    # 프레임 12: Y축 0.0 (바닥에 닿는 위치)
    cmds.currentTime(12)
    cmds.setKeyframe(sphere_node, attribute="translateY", value=0.0)
    
    # 프레임 24: Y축 5.0 (다시 공중으로 튀어 오르는 위치)
    cmds.currentTime(24)
    cmds.setKeyframe(sphere_node, attribute="translateY", value=5.0)
    
    # 재생 루프 구간 설정 (1프레임 ~ 24프레임)
    cmds.playbackOptions(min=1, max=24, animationStartTime=1, animationEndTime=24)
    print("  - 1~24 프레임 바운싱 애니메이션 셋업 완료.")
    
    # 6. 마야 아스키 파일(.ma)로 프로젝트 저장
    filename = "Maya_AutoModel.ma"
    filepath = os.path.abspath(filename)
    
    try:
        cmds.file(rename=filepath)
        cmds.file(save=True, type="mayaAscii")
        print("\n==================================================")
        print("  [성공] 마야 자동화 3D 모델 및 애니메이션 생성이 완료되었습니다!")
        print(f"  프로젝트 저장 경로: {filepath}")
        print("==================================================")
    except Exception as e:
        print(f"[실패] 마야 프로젝트 파일 저장 중 오류 발생: {e}")

if __name__ == "__main__":
    run_maya_automation()
