import React, { useEffect } from 'react';
import { Cpu, Eye, EyeOff, FileText, Lock } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ChatPanel } from '../components/automation/ChatPanel';
import { WorkflowPipeline } from '../components/automation/WorkflowPipeline';
import { TerminalLog } from '../components/automation/TerminalLog';
import { SavedWorkflows } from '../components/automation/SavedWorkflows';
import { useAutomationEngine, ACTIVE_MODEL, CONNECTED_CONTEXT } from '../lib/automation/engine';
import { useSidebarState } from '../lib/useSidebarState';
import s from '../components/automation/Automation.module.css';

export const Automation: React.FC = () => {
  const engine = useAutomationEngine();
  const split = engine.workflow !== null;
  const { setCollapsed } = useSidebarState();

  // Auto-collapse the sidebar the moment a workflow starts — gives the pipeline room.
  useEffect(() => { if (split) setCollapsed(true); }, [split, setCollapsed]);

  return (
    <AppLayout
      padded={false}
      pageIcon={<Cpu size={18} />}
      pageTitle="AI Workflow"
      pageBreadcrumb="Automation Assistant"
      pageActions={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#EFF6FF', padding: '0.3rem 0.75rem', borderRadius: '2rem', border: '1px solid #DBEAFE' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10B981' }} className="pulse-dot" />
          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--primary)', letterSpacing: '0.2px' }}>
            SYSTEM ONLINE
          </span>
        </div>
      }
    >
      <div className={s.page}>
        <div className={s.workspace}>
          {/* LEFT: chat */}
          <div className={`${s.chatCol} ${split ? s.split : s.full}`}>
            <ChatPanel
              messages={engine.messages}
              split={split}
              suggestedPrompts={engine.suggestedPrompts}
              onSend={engine.send}
              onInsightAction={() => engine.highlightStudents()}
            />

            <div className={`${s.quickActions} ${split ? s.split : s.full}`}>
              <button
                className={s.quickActionBtn}
                onClick={() => engine.send('Generate student analytical performance report in PDF')}
              >
                <FileText size={14} color="var(--primary)" /> Generate Report
              </button>
              <button
                className={s.quickActionBtn}
                onClick={() => engine.send('Securely send the drafted letters via institutional mail tunnels')}
              >
                <Lock size={14} color="var(--primary)" /> Secure Send
              </button>
            </div>

            <SavedWorkflows
              templates={engine.templates}
              split={split}
              onRun={engine.runTemplate}
            />
          </div>

          {/* RIGHT: workflow + logs */}
          <div className={`${s.workflowCol} ${split ? s.visible : s.hidden}`}>
            <div className={s.metaCard}>
              <div className={s.metaGroup}>
                <div>
                  <div className={s.metaLabel}>Active Model</div>
                  <div className={s.metaValue}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ACTIVE_MODEL.online ? '#10B981' : '#94A3B8' }} />
                    <span>{ACTIVE_MODEL.name}</span>
                    <span style={{ fontSize: '0.625rem', fontWeight: 800, backgroundColor: '#EFF6FF', color: 'var(--primary)', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', letterSpacing: '0.5px' }}>
                      {ACTIVE_MODEL.badge}
                    </span>
                  </div>
                </div>
                <div className={s.metaDivider}>
                  <div className={s.metaLabel}>Connected Context</div>
                  <div className={s.metaValue}>
                    {CONNECTED_CONTEXT.primary}
                    <span style={{ color: '#94A3B8', margin: '0 0.4rem' }}>•</span>
                    <span style={{ color: 'var(--primary)' }}>{CONNECTED_CONTEXT.secondary}</span>
                  </div>
                </div>
              </div>

              <button
                className={`${s.logsToggle} ${engine.showLogs ? '' : s.off}`}
                onClick={engine.toggleLogs}
              >
                {engine.showLogs ? <Eye size={13} /> : <EyeOff size={13} />}
                LOGS: {engine.showLogs ? 'ON' : 'OFF'}
              </button>
            </div>

            {engine.workflow && (
              <WorkflowPipeline
                workflow={engine.workflow}
                isPaused={engine.isPaused}
                onTogglePause={engine.togglePause}
                onDeploy={engine.deploy}
              />
            )}

            <TerminalLog open={engine.showLogs} logs={engine.logs} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
