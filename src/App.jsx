import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import BatchesPage from './pages/BatchesPage';
import CoursesPage from './pages/CoursesPage';
import EmployeesPage from './pages/EmployeesPage';
import StudentsPage from './pages/StudentsPage';
import SettingsPage from './pages/SettingsPage';

function AppLayout() {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      <Sidebar />

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Topbar />

        <main className="flex-1 overflow-y-auto content-spacing">
          <div className="mx-auto max-w-7xl">
            <Routes>
              <Route path="/" element={<Navigate replace to="/courses" />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/batches" element={<BatchesPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
