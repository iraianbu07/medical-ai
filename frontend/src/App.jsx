import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import HistoryPage from './pages/HistoryPage';
import LiveMonitorPage from './pages/LiveMonitorPage';
import PatientsPage from './pages/PatientsPage';
import EventsTimelinePage from './pages/EventsTimelinePage';
import AIInsightsPage from './pages/AIInsightsPage';
import DeviceStatusPage from './pages/DeviceStatusPage';
import CameraVisionPage from './pages/CameraVisionPage';
import AnatomyTwinPage from './pages/AnatomyTwinPage';

function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
    const { isAuthenticated } = useAuth();
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <Router>
                    <Routes>
                        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
                        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/live-monitor" element={<ProtectedRoute><LiveMonitorPage /></ProtectedRoute>} />
                        <Route path="/patients" element={<ProtectedRoute><PatientsPage /></ProtectedRoute>} />
                        <Route path="/events" element={<ProtectedRoute><EventsTimelinePage /></ProtectedRoute>} />
                        <Route path="/ai-insights" element={<ProtectedRoute><AIInsightsPage /></ProtectedRoute>} />
                        <Route path="/devices" element={<ProtectedRoute><DeviceStatusPage /></ProtectedRoute>} />
                        <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                        <Route path="/camera-vision" element={<ProtectedRoute><CameraVisionPage /></ProtectedRoute>} />
                        <Route path="/anatomy-twin" element={<ProtectedRoute><AnatomyTwinPage /></ProtectedRoute>} />
                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
}

export default App;
