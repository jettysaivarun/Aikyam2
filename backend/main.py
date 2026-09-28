from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
import asyncio
from edge_loop import compute_kinematic_decoupling, solve_gibbs_wave_equation
from strategic_loop import calculate_walther_viscosity, strategic_economic_evaluation
from pinn_solver import compute_pinn_enthalpy_loss

app = FastAPI(title="AIKYAM Well-to-Surface Digital Twin API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StrategicPayload(BaseModel):
    wellhead_temp_c: float
    steam_injected_bbl: float
    cumulative_oil_bbl: float

class PinnPayload(BaseModel):
    radius_r: float
    time_t: float
    target_temp: float

# WebSocket Endpoint for Sub-Second Edge Safety Loop (10Hz simulation)
@app.websocket("/ws/edge-telemetry")
async def websocket_edge_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        angle = 0.0
        while True:
            angle = (angle + 15.0) % 360.0
            rod_load = float(17500 + 3500 * np.sin(np.radians(angle)) + np.random.normal(0, 300))
            surf_disp = float(1.5 * (1 - np.cos(np.radians(angle))) / 2)
            
            t_net = compute_kinematic_decoupling(angle, rod_load)
            dummy_load_array = np.array([rod_load * 0.9, rod_load, rod_load * 0.85])
            wave_analysis = solve_gibbs_wave_equation(dummy_load_array, surf_disp)
            
            payload = {
                "crank_angle": round(angle, 1),
                "polished_rod_load": round(rod_load, 1),
                "net_torque": round(t_net, 2),
                "wave_analysis": wave_analysis
            }
            
            await websocket.send_json(payload)
            await asyncio.sleep(0.1)  # 10 Hz edge tick rate
    except WebSocketDisconnect:
        print("Edge telemetry client disconnected.")

@app.post("/api/strategic/evaluate-well")
def evaluate_well_thermodynamics(data: StrategicPayload):
    viscosity = calculate_walther_viscosity(data.wellhead_temp_c)
    economics = strategic_economic_evaluation(data.steam_injected_bbl, data.cumulative_oil_bbl)
    return {"status": "success", "viscosity_cp": viscosity, "economics": economics}

@app.post("/api/strategic/pinn-solve")
def solve_pinn_physics(data: PinnPayload):
    return {"status": "success", "physics": compute_pinn_enthalpy_loss(data.radius_r, data.time_t, data.target_temp)}