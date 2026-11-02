import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RBACSecurityProvider } from './rbac.jsx'
import { SniperSchedulePanel } from './sniperSchedule.jsx'
import { ForexFactoryCalendarPanel } from './forexFactoryCalendar.jsx'
import { TradeAtlasIntelligenceSuite } from './intelligence.jsx'
import { DemoAccountSuite } from './demoAccountPanel.jsx'

function MainLayout() {
  return (
    <RBACSecurityProvider>
      <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col">
        {/* Two-Column Layout: Main Dashboard on left, Schedule & Forex Factory News Sidebar on right */}
        <div className="max-w-[1560px] mx-auto w-full px-3 sm:px-6 py-4 grid grid-cols-1 xl:grid-cols-[1fr_370px] gap-6 items-start">
          <div className="min-w-0 space-y-6">
            <App />
            <DemoAccountSuite />
            <TradeAtlasIntelligenceSuite />
          </div>
          <div className="xl:sticky xl:top-16 space-y-4">
            <div className="text-[11px] uppercase tracking-wider font-extrabold text-cyan-400 px-1 flex items-center justify-between">
              <span>🎯 Live Trading Schedule &amp; News</span>
              <span className="text-slate-500 font-mono font-normal">5M Killzones + FF Impact</span>
            </div>
            <SniperSchedulePanel />
            <ForexFactoryCalendarPanel />
          </div>
        </div>
      </div>
    </RBACSecurityProvider>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MainLayout />
  </StrictMode>,
)