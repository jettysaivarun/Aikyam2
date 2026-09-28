import numpy as np

def compute_kinematic_decoupling(crank_angle_deg, polished_rod_load, structural_unbalance=1500.0):
    theta = np.radians(crank_angle_deg)
    tf_theta = 1.2 + 0.3 * np.sin(theta)
    counterweight_moment = 2000.0 * np.cos(theta)
    t_net = (polished_rod_load - structural_unbalance) * tf_theta - counterweight_moment
    return t_net

def generate_dynamometer_card_points():
    """
    Generates a full stroke cycle of displacement and load coordinates 
    for rendering pump performance cards.
    """
    strokes = np.linspace(0, 2 * np.pi, 30)
    # Surface card loop polygon
    disp = 1.5 * (1 - np.cos(strokes)) / 2
    load = 15000 + 5000 * np.sin(strokes) + np.random.normal(0, 200, len(strokes))
    
    card_points = [{"displacement": round(float(d), 3), "load": round(float(l), 2)} for d, l in zip(disp, load)]
    return card_points

def solve_gibbs_wave_equation(surface_load, surface_disp, depth_L=600.0, nodes=50):
    c_damping = 150.0  # Viscous hydraulic shear stress for 10,000 cP crude[cite: 1]
    downhole_load = surface_load * np.exp(-0.0001 * c_damping * depth_L)
    is_rod_floating = np.any(downhole_load <= 0.0)
    vdss_throttle_factor = 0.6 if is_rod_floating else 1.0  # 40% downstroke speed reduction[cite: 1]
    
    return {
        "downhole_load_peak": float(np.max(downhole_load)),
        "downhole_load_min": float(np.min(downhole_load)),
        "is_rod_floating": bool(is_rod_floating),
        "vdss_throttle_factor": float(vdss_throttle_factor),
        "dynamometer_card": generate_dynamometer_card_points()
    }