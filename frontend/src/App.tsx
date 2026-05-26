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
import { Placeholder } from './pages/Placeholder';
import { AttendanceProvider } from './lib/AttendanceContext';
import './dashboard.css';

const App = () => {
  return (
    <BrowserRouter>
      <AttendanceProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/signin" replace />} />

          {/* Auth */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Core */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/automation" element={<Automation />} />

          {/* Attendance flow */}
          <Route path="/attendance" element={<AttendanceOverview />} />
          <Route path="/attendance/mark" element={<AttendanceMark />} />
          <Route path="/attendance/validate" element={<AttendanceValidate />} />
          <Route path="/attendance/analytics" element={<AttendanceAnalytics />} />

          {/* Roadmap modules (stubbed so navigation doesn't break) */}
          <Route path="/grades" element={<Placeholder title="Grades" description="View, enter, and analyse student grades across courses and assessments." />} />
          <Route path="/schedule" element={<Placeholder title="Schedule" description="Calendar of lectures, labs, exams, and personal academic events." />} />
          <Route path="/resources" element={<Placeholder title="Resources" description="Course material, lab files, and the digital library." />} />
          <Route path="/finance" element={<Placeholder title="Finance" description="Fee receipts, scholarships, and bursar interactions." />} />
          <Route path="/reports" element={<Placeholder title="Reports" description="Custom academic, attendance, and performance reports." />} />
          <Route path="/directory" element={<Placeholder title="Directory" description="Faculty, staff, and student contact directory." />} />
          <Route path="/curriculum" element={<Placeholder title="Curriculum" description="Course design, syllabus mapping, and outcome tracking." />} />
          <Route path="/research" element={<Placeholder title="Research" description="Research papers, publications, and collaboration management." />} />
          <Route path="/homework" element={<Placeholder title="Homework" description="Assignment authoring, distribution, and submission tracking." />} />
          <Route path="/support" element={<Placeholder title="Support" description="Help center, ticketing, and knowledge base." />} />

          {/* Catch-all */}
          <Route path="*" element={<Placeholder title="Page Not Found" description="The link you followed doesn't match any route in the ERP." />} />
        </Routes>
      </AttendanceProvider>
    </BrowserRouter>
  );
};

export default App;
