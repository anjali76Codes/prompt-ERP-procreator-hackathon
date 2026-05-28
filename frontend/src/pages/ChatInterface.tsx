import React from 'react';
import { Cpu, FileText, Lock } from 'lucide-react';
import { AppLayout } from '../components/layout/AppLayout';
import { ChatPanel } from '../components/automation/ChatPanel';
import { SavedWorkflows } from '../components/automation/SavedWorkflows';
import { RecentActivityRail } from '../components/automation/RecentActivityRail';
import { useAutomationEngine } from '../lib/automation/engine';
import s from '../components/automation/Automation.module.css';

/**
 * Conversational AI workflow assistant — previously mounted at /automation,
 * now lives at /chat-interface. The pipeline of tool calls renders INSIDE
 * each AI message bubble (see InlinePipeline) so the chat surface keeps the
 * full width and the right rail stays reserved for past chats.
 */
export const ChatInterface: React.FC = () => {
  const engine = useAutomationEngine();

  return (
    <AppLayout
      padded={false}
      pageIcon={<Cpu size={18} />}
      pageTitle="AI Workflow"
      pageBreadcrumb="Chat Interface"
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
        <div className={s.workspace} style={{ display: 'flex', gap: '1rem', alignItems: 'stretch' }}>
          <div className={`${s.chatCol} ${s.full}`} style={{ flex: 1, minWidth: 0 }}>
            <ChatPanel
              messages={engine.messages}
              split={false}
              suggestedPrompts={engine.suggestedPrompts}
              onSend={engine.send}
              onPermissionResponse={engine.sendPermissionResponse}
              onInsightAction={() => engine.highlightStudents()}
            />

            <div className={`${s.quickActions} ${s.full}`}>
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

            {/* <SavedWorkflows
              templates={engine.templates}
              split={false}
              onRun={engine.runTemplate}
            /> */}
          </div>

          <RecentActivityRail
            sessions={engine.sessions}
            activeSessionId={engine.activeSessionId}
            onSelect={(id) => { void engine.loadSession(id); }}
            onNew={engine.newChat}
            onDelete={(id) => { void engine.removeSession(id); }}
          />
        </div>
      </div>
    </AppLayout>
  );
};
