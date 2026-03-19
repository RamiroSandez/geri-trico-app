import { useState, useEffect } from "react"
import { Box, HStack, Text } from "@chakra-ui/react"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function NotificationBell() {
  return (
    <Box position="relative" cursor="pointer" p={1} color="text.muted" _hover={{ color: "text.main" }} transition="color 0.15s">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </Box>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { geriatrico, logout, rol } = useAuth()
  const NAV_LINKS = [
    { label: "Pacientes", path: "/" },
    ...(["admin", "gerente"].includes(rol) ? [{ label: "Gastos", path: "/gastos" }] : []),
    ...(rol === "admin" ? [{ label: "Equipo", path: "/equipo" }] : []),
  ]
  const [dark, setDark] = useState(() => localStorage.getItem("geri-theme") === "dark")

  useEffect(() => {
    const saved = localStorage.getItem("geri-theme") || "light"
    const isDark = saved === "dark"
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggleColorMode = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("geri-theme", next ? "dark" : "light")
  }

  return (
    <Box
      bg="bg.panel"
      borderBottom="1px solid"
      borderColor="border.subtle"
      px={8}
      py={0}
      boxShadow="0 1px 3px rgba(0,0,0,0.06)"
      position="sticky"
      top={0}
      zIndex={100}
    >
      <HStack justify="space-between" h="56px">

        {/* Logo */}
        <HStack gap={3}>
          <HStack gap={2} cursor="pointer" onClick={() => navigate("/")}>
            <img src="/favicon.png" alt="GeriManager" style={{ width: 32, height: 32, borderRadius: 8 }} />
            <Text fontWeight="700" fontSize="md" color="text.main" letterSpacing="tight">
              GeriManager
            </Text>
          </HStack>
          <Box h="20px" w="1px" bg="border.subtle" />
          <Text fontSize="xs" color="text.muted" fontWeight="500">
            {geriatrico?.nombre || "Mi Geriátrico"}
          </Text>
        </HStack>

        {/* Links centrados */}
        <HStack gap={0} h="100%" position="absolute" left="50%" transform="translateX(-50%)">
          {NAV_LINKS.map(({ label, path }) => {
            const active = location.pathname === path
            return (
              <Box
                key={path}
                onClick={() => navigate(path)}
                cursor="pointer"
                px={5}
                h="100%"
                display="flex"
                alignItems="center"
                borderBottom="2px solid"
                borderColor={active ? "blue.600" : "transparent"}
                color={active ? "blue.600" : "text.muted"}
                fontWeight={active ? "600" : "400"}
                fontSize="sm"
                _hover={{ color: "blue.600", bg: "bg.hover" }}
                transition="all 0.15s"
              >
                {label}
              </Box>
            )
          })}
        </HStack>

        {/* Derecha */}
        <HStack gap={3}>
          {/* Toggle dark mode */}
          <Box
            cursor="pointer"
            p={1.5}
            borderRadius="md"
            color="text.muted"
            _hover={{ bg: "bg.hover", color: "text.main" }}
            transition="all 0.15s"
            onClick={toggleColorMode}
          >
            {dark ? <SunIcon /> : <MoonIcon />}
          </Box>

          <NotificationBell />
          <Box h="20px" w="1px" bg="border.subtle" />

          <HStack gap={2}>
            <Box textAlign="right">
              <Text fontSize="xs" fontWeight="600" color="text.main" lineHeight="1.2">
                {geriatrico?.nombre_director || "Director"}
              </Text>
              <Text
                fontSize="10px"
                color="blue.500"
                lineHeight="1.2"
                cursor="pointer"
                _hover={{ textDecoration: "underline" }}
                onClick={async () => { await logout(); navigate("/login") }}
              >
                Cerrar sesión
              </Text>
            </Box>
            <Box
              w="32px"
              h="32px"
              borderRadius="full"
              bg="blue.600"
              color="white"
              fontSize="xs"
              fontWeight="700"
              display="flex"
              alignItems="center"
              justifyContent="center"
              cursor="pointer"
              _hover={{ bg: "blue.700" }}
              transition="background 0.15s"
            >
              {geriatrico?.nombre_director?.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "??"}
            </Box>
          </HStack>
        </HStack>

      </HStack>
    </Box>
  )
}
