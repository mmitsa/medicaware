import { Routes, Route, Navigate } from 'react-router-dom';
import { Container } from '@mui/material';

// Pages (to be created)
// import LoginPage from './pages/auth/LoginPage';
// import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <Container maxWidth="xl">
      <Routes>
        <Route path="/" element={<div>Welcome to Medical Warehouse System</div>} />
        {/* <Route path="/login" element={<LoginPage />} /> */}
        {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Container>
  );
}

export default App;
