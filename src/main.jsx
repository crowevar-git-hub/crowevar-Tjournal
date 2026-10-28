import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { RBACSecurityProvider } from './rbac.jsx'
import { SniperSchedulePanel } from './sniperSchedule.jsx'
import { TradeAtlasIntelligenceSuite } from './intelligence.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RBACSecurityProvider>
      <SniperSchedulePanel />
      <App />
      <TradeAtlasIntelligenceSuite />
    </RBACSecurityProvider>
  </StrictMode>,
)