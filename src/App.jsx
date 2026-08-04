import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AIProvider } from './contexts/AIContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import English from './pages/English'
import Korean from './pages/Korean'
import Achievement from './pages/Achievement'
import Compass from './pages/Compass'

function App() {
  return (
    <AIProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="english" element={<English />} />
            <Route path="korean" element={<Korean />} />
            <Route path="achievement" element={<Achievement />} />
            <Route path="compass" element={<Compass />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AIProvider>
  )
}

export default App
