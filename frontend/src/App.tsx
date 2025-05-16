import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.js';
import HomePage from './pages/HomePage.js';
import PreferencesPage from './pages/PreferencesPage.js';
import NotFoundPage from './pages/NotFoundPage.js';

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/generate" replace />} />
        <Route path="generate" element={<HomePage />} />
        <Route path="preferences" element={<PreferencesPage />} />
        {/* Example for a future podcast details page if needed */}
        {/* <Route path="podcasts/:podcastId" element={<PodcastDetailsPage />} /> */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
