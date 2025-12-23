import { Routes, Route } from 'react-router-dom';
import { ChatContainer } from './components/ChatContainer';
import { AdminPanel } from './components/AdminPanel';
import { AIWar } from './components/AIWar';
import { CssBaseline } from '@mui/material';

function App() {
  return (
    <>
      <CssBaseline />
      <Routes>
        <Route path="/" element={<ChatContainer />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/war" element={<AIWar />} />
      </Routes>
    </>
  );
}

export default App;
