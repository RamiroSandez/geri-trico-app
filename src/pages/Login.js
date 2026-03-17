import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { Box, Button, Card, FieldLabel, FieldRoot, Heading, Input, Stack, Text } from "@chakra-ui/react"
import { Toaster, toaster } from "../components/toaster"
import { useAuth } from "../contexts/AuthContext"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [cargando, setCargando] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toaster.create({ title: "Completá email y contraseña", type: "warning", duration: 3000 })
      return
    }
    setCargando(true)
    const { error } = await login(email, password)
    setCargando(false)
    if (error) {
      toaster.create({ title: "Error al ingresar", description: "Email o contraseña incorrectos", type: "error", duration: 4000 })
    } else {
      navigate("/")
    }
  }

  return (
    <Box minH="100vh" bg="bg.page" display="flex" alignItems="center" justifyContent="center" px={4}>
      <Toaster />
      <Box w="full" maxW="400px">

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
          <Text fontSize="sm" color="text.muted">Ingresá a tu cuenta</Text>
        </Stack>

        {/* Card */}
        <Card.Root bg="bg.panel" borderRadius="2xl" boxShadow="lg" border="1px solid" borderColor="border.subtle">
          <Card.Body p={8}>
            <form onSubmit={handleLogin}>
              <Stack gap={5}>
                <FieldRoot>
                  <FieldLabel fontSize="sm" color="text.main">Email</FieldLabel>
                  <Input
                    type="email"
                    placeholder="director@geriatrico.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    size="lg"
                    bg="bg.muted"
                    border="1px solid"
                    borderColor="border.subtle"
                  />
                </FieldRoot>
                <FieldRoot>
                  <FieldLabel fontSize="sm" color="text.main">Contraseña</FieldLabel>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    size="lg"
                    bg="bg.muted"
                    border="1px solid"
                    borderColor="border.subtle"
                  />
                </FieldRoot>
                <Button
                  type="submit"
                  colorPalette="blue"
                  size="lg"
                  w="full"
                  loading={cargando}
                  mt={2}
                >
                  Ingresar
                </Button>
              </Stack>
            </form>
          </Card.Body>
        </Card.Root>

        <Text textAlign="center" mt={6} fontSize="sm" color="text.muted">
          ¿No tenés cuenta?{" "}
          <Link to="/registro" style={{ color: "#3182CE", fontWeight: 600 }}>
            Registrá tu geriátrico
          </Link>
        </Text>
      </Box>
    </Box>
  )
}
