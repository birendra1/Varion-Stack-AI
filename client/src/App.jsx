import { Routes, Route } from 'react-router-dom';
import { ChatContainer } from './components/ChatContainer';
import { AdminPanel } from './components/AdminPanel';
import { CssBaseline } from '@mui/material';

function App() {
  return (
    <>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<ChatContainer />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </>
  );
}

export default App;
