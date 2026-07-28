import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CalculatorPage } from './pages/CalculatorPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="calc/:id" element={<CalculatorPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
