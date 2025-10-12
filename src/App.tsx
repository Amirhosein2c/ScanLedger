import type { ReactElement } from 'react';
import { useRoutes } from 'react-router-dom';
import usePwaSetup from './hooks/usePwaSetup';
import appRoutes from './routes';

const App = (): ReactElement | null => {
  usePwaSetup();

  return useRoutes(appRoutes);
};

export default App;
