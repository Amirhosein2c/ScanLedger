import { useRoutes } from 'react-router-dom';
import usePwaSetup from './hooks/usePwaSetup.js';
import appRoutes from './routes/index.jsx';

const App = () => {
  usePwaSetup();

  const routing = useRoutes(appRoutes);
  return routing;
};

export default App;
