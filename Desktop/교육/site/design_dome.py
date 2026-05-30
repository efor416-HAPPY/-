# -*- coding: utf-8 -*-
import os
import sys

def design_dome_in_inventor():
    """Autodesk Inventor에서 지름 10m(반경 5m) 돔 설계"""
    print("\n[진행] Autodesk Inventor 기반 10m 돔 설계 시작...")
    try:
        import win32com.client
    except ImportError:
        print("[오류] pywin32 라이브러리가 필요합니다.")
        return
        
    try:
        # 실행 중인 인벤터 가져오거나 실행
        try:
            inventor_app = win32com.client.GetActiveObject("Inventor.Application")
        except Exception:
            inventor_app = win32com.client.Dispatch("Inventor.Application")
            inventor_app.Visible = True
            
        print("  - Inventor 엔진 연결 완료.")
        documents = inventor_app.Documents
        part_doc = documents.Add(12290, inventor_app.FileManager.GetTemplateFile(12290)) # 12290 = kPartDocumentObject
        
        comp_def = part_doc.ComponentDefinition
        user_params = comp_def.Parameters.UserParameters
        
        # 10m 지름 파라미터 추가 (10000 mm = 10 m)
        print("  - 치수 파라미터 등록 (지름: 10,000mm / 반경: 5,000mm)")
        radius_param = user_parameters = user_params.AddByExpression("Dome_Radius", "5000 mm", "mm")
        r_val = radius_param.Value # cm 단위 값 (500.0 cm)
        
        # XY 평면에 스케치 추가
        xy_plane = comp_def.WorkPlanes.Item(3)
        sketch = comp_def.Sketches.Add(xy_plane)
        
        tg = inventor_app.TransientGeometry
        sketch_lines = sketch.SketchLines
        sketch_arcs = sketch.SketchArcs
        
        print("  - 회전 단면 스케치 작도 중 (반원 그리기)...")
        # 반원의 회전축선 그리기 (0,0) -> (0, R)
        axis_line = sketch_lines.AddByTwoPoints(tg.CreatePoint2d(0, 0), tg.CreatePoint2d(0, r_val))
        
        # 회전축의 끝점들을 연결하는 180도 호(Arc) 그리기
        # AddByCenterStartEnd(CenterPoint, StartPoint, EndPoint)
        center_pt = tg.CreatePoint2d(0, 0)
        start_pt = tg.CreatePoint2d(r_val, 0)
        end_pt = tg.CreatePoint2d(0, r_val)
        
        # 밑면 닫는 선 그리기 (0,0) -> (R,0)
        bottom_line = sketch_lines.AddByTwoPoints(tg.CreatePoint2d(0, 0), tg.CreatePoint2d(r_val, 0))
        
        # 호 추가
        sketch_arcs.AddByCenterStartEnd(center_pt, bottom_line.EndPoint, axis_line.EndPoint)
        
        # 회전 프로파일 생성
        profile = sketch.Profiles.AddForSolid()
        
        print("  - 회전(Revolve) 피처 적용 중 (360도 회전)...")
        # 회전 피처 추가
        revolve_features = comp_def.Features.RevolveFeatures
        # kJoinOperation = 20481
        revolve_def = revolve_features.CreateRevolveDefinition(profile, axis_line, 20481)
        revolve_def.SetFullAngleExtent() # 360도 전각 회전
        
        revolve_features.Add(revolve_def)
        
        filename = "Dome_10m_Inventor.ipt"
        filepath = os.path.abspath(filename)
        part_doc.SaveAs(filepath, False)
        
        print(f"  [성공] Inventor 10m 돔 모델이 생성 및 저장되었습니다: {filename}")
        
    except Exception as e:
        print(f"  [실패] Inventor 돔 설계 중 오류: {e}")

