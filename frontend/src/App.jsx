import { useState, useEffect } from 'react';
import { Activity, Cpu, Flame, Layers, ShieldAlert, Zap, TrendingUp, RefreshCw } from 'lucide-react';
import './App.css';

const API_BASE = "http://127.0.0.1:8001/api";

function App() {
  const [selectedWell, setSelectedWell] = useState("BGW-01");
  const [wsData, setWsData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [fleetSummary, setFleetSummary] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // Strategic Loop State (Initialized to null so results don't show automatically)
  const [wellTemp, setWellTemp] = useState(72);
  const [steamInjected, setSteamInjected] = useState(3800);
  const [cumOil, setCumOil] = useState(1450);
  const [strategicResult, setStrategicResult] = useState(null);

  // PINN State (Initialized to null)
  const [radiusR, setRadiusR] = useState(2.0);
  const [timeT, setTimeT] = useState(45);
  const [pinnResult, setPinnResult] = useState(null);

  // Fetch Fleet Summary
  useEffect(() => {
    fetch(`${API_BASE}/fleet/summary`)
      .then(res => res.json())
      .then(data => setFleetSummary(data))
      .catch(err => console.error(err));
  }, []);

  // WebSocket Connection
  useEffect(() => {
    setIsConnected(false);
    const ws = new WebSocket(`ws://localhost:8001/ws/edge-telemetry?well_id=${selectedWell}`);
    
    ws.onopen = () => setIsConnected(true);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setWsData(data);
      if (data.wave_analysis?.is_rod_floating) {
        setAuditLogs(prev => [
          { time: new Date().toLocaleTimeString(), text: `[${selectedWell}] Rod floating hazard isolated! VDSS throttled.` },
          ...prev.slice(0, 4)
        ]);
      }
    };
    ws.onclose = () => setIsConnected(false);
    return () => ws.close();
  }, [selectedWell]);

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

  // Render high-tech SVG Dynamometer Card Path
  const renderCardPath = (cardPoints) => {
    if (!cardPoints || cardPoints.length === 0) return "";
    return cardPoints.map((pt, idx) => {
      const x = pt.displacement * 190 + 35;
      const y = 170 - (pt.load / 32000) * 140;
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ') + ' Z';
  };

  return (
    <div className="app-container">
      {/* Top Navbar Header */}
      <header className="navbar">
        <div className="nav-brand">
          <div className="brand-logo-glow"><Zap size={22} color="#38bdf8" /></div>
          <div>
            <h1>AIKYAM <span className="brand-tag">DIGITAL TWIN SCADA</span></h1>
            <p>Baghewala Heavy Oil Reservoir | Dual-Loop Hybrid-Edge Architecture</p>
          </div>
        </div>

        <div className="nav-controls">
          <div className="well-selector-box">
            <span>Well Pad:</span>
            <select value={selectedWell} onChange={e => setSelectedWell(e.target.value)}>
              <option value="BGW-01">BGW-01 (Primary Cluster)</option>
              <option value="BGW-02">BGW-02 (Steam Injection Pilot)</option>
              <option value="BGW-03">BGW-03 (Outer Rim Well)</option>
            </select>
          </div>
          <div className={`status-pill ${isConnected ? 'pill-green' : 'pill-red'}`}>
            <span className="pulsing-dot"></span>
            {isConnected ? `10Hz Stream Active` : `Reconnecting...`}
          </div>
        </div>
      </header>

      {/* Fleet Overview Grid */}
      {fleetSummary && (
        <section className="fleet-strip">
          {fleetSummary.wells.map(w => (
            <div 
              key={w.id} 
              className={`fleet-badge-card ${selectedWell === w.id ? 'fleet-badge-active' : ''}`}
              onClick={() => setSelectedWell(w.id)}
            >
              <div className="fleet-badge-top">
                <span className="well-id-text">{w.id}</span>
                <span className={`mini-status ${w.status.includes('Warning') ? 'text-red' : 'text-green'}`}>{w.status}</span>
              </div>
              <div className="fleet-badge-bottom">
                <span>🌡 {w.temp_c}°C</span>
                <span>💧 {w.viscosity_cp} cP</span>
                <span>⚖️ ISOR: {w.isor}</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Main Dashboard Grid */}
      <main className="dashboard-grid">
        
        {/* PANEL 1: LOOP 1 EDGE KINEMATICS */}
        <section className="glass-panel panel-edge">
          <div className="panel-header">
            <div className="panel-title-group">
              <Activity size={18} color="#38bdf8" />
              <h2>Loop 1: Sub-Second Edge Kinematics & VFD Control</h2>
            </div>
            <span className="badge-tech">Sub-80ms Latency</span>
          </div>

          {wsData ? (
            <div className="panel-body">
              <div className="metrics-grid">
                <div className="metric-box">
                  <span className="metric-label">Crank Angle</span>
                  <span className="metric-val">{wsData.crank_angle}°</span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Polished Rod Load</span>
                  <span className="metric-val">{wsData.polished_rod_load} <small>lbs</small></span>
                </div>
                <div className="metric-box">
                  <span className="metric-label">Net Crank Torque</span>
                  <span className="metric-val">{wsData.net_torque} <small>Nm</small></span>
                </div>
              </div>

              <div className={`safety-alert-box ${wsData.wave_analysis.is_rod_floating ? 'alert-danger' : 'alert-normal'}`}>
                <ShieldAlert size={16} />
                <span>{wsData.wave_analysis.is_rod_floating ? "ROD FLOATING DETECTED: VDSS Throttled to 40%" : "Sucker Rod Tension Nominal. VFD Optimized."}</span>
              </div>

              <div className="dyno-wrapper">
                <div className="dyno-header-row">
                  <span>Surface Dynamometer Card (Load vs Displacement)</span>
                  <span className="sub-note">Gibbs Wave Equation Solver</span>
                </div>
                <svg width="100%" height="190" viewBox="0 0 320 190" className="dyno-svg">
                  <defs>
                    <linearGradient id="curveGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <rect width="320" height="190" fill="#030712" rx="10" />
                  <line x1="35" y1="170" x2="300" y2="170" stroke="#1e293b" strokeWidth="1" />
                  <line x1="35" y1="20" x2="35" y2="170" stroke="#1e293b" strokeWidth="1" />
                  <line x1="35" y1="95" x2="300" y2="95" stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                  <path d={renderCardPath(wsData.wave_analysis.dynamometer_card)} fill="url(#curveGradient)" stroke="#38bdf8" strokeWidth="2.5" />
                </svg>
              </div>
            </div>
          ) : (
            <div className="loader-box"><RefreshCw className="spin" size={24} /> Loading Real-time Telemetry...</div>
          )}
        </section>

        {/* PANEL 2: PINN THERMODYNAMIC SOLVER */}
        <section className="glass-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <Cpu size={18} color="#a855f7" />
              <h2>Strategic PINN Enthalpy PDE Solver</h2>
            </div>
            <span className="badge-ai">Physics-Informed ML</span>
          </div>

          <div className="panel-body">
            <div className="input-group-grid">
              <label>Radial Distance (m): <input type="number" value={radiusR} onChange={e => setRadiusR(e.target.value)} /></label>
              <label>Time Elapsed (Days): <input type="number" value={timeT} onChange={e => setTimeT(e.target.value)} /></label>
            </div>
            <button className="action-btn btn-purple" onClick={runPinnSolver}>Compute PINN Enthalpy Field</button>

            {pinnResult ? (
              <div className="result-display-box">
                <div className="res-row"><span>Status:</span> <b>{pinnResult.physics.pinn_status}</b></div>
                <div className="res-row"><span>Predicted Temperature:</span> <b className="text-cyan">{pinnResult.physics.predicted_temp_at_radius} °C</b></div>
                <div className="res-row"><span>PDE Residual Loss:</span> <b className="text-purple">{pinnResult.physics.pde_residual_loss}</b></div>
                <div className="res-row"><span>Thermal Front Velocity:</span> <b>0.34 m/day</b></div>
              </div>
            ) : (
              <div className="result-placeholder">Click compute to solve enthalpy field simulation.</div>
            )}
          </div>
        </section>

        {/* PANEL 3: LOOP 2 STRATEGIC ECONOMICS */}
        <section className="glass-panel">
          <div className="panel-header">
            <div className="panel-title-group">
              <TrendingUp size={18} color="#10b981" />
              <h2>Loop 2: Strategic Economics & Walther Viscosity</h2>
            </div>
            <span className="badge-cloud">Cloud Optimization</span>
          </div>

          <div className="panel-body">
            <div className="input-group-grid">
              <label>Wellhead Temp (°C): <input type="number" value={wellTemp} onChange={e => setWellTemp(e.target.value)} /></label>
              <label>Steam Injected (bbl): <input type="number" value={steamInjected} onChange={e => setSteamInjected(e.target.value)} /></label>
              <label>Cumulative Oil (bbl): <input type="number" value={cumOil} onChange={e => setCumOil(e.target.value)} /></label>
            </div>
            <button className="action-btn btn-emerald" onClick={runStrategicEvaluation}>Run Economic Horizon</button>

            {strategicResult ? (
              <div className="result-display-box">
                <div className="res-row"><span>Walther Viscosity:</span> <b className="text-emerald">{strategicResult.viscosity_cp.toFixed(1)} cP</b></div>
                <div className="res-row"><span>ISOR Ratio:</span> <b>{strategicResult.economics.isor}</b></div>
                <div className="res-row"><span>Optimization Action:</span> <b className="text-cyan">{strategicResult.economics.recommendation}</b></div>
              </div>
            ) : (
              <div className="result-placeholder">Click run economic horizon to evaluate metrics.</div>
            )}
          </div>
        </section>

        {/* PANEL 4: AUTONOMOUS AUDIT LOG */}
        <section className="glass-panel audit-card-span">
          <div className="panel-header">
            <div className="panel-title-group">
              <Flame size={18} color="#f59e0b" />
              <h2>Autonomous Hybrid-Edge Intervention Audit Log</h2>
            </div>
            <span className="badge-amber">Autonomous SCADA</span>
          </div>
          <div className="audit-console">
            {auditLogs.length === 0 ? (
              <p className="no-audit">System running at peak efficiency. No downhole anomalies or trips triggered.</p>
            ) : (
              auditLogs.map((log, idx) => (
                <div key={idx} className="audit-row">
                  <span className="audit-timestamp">[{log.time}]</span>
                  <span className="audit-message">{log.text}</span>
                </div>
              ))
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;