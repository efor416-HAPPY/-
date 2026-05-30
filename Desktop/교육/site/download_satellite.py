import os
import math
import sys
import time

# Ensure dependencies are available or install them
try:
    import requests
    from PIL import Image
except ImportError:
    print("[정보] 필수 라이브러리(requests, pillow)가 설치되어 있지 않습니다.")
    print("[정보] 라이브러리 설치를 시작합니다...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "pillow"])
    import requests
    from PIL import Image

def latlon_to_tile(lat, lon, zoom):
    """위경도 좌표를 구글 지도 타일 좌표(X, Y)로 변환"""
    lat_rad = math.radians(lat)
    n = 2.0 ** zoom
    xtile = int((lon + 180.0) / 360.0 * n)
    ytile = int((1.0 - math.log(math.tan(lat_rad) + (1.0 / math.cos(lat_rad))) / math.pi) / 2.0 * n)
    return xtile, ytile

def download_and_stitch(min_lat, max_lat, min_lon, max_lon, zoom, map_type="satellite", output_name="output.png"):
    """
    지정한 위경도 영역의 구글 위성/하이브리드 타일을 다운로드하여 하나의 고화질 이미지로 병합
    map_type: 'satellite' (순수 위성사진) 또는 'hybrid' (위성사진 + 지명/지번/경계선 레이어)
    """
    # 맵 타입에 따른 구글 타일 서버 lyrs 값 설정
    # s: Satellite, y: Hybrid (Satellite + Labels)
    lyr = "s" if map_type == "satellite" else "y"
    url_template = f"https://mt1.google.com/vt/lyrs={lyr}&x={{x}}&y={{y}}&z={{z}}"
    
    # 타일 범위 계산
    x_min_t, y_max_t = latlon_to_tile(min_lat, min_lon, zoom)
    x_max_t, y_min_t = latlon_to_tile(max_lat, max_lon, zoom)
    
    x_start = min(x_min_t, x_max_t)
    x_end = max(x_min_t, x_max_t)
    y_start = min(y_min_t, y_max_t)
    y_end = max(y_min_t, y_max_t)
    
    width_tiles = x_end - x_start + 1
    height_tiles = y_end - y_start + 1
    
    print(f"\n[분석] 요청한 영역 크기: 가로 {width_tiles}개, 세로 {height_tiles}개 타일 (총 {width_tiles * height_tiles}개 타일)")
    print(f"[정보] 다운로드 해상도: {width_tiles * 256} x {height_tiles * 256} 픽셀")
    
    if width_tiles * height_tiles > 500:
        print("[경고] 다운로드할 타일 수가 많습니다. 완료되는 데 시간이 걸릴 수 있습니다.")
        confirm = input("계속 진행하시겠습니까? (y/n): ").strip().lower()
        if confirm != 'y':
            print("[취소] 작업을 중단합니다.")
            return False

    # 타일을 병합할 캔버스 생성
    canvas = Image.new("RGB", (width_tiles * 256, height_tiles * 256))
    
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    success_count = 0
    fail_count = 0
    
    print("\n[진행] 위성 지도를 다운로드 중입니다...")
    
    for i, x in enumerate(range(x_start, x_end + 1)):
        for j, y in enumerate(range(y_start, y_end + 1)):
            url = url_template.format(x=x, y=y, z=zoom)
            
            # 진행률 표시
            progress = (i * height_tiles + j + 1) / (width_tiles * height_tiles) * 100
            print(f"\r  - 다운로드 진행률: {progress:.1f}% ({i * height_tiles + j + 1}/{width_tiles * height_tiles})", end="")
            
            try:
                # 타일 다운로드 요청 (지연 방지를 위해 타임아웃 설정)
                res = requests.get(url, headers=headers, timeout=10)
                if res.status_code == 200:
                    # 다운로드한 타일을 임시 파일로 저장한 후 Pillow로 읽어 캔버스에 병합
                    tile_path = f"temp_tile_{x}_{y}.png"
                    with open(tile_path, "wb") as f:
                        f.write(res.content)
                    
                    tile_img = Image.open(tile_path)
                    canvas.paste(tile_img, (i * 256, j * 256))
                    
                    # 임시 파일 삭제
                    tile_img.close()
                    os.remove(tile_path)
                    success_count += 1
                else:
                    fail_count += 1
            except Exception as e:
                fail_count += 1
            
            # 서버 부하 방지 및 차단 회피를 위한 미세 대기
            time.sleep(0.05)
            
    print("\n[완료] 다운로드가 끝났습니다.")
    print(f"  - 성공: {success_count}개, 실패: {fail_count}개")
    
    if success_count > 0:
        canvas.save(output_name)
        print(f"[성공] 병합된 고화질 위성지도 파일 저장 완료: {output_name} ({os.path.abspath(output_name)})")
        return True
    else:
        print("[오류] 다운로드 성공한 타일이 없어 파일을 생성하지 못했습니다.")
        return False

def main():
    print("==================================================")
    print("  양구군 최신 위성사진 고화질 다운로드 도구")
    print("==================================================")
    
    # 만약 커맨드라인 인자가 있으면 비대화형으로 실행
    if len(sys.argv) > 3:
        choice = sys.argv[1].strip()
        map_type_arg = sys.argv[2].strip()
        zoom_arg = sys.argv[3].strip()
        
        print(f"[정보] 인자 기반 비대화형 실행: 지역={choice}, 타입={map_type_arg}, 줌={zoom_arg}")
        
        if choice == '1':
            min_lat, max_lat = 38.25, 38.31
            min_lon, max_lon = 128.08, 128.16
            region_name = "yanggu_haean"
        elif choice == '2':
            min_lat, max_lat = 38.08, 38.13
            min_lon, max_lon = 127.96, 128.02
            region_name = "yanggu_eup"
        else:
            # 커스텀 위경도가 인자로 들어온 경우 (예: "custom,38.08,38.13,127.96,128.02")
            try:
                parts = choice.split(',')
                min_lat = float(parts[1])
                max_lat = float(parts[2])
                min_lon = float(parts[3])
                max_lon = float(parts[4])
                region_name = "custom_region"
            except Exception as e:
                print(f"[오류] 잘못된 지역 인자 형식입니다: {e}")
                return
        
        map_type = "hybrid" if map_type_arg in ['2', 'hybrid'] else "satellite"
        zoom = int(zoom_arg) if zoom_arg.isdigit() else 15
        
    else:
        print("다운로드할 양구군의 세부 지역을 선택하세요:")
        print("1. 양구군 해안면 (펀치볼 - 사과, 인삼밭 등 주요 전환지)")
        print("2. 양구읍 일대 (벼 농사 및 비닐하우스 등)")
        print("3. 직접 위도/경도 범위 입력 (사용자 커스텀)")
        
        choice = input("선택 (1/2/3): ").strip()
        
        # 디폴트 영역 좌표 설정
        if choice == '1':
            min_lat, max_lat = 38.25, 38.31
            min_lon, max_lon = 128.08, 128.16
            region_name = "yanggu_haean"
        elif choice == '2':
            min_lat, max_lat = 38.08, 38.13
            min_lon, max_lon = 127.96, 128.02
            region_name = "yanggu_eup"
        elif choice == '3':
            try:
                min_lat = float(input("최소 위도 (예: 38.08): "))
                max_lat = float(input("최대 위도 (예: 38.13): "))
                min_lon = float(input("최소 경도 (예: 127.96): "))
                max_lon = float(input("최대 경도 (예: 128.02): "))
                region_name = "custom_region"
            except ValueError:
                print("[오류] 올바른 숫자를 입력해주세요.")
                return
        else:
            print("[오류] 잘못된 선택입니다.")
            return
            
        print("\n지도 형식을 선택하세요:")
        print("1. 순수 고화질 위성사진 (satellite)")
        print("2. 하이브리드 지도 (위성사진 + 지명/지번/도로 경계선 레이어 중첩 - hybrid)")
        map_choice = input("선택 (1/2): ").strip()
        map_type = "hybrid" if map_choice == '2' else "satellite"
        
        print("\n해상도(줌 레벨)를 선택하세요:")
        print("- 13: 광대역 (전체적인 흐름 파악용)")
        print("- 14: 중간 화질 (필지 형태 확인용)")
        print("- 15: 고화질 (개별 인삼막, 비닐하우스 구분 가능 - 권장)")
        print("- 16: 초고화질 (다운로드 수량 많음)")
        zoom_input = input("선택 (13/14/15/16) [기본값 15]: ").strip()
        zoom = int(zoom_input) if zoom_input in ['13', '14', '15', '16'] else 15
        
    output_file = f"{region_name}_{map_type}_z{zoom}.png"
    
    success = download_and_stitch(min_lat, max_lat, min_lon, max_lon, zoom, map_type, output_file)
    if success:
        print("\n[알림] 다운로드한 이미지를 사진 뷰어로 열어 2022~2025년 대비 2025~2026년 변화를 대조하세요.")
        print(f"파일 경로: {os.path.abspath(output_file)}")

if __name__ == "__main__":
    main()
