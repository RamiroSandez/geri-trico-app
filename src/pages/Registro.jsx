import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Box, Button, Card, FieldLabel, FieldRoot, Grid, Heading, Input, Stack, Text } from "@chakra-ui/react"
import { Toaster, toaster } from "../components/toaster"
import { useAuth } from "../contexts/AuthContext"

export default function Registro() {
  const [form, setForm] = useState({ nombreGeriatrico: "", nombreDirector: "", telefono: "" })
  const [cargando, setCargando] = useState(false)
  const { crearGeriatrico, user, logout } = useAuth()
  const navigate = useNavigate()

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSetup = async (e) => {
    e.preventDefault()
    if (!form.nombreGeriatrico || !form.nombreDirector) {
      toaster.create({ title: "Completá nombre del geriátrico y del director", type: "warning", duration: 3000 })
      return
    }
    setCargando(true)
    const { error } = await crearGeriatrico(form)
    setCargando(false)
    if (error) {
      toaster.create({ title: "Error al guardar", description: error.message, type: "error", duration: 5000 })
    } else {
      toaster.create({ title: "¡Geriátrico creado!", description: "Bienvenido a GeriManager", type: "success", duration: 2000 })
      navigate("/")
    }
  }

  return (
    <Box minH="100vh" bg="bg.page" display="flex" alignItems="center" justifyContent="center" px={4} py={8}>
      <Toaster />
      <Box w="full" maxW="480px">

        {/* Logo */}
        <Stack align="center" mb={8} gap={2}>
          <Box
            bg="blue.600"
            color="white"
            fontWeight="800"
            fontSize="xl"
            px={4}
            py={2}
            borderRadius="xl"
            letterSpacing="wide"
          >
            GM
          </Box>
          <Heading size="lg" color="text.main" letterSpacing="tight">GeriManager</Heading>
          <Text fontSize="sm" color="text.muted">
            Hola {user?.user_metadata?.full_name || user?.email} — Configurá tu geriátrico
          </Text>
        </Stack>

        <Card.Root bg="bg.panel" borderRadius="2xl" boxShadow="lg" border="1px solid" borderColor="border.subtle">
          <Card.Body p={8}>
            <form onSubmit={handleSetup}>
              <Stack gap={5}>
                <Text fontSize="xs" fontWeight="700" color="blue.600" textTransform="uppercase" letterSpacing="wide">
                  Datos del geriátrico
                </Text>

                <FieldRoot>
                  <FieldLabel fontSize="sm" color="text.main">Nombre del geriátrico *</FieldLabel>
                  <Input
                    placeholder='Ej: Residencia "Del Este"'
                    value={form.nombreGeriatrico}
                    onChange={e => set("nombreGeriatrico", e.target.value)}
                    bg="bg.muted"
                    border="1px solid"
                    borderColor="border.subtle"
                  />
                </FieldRoot>

                <Grid templateColumns="1fr 1fr" gap={4}>
                  <FieldRoot>
                    <FieldLabel fontSize="sm" color="text.main">Nombre del director *</FieldLabel>
                    <Input
                      placeholder="Dr. Apellido"
                      value={form.nombreDirector}
                      onChange={e => set("nombreDirector", e.target.value)}
                      bg="bg.muted"
                      border="1px solid"
                      borderColor="border.subtle"
                    />
                  </FieldRoot>
                  <FieldRoot>
                    <FieldLabel fontSize="sm" color="text.main">Teléfono</FieldLabel>
                    <Input
                      placeholder="11 1234-5678"
                      value={form.telefono}
                      onChange={e => set("telefono", e.target.value)}
                      bg="bg.muted"
                      border="1px solid"
                      borderColor="border.subtle"
                    />
                  </FieldRoot>
                </Grid>

                <Button
                  type="submit"
                  colorPalette="blue"
                  size="lg"
                  w="full"
                  loading={cargando}
                  mt={2}
                >
                  Crear geriátrico
                </Button>
              </Stack>
            </form>
          </Card.Body>
        </Card.Root>

        <Text
          textAlign="center"
          mt={4}
          fontSize="sm"
          color="text.muted"
          cursor="pointer"
          _hover={{ color: "text.main" }}
          onClick={logout}
        >
          Cerrar sesión
        </Text>
      </Box>
    </Box>
  )
}
