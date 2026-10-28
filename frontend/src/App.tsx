import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Destination from './pages/Destination'
import Package from './pages/Package'
import SantoriniSunsetTour from './pages/destinations/SantoriniSunsetTour'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/destination" element={<Destination />} />
      <Route path="/destination/santorini-sunset-tour" element={<SantoriniSunsetTour />} />
      <Route path="/package" element={<Package />} />
    </Routes>
  )
}

export default App
