import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Automation } from './pages/Automation';
import { AutomationDetail } from './pages/AutomationDetail';
import { ChatInterface } from './pages/ChatInterface';
import { AttendanceOverview } from './pages/AttendanceOverview';
import { AttendanceMark } from './pages/AttendanceMark';
import { AttendanceValidate } from './pages/AttendanceValidate';
import { AttendanceAnalytics } from './pages/AttendanceAnalytics';
import { AttendanceStudents } from './pages/AttendanceStudents';
import { AttendanceSchedules } from './pages/AttendanceSchedules';
import { Placeholder } from './pages/Placeholder';
import { Profile } from './pages/Profile';
import { PendingApproval } from './pages/PendingApproval';
import { AttendanceProvider } from './lib/AttendanceContext';
import { AuthProvider } from './lib/auth/AuthContext';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import { RecorderProvider } from './lib/automation/recorder/RecorderContext';
import { RecorderOverlay } from './components/automation/recorder/RecorderOverlay';
import { NotificationProvider } from './lib/notifications/NotificationContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './dashboard.css';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
        <AttendanceProvider>
          <RecorderProvider>
            <RecorderOverlay />
            <ToastContainer
              position="top-right"
              autoClose={3500}
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
            />
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Auth */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/pending-approval" element={<PendingApproval />} />

            {/* Core */}
            <Route path="/dashboard" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute roles={['student', 'teacher']}><Profile /></ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute roles={['admin']} requireActive><Admin /></ProtectedRoute>
            } />

            {/* Conversational AI assistant — previously lived at /automation */}
            <Route path="/chat-interface" element={
              <ProtectedRoute requireActive><ChatInterface /></ProtectedRoute>
            } />

            {/* Deterministic record-and-replay automation system */}
            <Route path="/automation" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><Automation /></ProtectedRoute>
            } />
            <Route path="/automation/:id" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><AutomationDetail /></ProtectedRoute>
            } />

            {/* Attendance — teachers only, must be active */}
            <Route path="/attendance" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><AttendanceOverview /></ProtectedRoute>
            } />
            <Route path="/attendance/mark" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><AttendanceMark /></ProtectedRoute>
            } />
            <Route path="/attendance/validate" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><AttendanceValidate /></ProtectedRoute>
            } />
            <Route path="/attendance/analytics" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><AttendanceAnalytics /></ProtectedRoute>
            } />
            <Route path="/attendance/students" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><AttendanceStudents /></ProtectedRoute>
            } />
            <Route path="/attendance/schedules" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><AttendanceSchedules /></ProtectedRoute>
            } />

            {/* Roadmap stubs */}
            <Route path="/grades"     element={<ProtectedRoute><Placeholder title="Grades" /></ProtectedRoute>} />
            <Route path="/schedule"   element={<ProtectedRoute><Placeholder title="Schedule" /></ProtectedRoute>} />
            <Route path="/resources"  element={<ProtectedRoute><Placeholder title="Resources" /></ProtectedRoute>} />
            <Route path="/finance"    element={<ProtectedRoute><Placeholder title="Finance" /></ProtectedRoute>} />
            <Route path="/reports"    element={<ProtectedRoute><Placeholder title="Reports" /></ProtectedRoute>} />
            <Route path="/directory"  element={<ProtectedRoute><Placeholder title="Directory" /></ProtectedRoute>} />
            <Route path="/curriculum" element={<ProtectedRoute><Placeholder title="Curriculum" /></ProtectedRoute>} />
            <Route path="/research"   element={<ProtectedRoute><Placeholder title="Research" /></ProtectedRoute>} />
            <Route path="/homework"   element={<ProtectedRoute><Placeholder title="Homework" /></ProtectedRoute>} />
            <Route path="/support"    element={<ProtectedRoute><Placeholder title="Support" /></ProtectedRoute>} />

            <Route path="*" element={<Placeholder title="Page Not Found" description="The link you followed doesn't match any route in the ERP." />} />
          </Routes>
          </RecorderProvider>
        </AttendanceProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
