import React from 'react';
import { Terminal as TermIcon } from 'lucide-react';
import s from './Automation.module.css';
import type { ExecutionLog } from '../../lib/automation/types';

interface Props {
  open: boolean;
  logs: ExecutionLog[];
}

export const TerminalLog: React.FC<Props> = ({ open, logs }) => (
  <div className={`${s.terminal} ${open ? s.on : s.off}`}>
    <div className={s.terminalHeader}>
      <div className={s.terminalDots}>
        <span /><span /><span />
      </div>
      <div className={s.terminalTitle}>
        <TermIcon size={12} /> TOOL EXECUTION LOG
      </div>
      <div style={{ width: 15 }} />
    </div>
    <div className={s.terminalBody}>
      {logs.map(l => (
        <div key={l.id} className={`${s.terminalRow} ${s[l.level]}`}>
          {l.ts} {l.message}
        </div>
      ))}
      <div className={s.cursor}>_ <span /></div>
    </div>
  </div>
);
