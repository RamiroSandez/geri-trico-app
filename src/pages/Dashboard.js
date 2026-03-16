import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabase"
import {
  Badge,
  Box,
  Button,
  Card,
  Grid,
  Heading,
  HStack,
  Input,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react"
import { Toaster } from "../components/toaster"
import CrearPacienteModal from "../components/CrearPacienteModal"
import { ESTADOS_AMPARO } from "../utils/constants"

export default function Dashboard() {
  const [pacientes, setPacientes] = useState([])
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(true)
  const [mostrarCrear, setMostrarCrear] = useState(false)
  const navigate = useNavigate()

  const fetchPacientes = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from("Pacientes")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error) setPacientes(data || [])
    setCargando(false)
  }

  useEffect(() => { fetchPacientes() }, [])

  const pacientesFiltrados = pacientes.filter(p =>
    p.Nombre_Completo?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.dni?.includes(busqueda) ||
    p.Obra_social?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <Box px={6} py={6}>
      <Toaster />

      {/* Stats por estado */}
      <Grid templateColumns="repeat(auto-fill, minmax(170px, 1fr))" gap={4} mb={6}>
        <Card.Root borderRadius="lg" boxShadow="sm" bg="white">
          <Card.Body py={4} px={5}>
            <Text fontSize="3xl" fontWeight="bold" color="blue.600">
              {pacientes.length}
            </Text>
            <Text fontSize="sm" color="gray.500">Total pacientes</Text>
          </Card.Body>
        </Card.Root>
        {Object.entries(ESTADOS_AMPARO).map(([key, estado]) => (
          <Card.Root key={key} borderRadius="lg" boxShadow="sm" bg="white">
            <Card.Body py={4} px={5}>
              <Text fontSize="3xl" fontWeight="bold" color={`${estado.color}.600`}>
                {pacientes.filter(p => (p.estado_amparo || "preparando_documentacion") === key).length}
              </Text>
              <Text fontSize="sm" color="gray.500">{estado.label}</Text>
            </Card.Body>
          </Card.Root>
        ))}
      </Grid>

      {/* Buscador + botón nuevo */}
      <HStack mb={4} gap={3} flexWrap="wrap">
        <Input
          placeholder="Buscar por nombre, DNI u obra social..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          maxW="420px"
          bg="white"
          borderRadius="lg"
        />
        <Button colorPalette="blue" onClick={() => setMostrarCrear(true)}>
          + Nuevo Paciente
        </Button>
      </HStack>

      {/* Tabla de pacientes */}
      <Card.Root boxShadow="md" borderRadius="xl">
        <Card.Header>
          <HStack justify="space-between">
            <Heading size="md" color="blue.600">
              Pacientes ({pacientesFiltrados.length})
            </Heading>
          </HStack>
        </Card.Header>
        <Card.Body p={0}>
          {cargando ? (
            <Box display="flex" justifyContent="center" py={10}>
              <Spinner size="lg" color="blue.500" />
            </Box>
          ) : pacientesFiltrados.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={10}>
              {busqueda ? "No se encontraron pacientes." : "No hay pacientes registrados."}
            </Text>
          ) : (
            <Table.Root size="md">
              <Table.Header>
                <Table.Row bg="gray.50">
                  <Table.ColumnHeader fontWeight="600">Nombre Completo</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="600">DNI</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="600">Obra Social</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="600">Estado Amparo</Table.ColumnHeader>
                  <Table.ColumnHeader></Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pacientesFiltrados.map(p => {
                  const estadoKey = p.estado_amparo || "preparando_documentacion"
                  const estado = ESTADOS_AMPARO[estadoKey] || ESTADOS_AMPARO.preparando_documentacion
                  return (
                    <Table.Row
                      key={p.id}
                      cursor="pointer"
                      _hover={{ bg: "blue.50" }}
                      onClick={() => navigate(`/paciente/${p.id}`)}
                    >
                      <Table.Cell fontWeight="500">{p.Nombre_Completo}</Table.Cell>
                      <Table.Cell>{p.dni}</Table.Cell>
                      <Table.Cell>{p.Obra_social}</Table.Cell>
                      <Table.Cell>
                        <Badge
                          colorPalette={estado.color}
                          variant="subtle"
                          borderRadius="full"
                          px={3}
                        >
                          {estado.label}
                        </Badge>
                      </Table.Cell>
                      <Table.Cell>
                        <Button
                          size="xs"
                          variant="ghost"
                          colorPalette="blue"
                          onClick={e => {
                            e.stopPropagation()
                            navigate(`/paciente/${p.id}`)
                          }}
                        >
                          Ver ficha →
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Body>
      </Card.Root>

      <CrearPacienteModal
        open={mostrarCrear}
        onClose={() => setMostrarCrear(false)}
        onCreated={fetchPacientes}
      />
    </Box>
  )
}
