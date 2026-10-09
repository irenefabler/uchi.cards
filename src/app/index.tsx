import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { BattlePage } from 'src/pages/example-battle-page';
import {
  LibraryPage,
  SourcePage,
  NewEditorPage,
  EditorPage,
  DeckPage,
  StudyPage,
  ResultsPage
} from 'src/pages/flashcards';
import { QueryProvider } from 'src/shared/context/query';
import { Environment } from 'src/shared/model/environment';

import './styles/app.css';

export const App = () => {
  return (
    <QueryProvider>
      <BrowserRouter basename={Environment.basePath}>
        <Routes>
          <Route index element={<LibraryPage />} />
          <Route path="new" element={<SourcePage />} />
          <Route path="new/review" element={<NewEditorPage />} />
          <Route path="new/settings" element={<Navigate to="/new" replace />} />
          <Route path="decks/:id/edit" element={<EditorPage />} />
          <Route path="decks/:id" element={<DeckPage />} />
          <Route path="sessions/:id" element={<StudyPage />} />
          <Route path="sessions/:id/results" element={<ResultsPage />} />
          <Route path="*" element={<LibraryPage />} />
          <Route path="battle-page" element={<BattlePage />} />
        </Routes>
      </BrowserRouter>
    </QueryProvider>
  );
};
