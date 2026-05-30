# -*- coding: utf-8 -*-
import os

def print_premiere_guide():
    print("==================================================")
    print("     Adobe Premiere Pro API 자동화 안내 도구")
    print("==================================================")
    print("\n[중요 개념] 어도비 프리미어 프로(Premiere Pro)는 어떻게 자동화할까요?")
    print("1. 어도비 제품군(프리미어, 에프터이펙트, 포토샵 등)은 독자적인 'ExtendScript (자바스크립트 기반)' 엔진을 사용합니다.")
    print("2. 인벤터나 카티아처럼 파이썬에서 직접 COM(win32com)으로 모든 개별 개체를 다이렉트로 제어하는 방식보다는,")
    print("   자바스크립트 스크립트(.jsx)를 작성하고 프리미어 내부에서 이를 실행하는 방식이 가장 표준적이고 안전합니다.")
    
    print("\n[현재 생성된 스크립트 정보]")
    jsx_file = "premiere_automation.jsx"
    print(f"파일명: {jsx_file}")
    print(f"경로: {os.path.abspath(jsx_file)}")
    
    print("\n[실행 방법]")
    print("방법 1. 프리미어 프로 내부에서 실행 (가장 추천)")
    print("   - Premiere Pro를 실행하고 프로젝트를 엽니다.")
    print("   - 메뉴에서 [File] -> [Scripts] -> [Run Script...]를 선택하고 생성된 'premiere_automation.jsx' 파일을 불러와 실행합니다.")
    
    print("\n방법 2. 외부 개발자 콘솔 및 확장 기능(CEP/UXP) 사용")
    print("   - VS Code에서 'Adobe ExtendScript Debugger' 확장을 설치합니다.")
    print("   - 디버거 대상으로 'Adobe Premiere Pro'를 선택한 후, .jsx 코드를 즉시 디버깅하고 핫 리로드 실행할 수 있습니다.")
    
    print("\n방법 3. 파이썬에서 간접 실행하기")
    print("   - 파이썬의 pywin32를 이용해 프리미어 프로에 ExtendScript 명령어를 전송할 수도 있습니다.")
    print("   (이 방법은 프리미어가 백그라운드 COM 링크를 열어둔 경우에 작동합니다.)")
    
    print("==================================================")

if __name__ == "__main__":
    print_premiere_guide()
