import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { Dashboard } from './pages/Dashboard';
import { Admin } from './pages/Admin';
import { Automation } from './pages/Automation';
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
import { ResourcesProvider } from './lib/resources/ResourcesContext';
import { Resources } from './pages/Resources';
import { ResourceUpload } from './pages/ResourceUpload';
import { ResourcesList } from './pages/ResourcesList';
import { StudentResources } from './pages/StudentResources';
import { AuthProvider } from './lib/auth/AuthContext';
import { ProtectedRoute } from './lib/auth/ProtectedRoute';
import './dashboard.css';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AttendanceProvider>
          <ResourcesProvider>
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
            <Route path="/automation" element={
              <ProtectedRoute requireActive><Automation /></ProtectedRoute>
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
            <Route path="/resources"  element={<ProtectedRoute roles={['student']} requireActive><StudentResources /></ProtectedRoute>} />
            <Route path="/finance"    element={<ProtectedRoute><Placeholder title="Finance" /></ProtectedRoute>} />
            <Route path="/reports"    element={<ProtectedRoute><Placeholder title="Reports" /></ProtectedRoute>} />
            <Route path="/directory"  element={<ProtectedRoute><Placeholder title="Directory" /></ProtectedRoute>} />
            <Route path="/curriculum" element={<ProtectedRoute><Placeholder title="Curriculum" /></ProtectedRoute>} />
            <Route path="/research"   element={<ProtectedRoute><Placeholder title="Research" /></ProtectedRoute>} />
            <Route path="/homework"   element={<ProtectedRoute><Placeholder title="Homework" /></ProtectedRoute>} />
            <Route path="/support"    element={<ProtectedRoute><Placeholder title="Support" /></ProtectedRoute>} />

            {/* Assignments & Notes — teachers only */}
            <Route path="/assignments" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><Resources /></ProtectedRoute>
            } />
            <Route path="/assignments/upload/:type" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><ResourceUpload /></ProtectedRoute>
            } />
            <Route path="/assignments/list" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><ResourcesList kind="assignment" /></ProtectedRoute>
            } />
            <Route path="/assignments/notes" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><ResourcesList kind="notes" /></ProtectedRoute>
            } />

            <Route path="*" element={<Placeholder title="Page Not Found" description="The link you followed doesn't match any route in the ERP." />} />
          </Routes>
          </ResourcesProvider>
        </AttendanceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
