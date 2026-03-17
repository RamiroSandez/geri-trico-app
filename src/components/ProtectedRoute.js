import { Navigate } from "react-router-dom"
import { Box, Spinner } from "@chakra-ui/react"
import { useAuth } from "../contexts/AuthContext"

export default function ProtectedRoute({ children }) {
  const { user, cargando } = useAuth()

  if (cargando) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="bg.page">
        <Spinner size="lg" color="blue.500" />
      </Box>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return children
}
