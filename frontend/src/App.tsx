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
import { Announcements } from './pages/Announcements';
import { ClassNotify } from './pages/ClassNotify';
import { GradeBatch } from './pages/GradeBatch';
import { Profile } from './pages/Profile';
import { PendingApproval } from './pages/PendingApproval';
import { AttendanceProvider } from './lib/AttendanceContext';
import { ResourcesProvider } from './lib/resources/ResourcesContext';
import { Resources } from './pages/Resources';
import { ResourceUpload } from './pages/ResourceUpload';
import { ResourcesList } from './pages/ResourcesList';
import { ReviewSubmissions } from './pages/ReviewSubmissions';
import { AiGrading } from './pages/AiGrading';
import { StudentResources } from './pages/StudentResources';
import { QuizCreate } from './pages/QuizCreate';
import { TeacherQuizOverview } from './pages/TeacherQuizOverview';
import { StudentQuizList } from './pages/StudentQuizList';
import { StudentQuizDetails } from './pages/StudentQuizDetails';
import { StudentQuizPlay } from './pages/StudentQuizPlay';
import { StudentQuizResult } from './pages/StudentQuizResult';
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
          <ResourcesProvider>
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
            <Route path="/resources"  element={<ProtectedRoute roles={['student']} requireActive><StudentResources /></ProtectedRoute>} />
            <Route path="/finance"    element={<ProtectedRoute><Placeholder title="Finance" /></ProtectedRoute>} />
            <Route path="/reports"    element={<ProtectedRoute><Placeholder title="Reports" /></ProtectedRoute>} />
            <Route path="/directory"  element={<ProtectedRoute><Placeholder title="Directory" /></ProtectedRoute>} />

            {/* Teacher quick actions (dashboard) */}
            <Route path="/announcements" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><Announcements /></ProtectedRoute>
            } />
            <Route path="/grade-batch" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><GradeBatch /></ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><Placeholder title="Reports" /></ProtectedRoute>
            } />
            <Route path="/notify" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><ClassNotify /></ProtectedRoute>
            } />

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
            <Route path="/assignments/list/:id/review" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><ReviewSubmissions /></ProtectedRoute>
            } />
            <Route path="/assignments/list/:id/ai-grade" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><AiGrading /></ProtectedRoute>
            } />
            <Route path="/assignments/notes" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><ResourcesList kind="notes" /></ProtectedRoute>
            } />
            
            <Route path="/quiz/create" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><QuizCreate /></ProtectedRoute>
            } />
            <Route path="/quizzes" element={
              <ProtectedRoute roles={['teacher', 'admin']} requireActive><TeacherQuizOverview /></ProtectedRoute>
            } />
            <Route path="/student/quizzes" element={
              <ProtectedRoute roles={['student']} requireActive><StudentQuizList /></ProtectedRoute>
            } />
            <Route path="/quiz/take/:id/details" element={
              <ProtectedRoute roles={['student']} requireActive><StudentQuizDetails /></ProtectedRoute>
            } />
            <Route path="/quiz/take/:id/play" element={
              <ProtectedRoute roles={['student']} requireActive><StudentQuizPlay /></ProtectedRoute>
            } />
            <Route path="/quiz/result/:id" element={
              <ProtectedRoute roles={['student']} requireActive><StudentQuizResult /></ProtectedRoute>
            } />

            <Route path="*" element={<Placeholder title="Page Not Found" description="The link you followed doesn't match any route in the ERP." />} />
          </Routes>
          </RecorderProvider>
          </ResourcesProvider>
        </AttendanceProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
