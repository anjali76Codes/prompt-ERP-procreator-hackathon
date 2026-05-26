import React from 'react';
import {
  LayoutDashboard, UserCheck, GraduationCap, Calendar, FolderOpen,
  CreditCard, TrendingUp, Users, Cpu, Layers, Award, BookOpen,
} from 'lucide-react';
import type { Role } from './useRole';

export interface NavItem {
  name: string;
  icon: React.ReactNode;
  path: string;
}

export const studentNav: NavItem[] = [
  { name: 'Dashboard',  icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { name: 'Attendance', icon: <UserCheck size={20} />,       path: '/attendance' },
  { name: 'Grades',     icon: <GraduationCap size={20} />,   path: '/grades' },
  { name: 'Schedule',   icon: <Calendar size={20} />,        path: '/schedule' },
  { name: 'Resources',  icon: <FolderOpen size={20} />,      path: '/resources' },
  { name: 'Finance',    icon: <CreditCard size={20} />,      path: '/finance' },
  { name: 'Reports',    icon: <TrendingUp size={20} />,      path: '/reports' },
  { name: 'Directory',  icon: <Users size={20} />,           path: '/directory' },
  { name: 'Automation', icon: <Cpu size={20} />,             path: '/automation' },
];

export const teacherNav: NavItem[] = [
  { name: 'Dashboard',  icon: <LayoutDashboard size={20} />, path: '/dashboard' },
  { name: 'Attendance', icon: <UserCheck size={20} />,       path: '/attendance' },
  { name: 'Grades',     icon: <GraduationCap size={20} />,   path: '/grades' },
  { name: 'Curriculum', icon: <Layers size={20} />,          path: '/curriculum' },
  { name: 'Research',   icon: <Award size={20} />,           path: '/research' },
  { name: 'Automation', icon: <Cpu size={20} />,             path: '/automation' },
];

export const teacherTools: NavItem[] = [
  { name: 'Schedule', icon: <Calendar size={20} />, path: '/schedule' },
  { name: 'Homework', icon: <BookOpen size={20} />, path: '/homework' },
];

export const navForRole = (role: Role): NavItem[] =>
  role === 'teacher' ? teacherNav : studentNav;

export interface ActivityEntry {
  type: string;
  time: string;
  color: string;
  content: string;
}

export const recentActivity: ActivityEntry[] = [
  { type: 'Assignment', time: '2m ago',  color: '#3B82F6', content: 'Leo Messi submitted CS-101 Quiz' },
  { type: 'Forum',      time: '15m ago', color: '#10B981', content: 'New thread: "Recursion help needed"' },
  { type: 'System',     time: '1h ago',  color: '#EF4444', content: 'Exam builder version 2.4 updated' },
];
