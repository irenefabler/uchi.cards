import { BrowserRouter, Route, Routes } from 'react-router';
import { BattlePage } from 'src/pages/example-battle-page';
import { ScanPage } from 'src/pages/scan-page';
import { QueryProvider } from 'src/shared/context/query';
import { Environment } from 'src/shared/model/environment';
import { Preloader } from 'src/widgets/example-preloader';

import './styles/app.css';

export const App = () => {
  return (
    <QueryProvider>
      <BrowserRouter basename={Environment.basePath}>
        <Routes>
          <Route index element={<ScanPage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="battle-page" element={<BattlePage />} />
        </Routes>
        <Preloader />
      </BrowserRouter>
    </QueryProvider>
  );
};
