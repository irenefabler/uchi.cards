import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { BattlePage } from 'src/pages/example-battle-page';
import { QueryProvider } from 'src/shared/context/query';
import { Environment } from 'src/shared/model/environment';
import { Preloader } from 'src/widgets/example-preloader';

import './styles/app.css';

export const App = () => {
  return (
    <QueryProvider>
      <BrowserRouter basename={Environment.basePath}>
        <Routes>
          <Route
            index
            element={
              <div className="flex flex-col gap-2 p-4">
                <div className="text-xl">Main screen ⭐</div>
                <Link className="text-blue-500 underline" to={{ pathname: 'battle-page' }}>
                  Battle page
                </Link>
              </div>
            }
          />
          <Route path="battle-page" element={<BattlePage />} />
        </Routes>
        <Preloader />
      </BrowserRouter>
    </QueryProvider>
  );
};
