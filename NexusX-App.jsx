import { useState, useEffect } from 'react';

// Section Container Component - Solves the scaling/hierarchy issue
const SectionContainer = ({ title, children, isLocked }) => (
  <div className="flex flex-col min-w-[300px] border border-zinc-700 rounded-lg overflow-hidden bg-zinc-900/50">
    {/* Subheader - flex-shrink-0 prevents squashing */}
    <div className={`flex-shrink-0 px-4 py-2 border-b border-zinc-700 ${
      isLocked ? 'bg-zinc-800' : 'bg-zinc-800/80 border-l-2 border-l-cyan-500'
    }`}>
      <h3 className={`font-mono text-xs md:text-sm uppercase tracking-wider truncate ${
        isLocked ? 'text-zinc-500' : 'text-cyan-400'
      }`}>
        {title}
      </h3>
    </div>
    {/* Content - flex-1 allows growth */}
    <div className="flex-1 p-4 gap-y-4 flex flex-col">
      {children}
    </div>
  </div>
);

// Setting Row Component - grid-cols-[1fr_auto] alignment
const SettingRow = ({ label, value, children, isLocked }) => (
  <div className="grid grid-cols-[1fr_auto] gap-4 items-center min-h-[32px]">
    <span className={`font-mono text-xs md:text-sm truncate ${
      isLocked ? 'text-zinc-600' : 'text-zinc-300'
    }`}>
      {label}
    </span>
    <div className="flex items-center gap-2">
      {children || (
        <span className={`font-mono text-xs md:text-sm ${
          isLocked ? 'text-zinc-500' : 'text-cyan-300'
        }`}>
          {value}
        </span>
      )}
    </div>
  </div>
);

