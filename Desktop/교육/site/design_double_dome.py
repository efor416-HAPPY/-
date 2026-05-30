# -*- coding: utf-8 -*-
"""
Double-Layered Hexagonal Dome Mathematical Modeling & Thermal Calculations
This script calculates the structural and thermodynamic properties of a 10m double-skin dome,
including the inner dome volume, outer dome volume, air layer volume, required external curtain area,
and compares heat loss (U-value) between single-pane and double-skin configurations.
"""

import math
import sys
import io

# Force UTF-8 encoding for standard output on Windows
if sys.platform.startswith('win'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def calculate_dome_properties(inner_radius=5.0, air_gap=0.12, curtain_coverage_ratio=0.85):
    # 1. Geometry Calculations
    outer_radius = inner_radius + air_gap
    
    # Hemisphere Volume: (2/3) * pi * R^3
    inner_volume = (2.0 / 3.0) * math.pi * (inner_radius ** 3)
    outer_volume = (2.0 / 3.0) * math.pi * (outer_radius ** 3)
    air_layer_volume = outer_volume - inner_volume
    
    # Hemisphere Surface Area: 2 * pi * R^2
    inner_surface_area = 2 * math.pi * (inner_radius ** 2)
    outer_surface_area = 2 * math.pi * (outer_radius ** 2)
    
    # Curtain required area (covering specified ratio of the dome surface)
    curtain_area = outer_surface_area * curtain_coverage_ratio
    
    # 2. Thermodynamic Calculations (U-Value)
    # Thermal resistance values (R = d / k) in m^2*K/W
    # Thermal conductivity of materials (k in W/m*K)
    k_glass = 1.05       # Standard soda-lime glass
    k_curtain = 0.04     # Multi-layer insulating fabric
    
    # Thicknesses (d in meters)
    d_glass_pane = 0.006          # 6mm glass pane
    d_curtain = 0.003             # 3mm thermal curtain
    
    # Boundary air film resistances (R_si: inside, R_se: outside)
    r_si = 0.13  # Standard indoor boundary layer resistance
    r_se = 0.04  # Standard outdoor boundary layer resistance (windy condition)
    
    # Scenario A: Single-layered glass dome
    # R_total = r_si + (d_glass / k_glass) + r_se
    r_single = r_si + (d_glass_pane / k_glass) + r_se
    u_single = 1.0 / r_single
    
    # Scenario B: Double-layered skin with sealed air gap (No curtain deployed)
    # Inner glass (6mm) + Air Gap (120mm) + Outer glass (6mm)
    # In practice, air gap thermal resistance is capped due to convection if it's too wide.
    # Standard ISO 6946 value for unventilated air cavity of 100mm+ is approx R = 0.18 m^2*K/W.
    # Let's use the standard air cavity resistance rather than raw conduction for accuracy.
    r_air_cavity = 0.18 
    r_double = r_si + (d_glass_pane / k_glass) + r_air_cavity + (d_glass_pane / k_glass) + r_se
    u_double = 1.0 / r_double
    
    # Scenario C: Double-layered skin WITH thermal curtain deployed (Winter night mode)
    # R_total = R_double + (d_curtain / k_curtain)
    r_curtain_material = d_curtain / k_curtain
    r_double_with_curtain = r_double + r_curtain_material
    u_double_with_curtain = 1.0 / r_double_with_curtain
    
    # 3. Heat Loss Comparison (for a delta T of 30 Kelvin: e.g. -10C outside, 20C inside)
    delta_t = 30.0
    heat_loss_single = u_single * inner_surface_area * delta_t
    heat_loss_double = u_double * inner_surface_area * delta_t
    heat_loss_double_curtain = u_double_with_curtain * inner_surface_area * delta_t
    
    energy_saving_double = (1 - (heat_loss_double / heat_loss_single)) * 100
    energy_saving_curtain = (1 - (heat_loss_double_curtain / heat_loss_single)) * 100

    # Print results
    border = "======================================================================"
    print(border)
    print("        이중 구조 육각형 돔 기하학 및 열역학 파라미터 해석 보고서")
    print(border)
    print("1. 구조 기하학 정보")
    print(f"  - 내부 돔 반경 (Inner Radius): {inner_radius:.2f} m (지름 {inner_radius*2:.1f} m)")
    print(f"  - 중간 공기층 두께 (Air Gap): {air_gap*1000:.1f} mm ({air_gap:.3f} m)")
    print(f"  - 외부 돔 반경 (Outer Radius): {outer_radius:.2f} m (지름 {outer_radius*2:.1f} m)")
    print(f"  - 내부 돔 표면적 (Surface Area): {inner_surface_area:.2f} m²")
    print(f"  - 외부 돔 표면적 (Surface Area): {outer_surface_area:.2f} m²")
    print(f"  - 내부 체적 (Inner Volume): {inner_volume:.2f} m³")
    print(f"  - 외부 체적 (Outer Volume): {outer_volume:.2f} m³")
    print(f"  - 단열 공기층 체적 (Air Layer Volume): {air_layer_volume:.2f} m³")
    print(f"  - 외부 단열 커튼 소요 면적 (Curtain Area, 85% 피복): {curtain_area:.2f} m²")
    print("----------------------------------------------------------------------")
    print("2. 열관류율 (U-Value) 비교 (단위: W/m²·K) - 낮을수록 단열 우수")
    print(f"  - [기존] 단층 외피 구조: {u_single:.3f} W/m²·K")
    print(f"  - [이중] 이중 겹 + 단열 공기층 구조: {u_double:.3f} W/m²·K")
    print(f"  - [최종] 이중 겹 + 공기층 + 외부 단열커튼 작동 시: {u_double_with_curtain:.3f} W/m²·K")
    print("----------------------------------------------------------------------")
    print(f"3. 겨울철 열손실 차단 성능 시뮬레이션 (실내외 온도차 ΔT = {delta_t}°C 기준)")
    print(f"  - [기존] 단층 돔 총 열손실량: {heat_loss_single/1000:.2f} kW")
    print(f"  - [이중] 이중 돔 총 열손실량: {heat_loss_double/1000:.2f} kW")
    print(f"  - [최종] 단열커튼 작동 시 열손실량: {heat_loss_double_curtain/1000:.2f} kW")
    print(f"  - 단열 공기층 도입에 따른 에너지 절감율: {energy_saving_double:.1f}%")
    print(f"  - 외부 단열커튼 결합 시 최종 에너지 절감율: {energy_saving_curtain:.1f}%")
    print(border)

if __name__ == "__main__":
    calculate_dome_properties()
