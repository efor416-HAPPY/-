# -*- coding: utf-8 -*-
import os
import sys

def run_blender_automation():
    print("==================================================")
    # 한글 깨짐 방지용
    print("    Blender (블렌더) API 파이썬 자동화 데모")
    print("==================================================")
    
    # bpy 모듈 검증 (Blender 내장 파이썬 환경에서만 임포트 가능)
    try:
        import bpy
    except ImportError:
        print("\n[안내] 'bpy' 모듈은 블렌더 프로그램 내장 파이썬 환경에서만 실행할 수 있습니다.")
        print("일반 파이썬 터미널에서는 작동하지 않으며, 아래와 같은 방법으로 실행해야 합니다:\n")
        print("방법 1. 블렌더를 켠 뒤 [Scripting] 탭으로 이동하여 새 텍스트를 만들고 본 코드를 붙여넣은 후 실행(Run Script)합니다.")
        print("방법 2. 시스템 터미널(CMD/PowerShell)에서 블렌더 실행 파일을 통해 백그라운드로 호출합니다:")
        print("   blender --background --python blender_automation.py\n")
        print("[참고] 이 스크립트 파일은 블렌더가 실행할 수 있도록 로컬 작업 디렉토리에 정상 저장되었습니다.")
        return

    print("[진행] 블렌더 파이썬 스크립트 실행 중...")
    
    # 1. 기존의 기본 메쉬 객체 삭제 (큐브 등)
    # 씬이 깨끗한 상태에서 시작하도록 유도
    if "Cube" in bpy.data.objects:
        bpy.data.objects.remove(bpy.data.objects["Cube"], do_unlink=True)
        print("  - 기존 기본 큐브 삭제 완료.")

    # 2. 새로운 3D 메쉬 생성 (원통형 기둥 생성)
    # radius=1.5(반경), depth=3.0(높이), location=(0,0,1.5)
    print("[진행] 3D 원통(Cylinder) 메쉬 생성 중...")
    bpy.ops.mesh.primitive_cylinder_add(
        radius=1.5, 
        depth=3.0, 
        location=(0, 0, 1.5)
    )
    
    # 생성된 객체 참조 가져오기
    cylinder = bpy.context.active_object
    cylinder.name = "AutoGoldCylinder"
    
    # 3. 입체 모서리를 부드럽게 깎는 베벨(Bevel) 모디파이어 추가
    print("[진행] 베벨 모디파이어(Bevel Modifier) 적용 중...")
    bevel_mod = cylinder.modifiers.new(name="MyBevel", type='BEVEL')
    bevel_mod.width = 0.1
    bevel_mod.segments = 4
    
    # 부드러운 셰이딩 적용
    bpy.ops.object.shade_smooth()
    
    # 4. 재질(Material) 생성 및 메탈릭 골드 색상 적용
    print("[진행] 금속성 골드(Gold) 재질 및 노드 설정 중...")
    mat = bpy.data.materials.new(name="MetallicGold")
    mat.use_nodes = True
    
    # 노드 트리 연결 제어
    nodes = mat.node_tree.nodes
    principled_node = nodes.get("Principled BSDF")
    
    if principled_node:
        # Base Color 설정 (RGB + Alpha) - 골드 색상
        principled_node.inputs['Base Color'].default_value = (1.0, 0.766, 0.336, 1.0)
        # Metallic(금속성) 최댓값 설정
        principled_node.inputs['Metallic'].default_value = 1.0
        # Roughness(표면 거칠기) 낮춤 (매끄럽고 반사율 높게)
        principled_node.inputs['Roughness'].default_value = 0.15
        print("  - 골드 메탈릭 재질 셋업 완료.")
        
    # 객체에 재질 바인딩
    cylinder.data.materials.append(mat)
    
    # 5. 블렌더 프로젝트 파일(.blend) 저장
    filename = "Blender_AutoModel.blend"
    filepath = os.path.abspath(filename)
    
    try:
        bpy.ops.wm.save_as_mainfile(filepath=filepath)
        print("\n==================================================")
        print("  [성공] 블렌더 자동화 3D 모델 생성이 완료되었습니다!")
        print(f"  프로젝트 저장 경로: {filepath}")
        print("==================================================")
    except Exception as e:
        print(f"[실패] 파일 저장 중 오류 발생: {e}")

if __name__ == "__main__":
    run_blender_automation()
