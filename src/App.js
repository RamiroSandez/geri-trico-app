import { Box, Heading } from "@chakra-ui/react";
import CrearPaciente from "./components/CrearPaciente";
import ListaPacientes from "./components/ListaPacientes";

function App() {
  return (
    <Box minH="100vh" bg="gray.50">
      <Box bg="blue.600" px={6} py={4} mb={6} boxShadow="sm">
        <Heading size="lg" color="white">
          Sistema Geriátrico
        </Heading>
      </Box>

      <CrearPaciente />
      <ListaPacientes />
    </Box>
  );
}

export default App;
