import { Box, Heading, HStack, Text } from "@chakra-ui/react"
import { useNavigate } from "react-router-dom"

export default function Navbar() {
  const navigate = useNavigate()

  return (
    <Box bg="blue.600" px={6} py={3} boxShadow="sm">
      <HStack justify="space-between">
        <Heading
          size="md"
          color="white"
          cursor="pointer"
          onClick={() => navigate("/")}
        >
          Gestor de Amparos
        </Heading>
        <Text color="blue.100" fontSize="sm">
          Sistema Geriátrico
        </Text>
      </HStack>
    </Box>
  )
}
