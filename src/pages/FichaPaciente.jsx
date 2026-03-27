import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "../services/supabase"
import {
  Badge,
  Box,
  Button,
  Card,
  FieldLabel,
  FieldRoot,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Tabs,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { Toaster, toaster } from "../components/toaster"
import DocumentosPanel from "../components/DocumentosPanel"

const ESTADOS_PACIENTE = {
  activo: { label: "Activo", color: "green" },
  baja: { label: "Baja", color: "red" },
}

export default function FichaPaciente() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [paciente, setPaciente] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({})
  const [eventos, setEventos] = useState([])

  const fetchPaciente = async () => {
    const { data, error } = await supabase
      .from("Pacientes")
      .select("*")
      .eq("id", id)
      .single()
    if (!error && data) {
      setPaciente(data)
      setForm(data)
    }
    setCargando(false)
  }

  const fetchEventos = async () => {
    const { data } = await supabase
      .from("eventos")
      .select("*")
      .eq("paciente_id", id)
      .order("created_at", { ascending: false })
    setEventos(data || [])
  }

  useEffect(() => {
    fetchPaciente()
    fetchEventos()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const registrarEvento = async (descripcion) => {
    const { error } = await supabase
      .from("eventos")
      .insert({ paciente_id: Number(id), descripcion, tipo: "auditoria" })
    if (error) console.error("Error registrando evento:", error.message)
  }

  const guardarDatos = async () => {
    setGuardando(true)
    const estadoActual = paciente.estado || "activo"
    const estadoNuevo = form.estado || "activo"
    const estadoCambio = estadoNuevo !== estadoActual

    const updatePayload = {
      Nombre_Completo: form.Nombre_Completo,
      dni: form.dni,
      Obra_social: form.Obra_social,
      numero_afiliado: form.numero_afiliado,
      fecha_nacimiento: form.fecha_nacimiento || null,
      diagnostico: form.diagnostico,
      telefono_contacto: form.telefono_contacto,
      nombre_contacto: form.nombre_contacto,
      motivo_ingreso: form.motivo_ingreso,
      antecedentes: form.antecedentes,
      medicacion: form.medicacion,
      estado: estadoNuevo,
    }

    const { error } = await supabase.from("Pacientes").update(updatePayload).eq("id", id)

    if (error) {
      toaster.create({ title: "Error al guardar", description: error.message, type: "error", duration: 4000 })
    } else {
      const descripcion = estadoCambio
        ? `Estado cambiado a: ${ESTADOS_PACIENTE[estadoNuevo]?.label || estadoNuevo}`
        : "Datos del paciente actualizados"
      await registrarEvento(descripcion)
      toaster.create({ title: "Datos actualizados", type: "success", duration: 3000 })
      await fetchPaciente()
      await fetchEventos()
    }
    setGuardando(false)
  }

  if (cargando) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={20}>
        <Spinner size="xl" color="blue.500" />
      </Box>
    )
  }

  if (!paciente) {
    return (
      <Box textAlign="center" py={20}>
        <Text color="gray.500">Paciente no encontrado.</Text>
        <Button mt={4} onClick={() => navigate("/")}>Volver al inicio</Button>
      </Box>
    )
  }

  const estadoPaciente = ESTADOS_PACIENTE[paciente.estado] || ESTADOS_PACIENTE.activo

  return (
    <Box px={6} py={6}>
      <Toaster />

      {/* Header */}
      <HStack mb={5} gap={4} flexWrap="wrap" align="flex-start">
        <Button variant="ghost" size="sm" colorPalette="blue" onClick={() => navigate("/")}>
          ← Volver
        </Button>
        <Box flex={1}>
          <HStack gap={3} flexWrap="wrap">
            <Heading size="lg" color="gray.800">{paciente.Nombre_Completo}</Heading>
            <Badge colorPalette={estadoPaciente.color} variant="subtle" borderRadius="full" px={3} py={1} fontSize="sm">
              {estadoPaciente.label}
            </Badge>
          </HStack>
          <Text color="gray.500" fontSize="sm" mt={1}>
            DNI: {paciente.dni}
            {paciente.Obra_social && ` | Obra Social: ${paciente.Obra_social}`}
          </Text>
        </Box>
      </HStack>

      {/* Tabs */}
      <Tabs.Root defaultValue="datos">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="datos">Datos del paciente</Tabs.Trigger>
          <Tabs.Trigger value="documentos">Documentos</Tabs.Trigger>
          <Tabs.Trigger value="historial">Historial</Tabs.Trigger>
        </Tabs.List>

        {/* Tab: Datos */}
        <Tabs.Content value="datos">
          <Card.Root borderRadius="xl" boxShadow="md">
            <Card.Body>
              <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
                <FieldRoot>
                  <FieldLabel fontSize="sm">Nombre completo</FieldLabel>
                  <Input value={form.Nombre_Completo || ""} onChange={e => set("Nombre_Completo", e.target.value)} />
                </FieldRoot>
                <FieldRoot>
                  <FieldLabel fontSize="sm">DNI</FieldLabel>
                  <Input value={form.dni || ""} onChange={e => set("dni", e.target.value)} />
                </FieldRoot>
                <FieldRoot>
                  <FieldLabel fontSize="sm">Obra Social</FieldLabel>
                  <Input value={form.Obra_social || ""} onChange={e => set("Obra_social", e.target.value)} />
                </FieldRoot>
                <FieldRoot>
                  <FieldLabel fontSize="sm">N° de Afiliado</FieldLabel>
                  <Input value={form.numero_afiliado || ""} onChange={e => set("numero_afiliado", e.target.value)} />
                </FieldRoot>
                <FieldRoot>
                  <FieldLabel fontSize="sm">Fecha de nacimiento</FieldLabel>
                  <Input type="date" value={form.fecha_nacimiento || ""} onChange={e => set("fecha_nacimiento", e.target.value)} />
                </FieldRoot>
                <FieldRoot>
                  <FieldLabel fontSize="sm">Estado</FieldLabel>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={form.estado || "activo"} onChange={e => set("estado", e.target.value)}>
                      <option value="activo">Activo</option>
                      <option value="baja">Baja</option>
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </FieldRoot>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <FieldRoot>
                    <FieldLabel fontSize="sm">Diagnóstico</FieldLabel>
                    <Textarea value={form.diagnostico || ""} onChange={e => set("diagnostico", e.target.value)} rows={3} placeholder="Diagnóstico principal del paciente" />
                  </FieldRoot>
                </GridItem>
                <FieldRoot>
                  <FieldLabel fontSize="sm">Contacto / Familiar</FieldLabel>
                  <Input value={form.nombre_contacto || ""} onChange={e => set("nombre_contacto", e.target.value)} placeholder="Nombre del familiar o responsable" />
                </FieldRoot>
                <FieldRoot>
                  <FieldLabel fontSize="sm">Teléfono de contacto</FieldLabel>
                  <Input value={form.telefono_contacto || ""} onChange={e => set("telefono_contacto", e.target.value)} placeholder="+54 11 1234-5678" />
                </FieldRoot>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <FieldRoot>
                    <FieldLabel fontSize="sm">Motivo de ingreso</FieldLabel>
                    <Textarea value={form.motivo_ingreso || ""} onChange={e => set("motivo_ingreso", e.target.value)} rows={2} placeholder="Motivo de ingreso al geriátrico..." />
                  </FieldRoot>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <FieldRoot>
                    <FieldLabel fontSize="sm">Antecedentes</FieldLabel>
                    <Textarea value={form.antecedentes || ""} onChange={e => set("antecedentes", e.target.value)} rows={3} placeholder="Antecedentes médicos relevantes..." />
                  </FieldRoot>
                </GridItem>
                <GridItem colSpan={{ base: 1, md: 2 }}>
                  <FieldRoot>
                    <FieldLabel fontSize="sm">Medicación (una por línea)</FieldLabel>
                    <Textarea value={form.medicacion || ""} onChange={e => set("medicacion", e.target.value)} rows={4} placeholder={"Ej:\nMetformina 500mg - 1 comp c/12hs\nAmlodipina 5mg - 1 comp c/día"} />
                  </FieldRoot>
                </GridItem>
              </Grid>
              <Button mt={5} colorPalette="blue" onClick={guardarDatos} loading={guardando}>
                Guardar cambios
              </Button>
            </Card.Body>
          </Card.Root>
        </Tabs.Content>

        {/* Tab: Documentos */}
        <Tabs.Content value="documentos">
          <Card.Root borderRadius="xl" boxShadow="md">
            <Card.Body>
              <DocumentosPanel pacienteId={Number(id)} />
            </Card.Body>
          </Card.Root>
        </Tabs.Content>

        {/* Tab: Historial */}
        <Tabs.Content value="historial">
          <Card.Root borderRadius="xl" boxShadow="md">
            <Card.Body>
              {eventos.length === 0 ? (
                <Text color="gray.400" textAlign="center" py={8}>
                  No hay eventos registrados aún.
                </Text>
              ) : (
                <Stack gap={0}>
                  {eventos.map((ev, i) => (
                    <HStack
                      key={ev.id}
                      gap={4}
                      py={3}
                      borderBottom={i < eventos.length - 1 ? "1px solid" : "none"}
                      borderColor="gray.100"
                      align="flex-start"
                    >
                      <Box w="8px" h="8px" borderRadius="full" bg="blue.400" mt="6px" flexShrink={0} />
                      <Box flex={1}>
                        <Text fontSize="sm" fontWeight="500">{ev.descripcion}</Text>
                        <Text fontSize="xs" color="gray.400" mt={0.5}>
                          {new Date(ev.created_at).toLocaleString("es-AR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </Text>
                      </Box>
                    </HStack>
                  ))}
                </Stack>
              )}
            </Card.Body>
          </Card.Root>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
