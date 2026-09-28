import numpy as np

def calculate_walther_viscosity(temp_celsius):
    """
    Maps heavy crude kinematic viscosity using the Walther-ASTM D341 equation[cite: 1].
    """
    T_kelvin = temp_celsius + 273.15
    A, B, lambda_val = 10.2, 3.8, 0.7  # Empirical constants for Baghewala dead crude rheology[cite: 1]
    log_v = A - B * np.log10(T_kelvin)
    kinematic_viscosity = 10**(10**log_v) - lambda_val
    return max(float(kinematic_viscosity), 10.0)

def strategic_economic_evaluation(cycle_steam_injected_bbl, cumulative_oil_bbl, current_oil_price_usd=75.0):
    """
    Evaluates Instantaneous Steam-Oil Ratio (ISOR) and operational cash flow margins[cite: 1].
    """
    isor = cycle_steam_injected_bbl / max(cumulative_oil_bbl, 1.0)
    
    q_oil = 45.0   # barrels/day
    q_water = 30.0 # barrels/day
    c_lifting = 350.0 
    c_treatment = q_water * 2.5
    c_fuel = 120.0
    
    daily_margin = (current_oil_price_usd * q_oil) - (c_lifting + c_treatment + c_fuel)
    is_economic_cutoff = daily_margin <= 0 or isor > 6.0
    
    return {
        "isor": round(float(isor), 2),
        "daily_margin_usd": round(float(daily_margin), 2),
        "economic_cutoff_triggered": bool(is_economic_cutoff),
        "recommendation": "Initiate Restimulation / Mobile Steam Generator Dispatch" if is_economic_cutoff else "Continue Production Phase"
    }