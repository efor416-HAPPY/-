# -*- coding: utf-8 -*-
import ezdxf
import math
import shutil

def create_greenhouse_drawings():
    # 1. 육각형 비닐하우스 배치 도면 (greenhouse_layout.dxf)
    doc_layout = ezdxf.new('R2010')
    msp_layout = doc_layout.modelspace()
    
    r = 3000.0 # 반경 3m (지름 6m)
    points = []
    
    # 육각형 좌표 계산
    for i in range(6):
        angle = math.radians(i * 60)
        x = r * math.cos(angle)
        y = r * math.sin(angle)
        points.append((x, y))
        
    # 외곽 테두리 (기단 바닥 보) 그리기
    msp_layout.add_lwpolyline(points + [points[0]], dxfattribs={'color': 1}) # Red 기단선
    
    # 6개 메인 목재 기둥 (90x90) 단면 사각형 배치
    for pt in points:
        px, py = pt
        msp_layout.add_lwpolyline([
            (px - 45, py - 45),
            (px + 45, py - 45),
            (px + 45, py + 45),
            (px - 45, py + 45),
            (px - 45, py - 45)
        ], dxfattribs={'color': 2}) # Yellow 기둥 단면
        
    # 지붕 서까래 라인 연결 (기둥 정점 -> 중심 헥사 허브)
    for pt in points:
        msp_layout.add_line((0, 0), pt, dxfattribs={'color': 3}) # Green 서까래 골조선
        
    # 중심 헥사 허브를 원형(지름 200mm)으로 간이 표시
    msp_layout.add_circle((0, 0), 100.0, dxfattribs={'color': 4}) # Cyan 허브
    
    # 도면 텍스트 작성
    msp_layout.add_text("HEXAGONAL WOODEN GREENHOUSE - LAYOUT PLAN", 
                        dxfattribs={'height': 150}).set_placement((-2000, 3500))
    msp_layout.add_text("Radius: 3,000 mm / Diameter: 6,000 mm", 
                        dxfattribs={'height': 100}).set_placement((-1800, 3300))
    
    doc_layout.saveas("greenhouse_layout.dxf")
    print("[성공] greenhouse_layout.dxf 도면 파일 생성 완료.")
    
    # 2. 구조 상세 도면 (greenhouse_details.dxf)
    doc_details = ezdxf.new('R2010')
    msp_details = doc_details.modelspace()
    
    # 정면도 (높이 2.4m 기둥 및 0.8m 지붕 서까래 구조)
    # 바닥 기초 레벨 (y=0)
    msp_details.add_line((-3000, 0), (3000, 0), dxfattribs={'color': 7}) # White/Black 지반선
    
    # 좌우 외곽 기둥 (높이 2.4m = 2400)
    msp_details.add_lwpolyline([(-3000, 0), (-3000, 2400)], dxfattribs={'color': 2})
    msp_details.add_lwpolyline([(3000, 0), (3000, 2400)], dxfattribs={'color': 2})
    
    # 지붕 처마 가로대 및 서까래 경사면 (중앙 정점 높이 3.2m = 3200)
    msp_details.add_line((-3000, 2400), (3000, 2400), dxfattribs={'color': 1}) # 처마 가로선
    msp_details.add_line((-3000, 2400), (0, 3200), dxfattribs={'color': 3}) # 좌측 지붕 경사선
    msp_details.add_line((3000, 2400), (0, 3200), dxfattribs={'color': 3}) # 우측 지붕 경사선
    
    # 기둥 아래 포스트 베이스 철물 및 기초 블록 표시
    for base_x in [-3000, 3000]:
        # 콘크리트 기초 블록 (가로 400, 깊이 400)
        msp_details.add_lwpolyline([
            (base_x - 200, 0),
            (base_x - 200, -400),
            (base_x + 200, -400),
            (base_x + 200, 0),
            (base_x - 200, 0)
        ], dxfattribs={'color': 8}) # Gray 콘크리트 패드
        
    # 치수 보조선 및 텍스트 추가
    msp_details.add_text("FRONT ELEVATION & DETAILED HEIGHTS", 
                        dxfattribs={'height': 150}).set_placement((-2000, 3600))
    msp_details.add_text("Total Height: 3,200 mm", 
                        dxfattribs={'height': 100}).set_placement((500, 2800))
    msp_details.add_text("Post Height: 2,400 mm", 
                        dxfattribs={'height': 100}).set_placement((3100, 1200))
    
    doc_details.saveas("greenhouse_details.dxf")
    print("[성공] greenhouse_details.dxf 도면 파일 생성 완료.")
    
    # 3. 사용자의 AutoCAD 편리한 열람을 위한 DWG 확장자 복사본 생성
    # (AutoCAD는 DXF를 네이티브로 직접 가져오므로, 파일명을 복사해줌으로써 즉시 열 수 있게 함)
    shutil.copy("greenhouse_layout.dxf", "greenhouse_layout.dwg")
    shutil.copy("greenhouse_details.dxf", "greenhouse_details.dwg")
    print("[안내] AutoCAD 다이렉트 호환을 위한 DWG 복사본 생성 완료.")

if __name__ == "__main__":
    create_greenhouse_drawings()
