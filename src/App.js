import { Box } from "@chakra-ui/react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Dashboard from "./pages/Dashboard"
import FichaPaciente from "./pages/FichaPaciente"

function App() {
  return (
    <BrowserRouter>
      <Box minH="100vh" bg="gray.50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/paciente/:id" element={<FichaPaciente />} />
        </Routes>
      </Box>
    </BrowserRouter>
  )
}

export default App