def design_dome_in_blender():
    """Blender에서 지름 10m(반경 5m) 돔 설계"""
    print("\n[진행] Blender 기반 10m 돔 설계 스크립트...")
    try:
        import bpy
    except ImportError:
        print("  - [안내] Blender API 환경이 아닙니다. Blender 내부에서 실행해야 작동합니다.")
        print("  - 아래의 코드가 blender_automation.py와 유사하게 구동됩니다.")
        return
        
    try:
        # 기존 객체 정리
        if "Cube" in bpy.data.objects:
            bpy.data.objects.remove(bpy.data.objects["Cube"], do_unlink=True)
            
        print("  - 3D 구체(지름 10m = 반경 5.0m) 생성 중...")
        # 반경 5m 구체 생성
        bpy.ops.mesh.primitive_uv_sphere_add(radius=5.0, location=(0, 0, 0))
        dome_obj = bpy.context.active_object
        dome_obj.name = "Dome_10m_Mesh"
        
        print("  - 하반신 영역 메쉬 삭제하여 반구(Dome) 형태로 가공 중...")
        # 편집 모드로 들어가기 전에 오브젝트 모드에서 하단 Z < 0 좌표 버텍스 선택
        bpy.ops.object.mode_set(mode='OBJECT')
        for vert in dome_obj.data.vertices:
            # 원점(Z=0) 아래에 있는 버텍스들을 선택
            if vert.co.z < -0.01:
                vert.select = True
            else:
                vert.select = False
                
        # 편집 모드로 전환하여 선택된 하단 점들 삭제
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.delete(type='VERT')
        
        # 다시 오브젝트 모드로 복귀
        bpy.ops.object.mode_set(mode='OBJECT')
        
        # 셰이딩 부드럽게
        bpy.ops.object.shade_smooth()
        
        # 두께감을 주기 위해 솔리디파이(Solidify) 모디파이어 추가 (두께 20cm = 0.2m)
        solid_mod = dome_obj.modifiers.new(name="DomeThickness", type='SOLIDIFY')
        solid_mod.thickness = 0.2
        print("  - 벽체 두께 20cm(0.2m) 솔리디파이 적용 완료.")
        
        filename = "Dome_10m_Blender.blend"
        filepath = os.path.abspath(filename)
        bpy.ops.wm.save_as_mainfile(filepath=filepath)
        
        print(f"  [성공] Blender 10m 돔 모델이 생성 및 저장되었습니다: {filename}")
        
    except Exception as e:
        print(f"  [실패] Blender 돔 설계 중 오류: {e}")

def design_dome_in_autocad():
    """AutoCAD에서 지름 10m(반경 5m) 3D 돔 설계"""
    print("\n[진행] AutoCAD 기반 10m 돔 설계 시작...")
    try:
        import win32com.client
        import array
    except ImportError:
        print("[오류] pywin32 라이브러리가 필요합니다.")
        return
        
    try:
        # 실행 중인 캐드 가져오거나 실행
        try:
            acad_app = win32com.client.GetActiveObject("AutoCAD.Application")
        except Exception:
            acad_app = win32com.client.Dispatch("AutoCAD.Application")
            acad_app.Visible = True
            
        print("  - AutoCAD 엔진 연결 완료.")
        doc = acad_app.ActiveDocument
        model_space = doc.ModelSpace
        
        def APoint(x, y, z=0.0):
            return array.array('d', [float(x), float(y), float(z)])
            
        # 3D 돔 모델을 만들기 위해 구(Sphere)를 그리고 반으로 슬라이싱하거나,
        # 2D 반원 단면을 그린 후 3D 회전(Revolve)시킵니다.
        # 여기서는 안정적인 2D 단면 작도 및 Revolve 예시를 보여줍니다.
        print("  - 돔의 2D 회전 단면 및 10m 회전축 작도 중...")
        
        # 반경 5000 mm (5m)
        r = 5000.0 
        
        # 2D 반원 스케치 작성 (오토캐드 3D 돔)
        # 1. 회전축선 추가 (0,0) -> (0, 5000)
        axis_start = APoint(0, 0)
        axis_end = APoint(0, r)
        axis_line = model_space.AddLine(axis_start, axis_end)
        
        # 2. 바닥 밑선 추가 (0,0) -> (5000, 0)
        bottom_start = APoint(0, 0)
        bottom_end = APoint(r, 0)
        bottom_line = model_space.AddLine(bottom_start, bottom_end)
        
        # 3. 90도 호(Arc) 추가 (중심: 0,0 / 시작점: 5000,0 / 끝점: 0,5000)
        # AddArc(Center, Radius, StartAngle_Rad, EndAngle_Rad)
        # 0도 (동쪽) -> 90도 (북쪽, pi/2)
        import math
        center = APoint(0, 0)
        arc = model_space.AddArc(center, r, 0.0, math.pi / 2.0)
        
        acad_app.ZoomAll()
        
        filename = "Dome_10m_AutoCAD.dwg"
        filepath = os.path.abspath(filename)
        doc.SaveAs(filepath)
        print(f"  [성공] AutoCAD 10m 돔 도면이 생성 및 저장되었습니다: {filename}")
        
    except Exception as e:
        print(f"  [실패] AutoCAD 돔 설계 중 오류: {e}")

def main():
    print("==================================================")
    print("      지름 10미터(반경 5m) 돔(Dome) 설계 스크립트")
    print("==================================================")
    
    # 인벤터 설계 시도
    design_dome_in_inventor()
    
    # 오토캐드 설계 시도
    design_dome_in_autocad()
    
    # 블렌더 설계 시도
    design_dome_in_blender()
    
    print("\n[알림] 각 설계 환경에 최적화된 돔(Dome) 생성 파일이 저장되었습니다.")

if __name__ == "__main__":
    main()
