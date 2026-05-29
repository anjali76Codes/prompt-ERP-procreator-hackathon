import React, { useEffect, useState } from 'react';
import {
  Cpu, Maximize2, Minimize2,
  PanelRightClose, PanelRightOpen,
} from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ChatPanel } from '../components/automation/ChatPanel';
import { RecentActivityRail } from '../components/automation/RecentActivityRail';
import { useAutomationEngine } from '../lib/automation/engine';
import { useSidebarState } from '../lib/useSidebarState';

/**
 * Conversational AI workflow assistant.
 *
 * Two render modes:
 *   - Normal: wrapped in AppLayout (sidebar + page header), chat takes the
 *     centre column, Recent Activity rail on the right.
 *   - Maximized: a `position: fixed` overlay covering the ENTIRE viewport
 *     (over the app sidebar, over the page header, over everything). Used
 *     when the user clicks the fullscreen icon.
 */
export const ChatInterface: React.FC = () => {
  const engine = useAutomationEngine();
  const [railOpen, setRailOpen] = useState(true);
  const [maximized, setMaximized] = useState(false);
  const { setCollapsed } = useSidebarState();

  // Lock body scroll while the overlay is up so the page underneath doesn't
  // peek through scroll gestures.
  useEffect(() => {
    if (!maximized) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [maximized]);

  const toggleMaximize = () => {
    setMaximized(v => {
      const next = !v;
      // Collapse the app sidebar so it stays collapsed when we exit fullscreen
      // (otherwise the layout shifts under you).
      setCollapsed(next);
      return next;
    });
  };

  /**
   * Edge-to-edge chat layout (ChatGPT-style). Same structure in both normal
   * and maximized modes — the only difference is whether we render the page
   * inside AppLayout or as a fixed overlay.
   */
  const chatSurface = (
    <div style={{
      display: 'flex', gap: 0, alignItems: 'stretch',
      width: '100%', height: '100%', overflow: 'hidden',
    }}>
      <div style={{
        flex: 1, minWidth: 0, height: '100%',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <ChatPanel
          messages={engine.messages}
          split={false}
          isGenerating={engine.isGenerating}
          onSend={engine.send}
          onStop={engine.stop}
          onPermissionResponse={engine.sendPermissionResponse}
          onInsightAction={() => engine.highlightStudents()}
        />
      </div>

      {railOpen && (
        <div style={{
          width: 300, flexShrink: 0,
          borderLeft: '1px solid #E2E8F0',
          background: '#FAFBFC',
          padding: '0.75rem',
          overflowY: 'auto',
        }}>
          <RecentActivityRail
            sessions={engine.sessions}
            activeSessionId={engine.activeSessionId}
            onSelect={(id) => { void engine.loadSession(id); }}
            onNew={engine.newChat}
            onDelete={(id) => { void engine.removeSession(id); }}
          />
        </div>
      )}
    </div>
  );

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        type="button"
        onClick={() => setRailOpen(v => !v)}
        title={railOpen ? 'Hide recent activity' : 'Show recent activity'}
        aria-label={railOpen ? 'Hide recent activity' : 'Show recent activity'}
        style={iconBtnStyle}
      >
        {railOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
      </button>
      <button
        type="button"
        onClick={toggleMaximize}
        title={maximized ? 'Exit fullscreen' : 'Fullscreen chat'}
        aria-label={maximized ? 'Exit fullscreen' : 'Fullscreen chat'}
        style={iconBtnStyle}
      >
        {maximized ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
      </button>
    </div>
  );

  // ─── Maximized: render as a fixed overlay over the entire viewport. ───
  if (maximized) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: '#F8FAFC',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0.6rem 1.1rem',
          borderBottom: '1px solid #E2E8F0',
          background: 'white',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '0.45rem',
              background: '#EFF6FF', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Cpu size={16} />
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#64748B', letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                Chat Interface
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                AI Workflow
              </div>
            </div>
          </div>
          {headerActions}
        </div>

        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
          {chatSurface}
        </div>
      </div>
    );
  }

  // ─── Normal: embedded in the app's AppLayout. ───
  return (
    <AppLayout
      padded={false}
      pageIcon={<Cpu size={18} />}
      pageTitle="AI Workflow"
      pageBreadcrumb="Chat Interface"
      pageActions={headerActions}
    >
      {chatSurface}
    </AppLayout>
  );
};

const iconBtnStyle: React.CSSProperties = {
  width: 32, height: 32,
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  background: 'white', border: '1px solid #E2E8F0', borderRadius: '0.45rem',
  color: '#334155', cursor: 'pointer',
};