// Status Indicator Component
const StatusIndicator = ({ status, label }) => {
  const colors = {
    ok: 'bg-emerald-500 shadow-emerald-500/50',
    warning: 'bg-amber-500 shadow-amber-500/50',
    error: 'bg-red-500 shadow-red-500/50',
    offline: 'bg-zinc-600'
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full shadow-lg ${colors[status] || colors.offline}`} />
      <span className="font-mono text-xs text-zinc-400">{label}</span>
    </div>
  );
};

// Lock/Unlock Icon
const LockIcon = ({ locked }) => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {locked ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    )}
  </svg>
);

// Select Input Component
const ConfigSelect = ({ options, value, onChange, isLocked }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    disabled={isLocked}
    className={`font-mono text-xs md:text-sm px-2 py-1 rounded border ${
      isLocked
        ? 'bg-zinc-800 border-zinc-700 text-zinc-600 cursor-not-allowed'
        : 'bg-zinc-800 border-cyan-500/50 text-cyan-300 cursor-pointer hover:border-cyan-400'
    }`}
  >
    {options.map(opt => (
      <option key={opt} value={opt}>{opt}</option>
    ))}
  </select>
);

// Slider Input Component
const ConfigSlider = ({ min, max, value, onChange, unit, isLocked }) => (
  <div className="flex items-center gap-2">
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={isLocked}
      className={`w-20 h-1 rounded-lg appearance-none cursor-pointer ${
        isLocked ? 'bg-zinc-700' : 'bg-cyan-500/30 accent-cyan-500'
      }`}
    />
    <span className={`font-mono text-xs min-w-[48px] text-right ${
      isLocked ? 'text-zinc-600' : 'text-cyan-300'
    }`}>
      {value}{unit}
    </span>
  </div>
);

// Main Application
export default function App() {
  // Global Lock State
  const [isLocked, setIsLocked] = useState(true);

  // Configuration State
  const [config, setConfig] = useState({
    clockSource: 'Internal',
    sdiLevel: 'Level A',
    frameRate: '59.94',
    fanProfile: 'Auto',
    fanSpeed: 65,
    outputFormat: '4K UHD',
    colorSpace: 'BT.2020'
  });

  // Telemetry State (Simulated)
  const [telemetry, setTelemetry] = useState({
    voltage: 12.0,
    cpuTemp: 45,
    gpuTemp: 52,
    fanRPM: 2400,
    syncStatus: 'ok',
    signalLock: true,
    uptime: 0
  });

  // Telemetry Simulation Effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetry(prev => ({
        voltage: 11.8 + Math.random() * 0.4,
        cpuTemp: 42 + Math.random() * 8,
        gpuTemp: 48 + Math.random() * 10,
        fanRPM: 2200 + Math.floor(Math.random() * 400),
        syncStatus: Math.random() > 0.05 ? 'ok' : 'warning',
        signalLock: Math.random() > 0.02,
        uptime: prev.uptime + 1
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Format uptime
  const formatUptime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`min-h-screen bg-zinc-950 text-zinc-100 font-sans transition-colors duration-300 ${
      isLocked ? '' : 'ring-1 ring-inset ring-cyan-500/20'
    }`}>

      {/* Master Status Bar */}
      <header className={`sticky top-0 z-50 border-b px-4 py-3 backdrop-blur-sm ${
        isLocked
          ? 'bg-zinc-900/95 border-zinc-800'
          : 'bg-zinc-900/90 border-cyan-500/30'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded border-2 flex items-center justify-center font-mono font-bold text-sm ${
              isLocked
                ? 'border-zinc-600 text-zinc-500'
                : 'border-cyan-500 text-cyan-400'
            }`}>
              NX
            </div>
            <div>
              <h1 className={`font-mono text-sm md:text-base font-semibold tracking-wide ${
                isLocked ? 'text-zinc-400' : 'text-zinc-100'
              }`}>
                NEXUS-X CONFIGURATOR
              </h1>
              <p className="font-mono text-xs text-zinc-600">
                Industrial Hardware Interface v2.0
              </p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="hidden md:flex items-center gap-6">
            <StatusIndicator status={telemetry.syncStatus} label="SYNC" />
            <StatusIndicator status={telemetry.signalLock ? 'ok' : 'error'} label="SIGNAL" />
            <StatusIndicator status={telemetry.cpuTemp > 70 ? 'warning' : 'ok'} label="THERMAL" />
            <div className="font-mono text-xs text-zinc-500">
              UP {formatUptime(telemetry.uptime)}
            </div>
          </div>

          {/* Lock Toggle */}
          <button
            onClick={() => setIsLocked(!isLocked)}
            className={`flex items-center gap-2 px-4 py-2 rounded border font-mono text-xs uppercase tracking-wider transition-all ${
              isLocked
                ? 'border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-400'
                : 'border-cyan-500 text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20'
            }`}
          >
            <LockIcon locked={isLocked} />
            {isLocked ? 'Monitor' : 'Edit'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">

          {/* Telemetry Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <SectionContainer title="Live Telemetry" isLocked={isLocked}>
              <SettingRow label="Voltage" isLocked={isLocked}>
                <span className={`font-mono text-xs md:text-sm tabular-nums ${
                  telemetry.voltage < 11.5 ? 'text-red-400' : isLocked ? 'text-zinc-500' : 'text-emerald-400'
                }`}>
                  {telemetry.voltage.toFixed(2)}V
                </span>
              </SettingRow>

              <SettingRow label="CPU Temp" isLocked={isLocked}>
                <span className={`font-mono text-xs md:text-sm tabular-nums ${
                  telemetry.cpuTemp > 70 ? 'text-amber-400' : isLocked ? 'text-zinc-500' : 'text-cyan-300'
                }`}>
                  {telemetry.cpuTemp.toFixed(1)}°C
                </span>
              </SettingRow>

              <SettingRow label="GPU Temp" isLocked={isLocked}>
                <span className={`font-mono text-xs md:text-sm tabular-nums ${
                  telemetry.gpuTemp > 75 ? 'text-amber-400' : isLocked ? 'text-zinc-500' : 'text-cyan-300'
                }`}>
                  {telemetry.gpuTemp.toFixed(1)}°C
                </span>
              </SettingRow>

              <SettingRow label="Fan RPM" isLocked={isLocked}>
                <span className={`font-mono text-xs md:text-sm tabular-nums ${
                  isLocked ? 'text-zinc-500' : 'text-cyan-300'
                }`}>
                  {telemetry.fanRPM}
                </span>
              </SettingRow>

              <div className="pt-2 border-t border-zinc-700/50 mt-2">
                <SettingRow label="Signal Lock" isLocked={isLocked}>
                  <span className={`font-mono text-xs uppercase ${
                    telemetry.signalLock
                      ? (isLocked ? 'text-zinc-500' : 'text-emerald-400')
                      : 'text-red-400'
                  }`}>
                    {telemetry.signalLock ? 'Locked' : 'No Lock'}
                  </span>
                </SettingRow>
              </div>
            </SectionContainer>
          </aside>

          {/* Configuration Matrix */}
          <div className="flex-1 grid gap-4 md:gap-6 md:grid-cols-2">

            {/* Video Routing */}
            <SectionContainer title="Video Routing" isLocked={isLocked}>
              <SettingRow label="Output Format" isLocked={isLocked}>
                <ConfigSelect
                  options={['1080p', '4K UHD', '8K UHD']}
                  value={config.outputFormat}
                  onChange={(v) => updateConfig('outputFormat', v)}
                  isLocked={isLocked}
                />
              </SettingRow>

              <SettingRow label="Color Space" isLocked={isLocked}>
                <ConfigSelect
                  options={['BT.709', 'BT.2020', 'DCI-P3']}
                  value={config.colorSpace}
                  onChange={(v) => updateConfig('colorSpace', v)}
                  isLocked={isLocked}
                />
              </SettingRow>

              <SettingRow label="Frame Rate" isLocked={isLocked}>
                <ConfigSelect
                  options={['23.98', '24', '25', '29.97', '30', '50', '59.94', '60']}
                  value={config.frameRate}
                  onChange={(v) => updateConfig('frameRate', v)}
                  isLocked={isLocked}
                />
              </SettingRow>
            </SectionContainer>

            {/* Signal Configuration */}
            <SectionContainer title="Signal Configuration" isLocked={isLocked}>
              <SettingRow label="Clock Source" isLocked={isLocked}>
                <ConfigSelect
                  options={['Internal', 'External', 'Genlock']}
                  value={config.clockSource}
                  onChange={(v) => updateConfig('clockSource', v)}
                  isLocked={isLocked}
                />
              </SettingRow>

              <SettingRow label="SDI Level" isLocked={isLocked}>
                <ConfigSelect
                  options={['Level A', 'Level B']}
                  value={config.sdiLevel}
                  onChange={(v) => updateConfig('sdiLevel', v)}
                  isLocked={isLocked}
                />
              </SettingRow>
            </SectionContainer>

            {/* Thermal Management */}
            <SectionContainer title="Thermal Management" isLocked={isLocked}>
              <SettingRow label="Fan Profile" isLocked={isLocked}>
                <ConfigSelect
                  options={['Silent', 'Auto', 'Performance', 'Maximum']}
                  value={config.fanProfile}
                  onChange={(v) => updateConfig('fanProfile', v)}
                  isLocked={isLocked}
                />
              </SettingRow>

              <SettingRow label="Target Speed" isLocked={isLocked}>
                <ConfigSlider
                  min={30}
                  max={100}
                  value={config.fanSpeed}
                  onChange={(v) => updateConfig('fanSpeed', v)}
                  unit="%"
                  isLocked={isLocked}
                />
              </SettingRow>
            </SectionContainer>

            {/* System Status */}
            <SectionContainer title="System Status" isLocked={isLocked}>
              <SettingRow label="Device ID" value="NX-7420-A" isLocked={isLocked} />
              <SettingRow label="Firmware" value="v3.2.1" isLocked={isLocked} />
              <SettingRow label="Mode" isLocked={isLocked}>
                <span className={`font-mono text-xs uppercase px-2 py-0.5 rounded ${
                  isLocked
                    ? 'bg-zinc-800 text-zinc-500'
                    : 'bg-cyan-500/20 text-cyan-400'
                }`}>
                  {isLocked ? 'Read Only' : 'Read/Write'}
                </span>
              </SettingRow>
            </SectionContainer>

          </div>
        </div>
      </main>

      {/* Footer Status */}
      <footer className={`fixed bottom-0 left-0 right-0 border-t px-4 py-2 ${
        isLocked
          ? 'bg-zinc-900/95 border-zinc-800'
          : 'bg-zinc-900/90 border-cyan-500/30'
      }`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="font-mono text-xs text-zinc-600">
            NEXUS-X Industrial Controller
          </span>
          <div className="flex items-center gap-4">
            <span className={`font-mono text-xs ${
              isLocked ? 'text-zinc-600' : 'text-cyan-500'
            }`}>
              {isLocked ? 'MONITOR MODE' : 'EDIT MODE ACTIVE'}
            </span>
            <div className={`w-2 h-2 rounded-full ${
              isLocked ? 'bg-zinc-600' : 'bg-cyan-500 animate-pulse'
            }`} />
          </div>
        </div>
      </footer>

    </div>
  );
}
