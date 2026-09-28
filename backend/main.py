from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import asyncio
from edge_loop import compute_kinematic_decoupling, solve_gibbs_wave_equation
from strategic_loop import calculate_walther_viscosity, strategic_economic_evaluation
from pinn_solver import compute_pinn_enthalpy_loss

app = FastAPI(title="AIKYAM Digital Twin API", version="3.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StrategicPayload(BaseModel):
    cycle_phase: str = "Production"
    wellhead_temp_c: float
    steam_injected_bbl: float
    cumulative_oil_bbl: float

class PinnPayload(BaseModel):
    radius_r: float
    time_t: float
    target_temp: float

# Multi-well dynamic telemetry simulation over WebSocket
@app.websocket("/ws/edge-telemetry")
async def websocket_edge_telemetry(websocket: WebSocket, well_id: str = Query("BGW-01")):
    await websocket.accept()
    try:
        angle = 0.0
        # Well-specific baseline multipliers
        multiplier = 1.0 if well_id == "BGW-01" else (1.15 if well_id == "BGW-02" else 0.9)
        while True:
            angle = (angle + 15.0) % 360.0
            rod_load = float((17500 * multiplier) + 3500 * np.sin(np.radians(angle)) + np.random.normal(0, 250))
            surf_disp = float(1.5 * (1 - np.cos(np.radians(angle))) / 2)
            
            t_net = compute_kinematic_decoupling(angle, rod_load)
            dummy_load_array = np.array([rod_load * 0.9, rod_load, rod_load * 0.85])
            wave_analysis = solve_gibbs_wave_equation(dummy_load_array, surf_disp)
            
            payload = {
                "well_id": well_id,
                "crank_angle": round(angle, 1),
                "polished_rod_load": round(rod_load, 1),
                "net_torque": round(t_net, 2),
                "wave_analysis": wave_analysis,
                "timestamp": asyncio.get_event_loop().time()
            }
            
            await websocket.send_json(payload)
            await asyncio.sleep(0.1)  # 10 Hz edge tick rate
    except WebSocketDisconnect:
        print(f"Client disconnected from well {well_id}")

@app.get("/api/fleet/summary")
def get_fleet_summary():
    return {
        "active_wells": 3,
        "field_name": "Baghewala Heavy Oil Field, Rajasthan",
        "wells": [
            {"id": "BGW-01", "status": "Optimal", "temp_c": 68.5, "isor": 2.8, "viscosity_cp": 5400},
            {"id": "BGW-02", "status": "Thermal Injection Active", "temp_c": 79.2, "isor": 3.4, "viscosity_cp": 1200},
            {"id": "BGW-03", "status": "Rod Floating Warning", "temp_c": 52.0, "isor": 4.1, "viscosity_cp": 18500}
        ]
    }

@app.post("/api/strategic/evaluate-well")
def evaluate_well_thermodynamics(data: StrategicPayload):
    viscosity = calculate_walther_viscosity(data.wellhead_temp_c)
    economics = strategic_economic_evaluation(data.steam_injected_bbl, data.cumulative_oil_bbl)
    
    # Map recommendations according to the cycle phase and economics
    field_action = economics.get("recommendation", "Continue Production Phase (Puff)")
    if data.cycle_phase == "Injection" and data.wellhead_temp_c > 250:
        field_action = "Steam Injection Threshold Reached. Transition to Soak Phase."
    elif data.cycle_phase == "Production" and economics.get("isor", 0) > 4.0:
        field_action = "High ISOR detected. Schedule next CSS Injection (Huff)."

    return {
        "heavy_oil_viscosity_cp": round(float(viscosity), 1),
        "isor": economics.get("isor", 0.0),
        "field_action": field_action
    }

@app.post("/api/strategic/pinn-solve")
def solve_pinn_physics(data: PinnPayload):
    return {"status": "success", "physics": compute_pinn_enthalpy_loss(data.radius_r, data.time_t, data.target_temp)}