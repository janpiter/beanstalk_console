import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '@fontsource-variable/inter';
import '@fontsource-variable/geist-mono';
import './styles/vendor/bootstrap.min.css';
import './styles/vendor/jquery.json-viewer.css';
import './styles/customer.css';
import './styles/vendor/magula.css';
import './styles/styles.css';
import './styles/theme.css';
import './styles/preferences.css';

createRoot(document.getElementById('root')).render(<App />);
