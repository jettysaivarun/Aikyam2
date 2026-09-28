import { useState, useEffect } from 'react';
import './App.css';

const API_BASE = "http://127.0.0.1:8001/api";
const WS_URL = "ws://localhost:8001/ws/edge-telemetry";

function App() {
  // Live Edge WebSocket State
  const [wsData, setWsData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Strategic Loop State
  const [wellTemp, setWellTemp] = useState(65);
  const [steamInjected, setSteamInjected] = useState(3500);
  const [cumOil, setCumOil] = useState(1200);
  const [strategicResult, setStrategicResult] = useState(null);

  // PINN State
  const [radiusR, setRadiusR] = useState(2.5);
  const [timeT, setTimeT] = useState(30);
  const [pinnResult, setPinnResult] = useState(null);

  // Establish WebSocket connection for Loop 1
  useEffect(() => {
    let ws = new WebSocket(WS_URL);
    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      setWsData(JSON.parse(event.data));
    };
    ws.onclose = () => {
      setIsConnected(false);
      setTimeout(() => {
        // Auto-reconnect logic
      }, 3000);
    };
    return () => ws.close();
  }, []);

  const runStrategicEvaluation = async () => {
    const res = await fetch(`${API_BASE}/strategic/evaluate-well`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wellhead_temp_c: parseFloat(wellTemp), steam_injected_bbl: parseFloat(steamInjected), cumulative_oil_bbl: parseFloat(cumOil) })
    });
    setStrategicResult(await res.json());
  };

  const runPinnSolver = async () => {
    const res = await fetch(`${API_BASE}/strategic/pinn-solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ radius_r: parseFloat(radiusR), time_t: parseFloat(timeT), target_temp: parseFloat(wellTemp) })
    });
    setPinnResult(await res.json());
  };

  // Generate SVG path string from dynamometer card points
  const renderCardPath = (cardPoints) => {
    if (!cardPoints || cardPoints.length === 0) return "";
    return cardPoints.map((pt, idx) => {
      // Scale coordinates to fit 250x150 SVG viewport
      const x = pt.displacement * 150 + 20;
      const y = 140 - (pt.load / 25000) * 120;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  };

  return (
    <div className="container">
      <header>
        <h1>AIKYAM: Baghewala Field Digital Twin</h1>
        <p>Dual-Loop Hybrid-Edge Architecture | Industrial WebSocket & PINN Engine</p>
        <span className={isConnected ? "badge-green" : "badge-red"}>
          {isConnected ? "🟢 Edge WebSocket Connected (10Hz Active)" : "🔴 Disconnected"}
        </span>
      </header>

      <main className="grid">
        {/* Loop 1: Real-Time Edge Safety & SVG Card */}
        <section className="card">
          <h2>Loop 1: Sub-Second Edge Safety & Pump Card</h2>
          {wsData ? (
            <div>
              <p><b>Crank Angle:</b> {wsData.crank_angle}° | <b>Load:</b> {wsData.polished_rod_load} lbs</p>
              <p><b>Status:</b> <span className={wsData.wave_analysis.is_rod_floating ? "badge-red" : "badge-green"}>
                {wsData.wave_analysis.is_rod_floating ? "⚠️ ROD FLOATING DETECTED (VDSS Throttled)" : "NORMAL OPERATION"}
              </span></p>
              <p><b>VDSS Throttle Factor:</b> {wsData.wave_analysis.vdss_throttle_factor}</p>
              
              <div className="card-visualizer">
                <p className="sub-title">Live Surface/Downhole Dynamometer Card</p>
                <svg width="280" height="160" className="dyno-svg">
                  <rect width="280" height="160" fill="#0f172a" rx="6" />
                  <line x1="20" y1="140" x2="260" y2="140" stroke="#475569" strokeWidth="1" />
                  <line x1="20" y1="20" x2="20" y2="140" stroke="#475569" strokeWidth="1" />
                  <path d={renderCardPath(wsData.wave_analysis.dynamometer_card)} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
          ) : <p>Connecting to Edge VFD Telemetry Stream...</p>}
        </section>

        {/* PINN Multiphase Enthalpy Solver */}
        <section className="card">
          <h2>Strategic PINN Thermodynamic Enthalpy Solver</h2>
          <div className="form-group">
            <label>Radial Distance (m): <input type="number" value={radiusR} onChange={e => setRadiusR(e.target.value)} /></label>
            <label>Time Elapsed (Days): <input type="number" value={timeT} onChange={e => setTimeT(e.target.value)} /></label>
            <button onClick={runPinnSolver}>Compute PINN Enthalpy PDE</button>
          </div>
          {pinnResult && (
            <div className="result-box">
              <p><b>Status:</b> {pinnResult.physics.pinn_status}</p>
              <p><b>Predicted Temp:</b> {pinnResult.physics.predicted_temp_at_radius} °C</p>
              <p><b>PDE Residual Loss:</b> {pinnResult.physics.pde_residual_loss}</p>
            </div>
          )}
        </section>

        {/* Loop 2: Strategic Economics */}
        <section className="card">
          <h2>Loop 2: Strategic Economics & Viscosity</h2>
          <div className="form-group">
            <label>Wellhead Temp (°C): <input type="number" value={wellTemp} onChange={e => setWellTemp(e.target.value)} /></label>
            <label>Steam Injected (bbl): <input type="number" value={steamInjected} onChange={e => setSteamInjected(e.target.value)} /></label>
            <label>Cumulative Oil (bbl): <input type="number" value={cumOil} onChange={e => setCumOil(e.target.value)} /></label>
            <button onClick={runStrategicEvaluation}>Evaluate Well Economics</button>
          </div>
          {strategicResult && (
            <div className="result-box">
              <p><b>Viscosity (Walther Model):</b> {strategicResult.viscosity_cp.toFixed(1)} cP</p>
              <p><b>ISOR Ratio:</b> {strategicResult.economics.isor}</p>
              <p><b>Action:</b> {strategicResult.economics.recommendation}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;