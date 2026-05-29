import React from 'react';
import {
  LayoutDashboard, UserCheck, GraduationCap, Calendar, FolderOpen,
  CreditCard, Cpu, ClipboardList, MessageSquare, Plus,
  Megaphone, FileSpreadsheet, Send,
} from 'lucide-react';
import type { Role } from './useRole';

export interface NavItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

export const studentNav: NavItem[] = [
  { name: 'Dashboard',      icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { name: 'Attendance',     icon: <UserCheck size={20} />,       path: '/attendance' },
  { name: 'Quizzes',        icon: <ClipboardList size={20} />,   path: '/student/quizzes' },
  { name: 'Grades',         icon: <GraduationCap size={20} />,   path: '/grades' },
  { name: 'Schedule',       icon: <Calendar size={20} />,        path: '/schedule' },
  { name: 'Resources',      icon: <FolderOpen size={20} />,      path: '/resources' },
  { name: 'Finance',        icon: <CreditCard size={20} />,      path: '/finance' },
  { name: 'Chat Interface', icon: <MessageSquare size={20} />,   path: '/chat-interface' },
];

export const teacherNav: NavItem[] = [
  { name: 'Dashboard',           icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { name: 'Attendance',          icon: <UserCheck size={20} />,       path: '/attendance' },
  { name: 'Quizzes',             icon: <ClipboardList size={20} />,   path: '/quizzes' },
  { name: 'Grades',              icon: <GraduationCap size={20} />,   path: '/grade-batch' },
  { name: 'Assignments & Notes', icon: <FolderOpen size={20} />,      path: '/assignments' },
  { name: 'Chat Interface',      icon: <MessageSquare size={20} />,   path: '/chat-interface' },
  { name: 'Automation',          icon: <Cpu size={20} />,             path: '/automation' },
];

export const teacherTools: NavItem[] = [
  { name: 'Schedule', icon: <Calendar size={20} />, path: '/attendance/schedules' },
  { name: 'Create Quiz', icon: <Plus size={20} />, path: '/quiz/create' },
];

export const teacherQuickActions: NavItem[] = [
  { name: 'Announcement', icon: <Megaphone size={20} />,      path: '/announcements' },
  { name: 'Grade Batch',  icon: <FileSpreadsheet size={20} />, path: '/grade-batch' },
  { name: 'Notify Class', icon: <Send size={20} />,            path: '/notify' },
];

export const navForRole = (role: Role): NavItem[] =>
  role === 'teacher' ? teacherNav : studentNav;
