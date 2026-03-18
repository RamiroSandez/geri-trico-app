import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Box, Button, Card, FieldLabel, FieldRoot, Grid, Heading, Input, Stack, Text } from "@chakra-ui/react"
import { Toaster, toaster } from "../components/toaster"
import { useAuth } from "../contexts/AuthContext"

export default function Registro() {
  const [form, setForm] = useState({
    email: "", password: "", confirmar: "",
    nombreGeriatrico: "", nombreDirector: "", telefono: "",
  })
  const [cargando, setCargando] = useState(false)
  const { registro } = useAuth()
  const navigate = useNavigate()

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleRegistro = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password || !form.nombreGeriatrico || !form.nombreDirector) {
      toaster.create({ title: "Completá todos los campos obligatorios", type: "warning", duration: 3000 })
      return
    }
    if (form.password !== form.confirmar) {
      toaster.create({ title: "Las contraseñas no coinciden", type: "error", duration: 3000 })
      return
    }
    if (form.password.length < 6) {
      toaster.create({ title: "La contraseña debe tener al menos 6 caracteres", type: "warning", duration: 3000 })
      return
    }
    setCargando(true)
    const { error } = await registro(form)
    setCargando(false)
    if (error) {
      toaster.create({ title: "Error al registrarse", description: error.message, type: "error", duration: 5000 })
    } else {
      toaster.create({ title: "¡Cuenta creada!", description: "Bienvenido a GeriManager", type: "success", duration: 3000 })
      navigate("/")
    }
  }

  return (
    <Box minH="100vh" bg="bg.page" display="flex" alignItems="center" justifyContent="center" px={4} py={8}>
      <Toaster />
      <Box w="full" maxW="520px">

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
          <Text fontSize="sm" color="text.muted">Registrá tu geriátrico</Text>
        </Stack>

        <Card.Root bg="bg.panel" borderRadius="2xl" boxShadow="lg" border="1px solid" borderColor="border.subtle">
          <Card.Body p={8}>
            <form onSubmit={handleRegistro}>
              <Stack gap={6}>

                {/* Datos del geriátrico */}
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="blue.600" textTransform="uppercase" letterSpacing="wide" mb={3}>
                    Datos del geriátrico
                  </Text>
                  <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={4}>
                    <FieldRoot gridColumn={{ sm: "span 2" }}>
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
                </Box>

                {/* Datos de acceso */}
                <Box>
                  <Text fontSize="xs" fontWeight="700" color="blue.600" textTransform="uppercase" letterSpacing="wide" mb={3}>
                    Datos de acceso
                  </Text>
                  <Stack gap={4}>
                    <FieldRoot>
                      <FieldLabel fontSize="sm" color="text.main">Email *</FieldLabel>
                      <Input
                        type="email"
                        placeholder="director@geriatrico.com"
                        value={form.email}
                        onChange={e => set("email", e.target.value)}
                        bg="bg.muted"
                        border="1px solid"
                        borderColor="border.subtle"
                      />
                    </FieldRoot>
                    <Grid templateColumns="1fr 1fr" gap={4}>
                      <FieldRoot>
                        <FieldLabel fontSize="sm" color="text.main">Contraseña *</FieldLabel>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={form.password}
                          onChange={e => set("password", e.target.value)}
                          bg="bg.muted"
                          border="1px solid"
                          borderColor="border.subtle"
                        />
                      </FieldRoot>
                      <FieldRoot>
                        <FieldLabel fontSize="sm" color="text.main">Confirmar *</FieldLabel>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          value={form.confirmar}
                          onChange={e => set("confirmar", e.target.value)}
                          bg="bg.muted"
                          border="1px solid"
                          borderColor="border.subtle"
                        />
                      </FieldRoot>
                    </Grid>
                  </Stack>
                </Box>

                <Button
                  type="submit"
                  colorPalette="blue"
                  size="lg"
                  w="full"
                  loading={cargando}
                >
                  Crear cuenta
                </Button>
              </Stack>
            </form>
          </Card.Body>
        </Card.Root>

        <Text textAlign="center" mt={6} fontSize="sm" color="text.muted">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login" style={{ color: "#3182CE", fontWeight: 600 }}>
            Ingresá acá
          </Link>
        </Text>
      </Box>
    </Box>
  )
}
