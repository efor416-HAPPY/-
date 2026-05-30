# -*- coding: utf-8 -*-
import zipfile
import os

def create_greenhouse_zip():
    zip_name = "hex_wooden_greenhouse_package.zip"
    files_to_zip = [
        "greenhouse_spec.md",
        "greenhouse_parts_list.xlsx",
        "greenhouse_layout.dxf",
        "greenhouse_details.dxf",
        "greenhouse_layout.dwg",
        "greenhouse_details.dwg"
    ]
    
    # Check if files exist
    valid_files = []
    for f in files_to_zip:
        if os.path.exists(f):
            valid_files.append(f)
        else:
            print(f"[경고] {f} 파일이 존재하지 않아 ZIP 패키지에서 제외됩니다.")
            
    if not valid_files:
        print("[오류] 압축할 파일이 없습니다.")
        return
        
    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for f in valid_files:
            zipf.write(f)
            print(f"  - 압축 추가 완료: {f}")
            
    print(f"\n[성공] 모든 자재 목록과 도면이 포함된 ZIP 파일이 완성되었습니다: {zip_name}")
    print(f"파일 경로: {os.path.abspath(zip_name)}")

if __name__ == "__main__":
    create_greenhouse_zip()
