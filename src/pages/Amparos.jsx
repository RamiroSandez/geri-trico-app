import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../services/supabase"
import { useAuth } from "../contexts/AuthContext"
import {
  Badge, Box, Button, Card, FieldLabel, FieldRoot,
  Heading, HStack, Input, NativeSelect, Spinner, Stack, Table, Tabs, Text,
} from "@chakra-ui/react"
import { Toaster, toaster } from "../components/toaster"
import { ESTADOS_AMPARO, validarCamposAmparo } from "../utils/constants"
import PreviewAmparoModal from "../components/PreviewAmparoModal"

const PDF_OPTS = {
  margin: 15,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2 },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
}

export default function Amparos() {
  const { geriatrico } = useAuth()
  const navigate = useNavigate()
  const [amparos, setAmparos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState("todos")
  const [mostrarNuevo, setMostrarNuevo] = useState(false)
  const [form, setForm] = useState({ paciente_id: "", observaciones: "" })
  const [guardando, setGuardando] = useState(false)
  const [generando, setGenerando] = useState(null)
  const [preview, setPreview] = useState(null)
  const [descargando, setDescargando] = useState(false)
  const [descargandoZip, setDescargandoZip] = useState(null) // key del mes

  const fetchAmparos = async () => {
    const { data } = await supabase
      .from("amparos")
      .select("*, Pacientes(id, Nombre_Completo, dni, Obra_social, fecha_nacimiento, diagnostico, motivo_ingreso, antecedentes, medicacion, numero_afiliado)")
      .eq("geriatrico_id", geriatrico?.id)
      .order("created_at", { ascending: false })
    setAmparos(data || [])
    setCargando(false)
  }

  const fetchPacientes = async () => {
    const { data } = await supabase
      .from("Pacientes")
      .select("id, Nombre_Completo")
      .eq("geriatrico_id", geriatrico?.id)
      .order("Nombre_Completo")
    setPacientes(data || [])
  }

  useEffect(() => {
    if (geriatrico?.id) { fetchAmparos(); fetchPacientes() }
  }, [geriatrico?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Helpers ──────────────────────────────────────────────────────────────

  const obtenerSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  }

  const fetchHtmlAmparo = async (paciente, session) => {
    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generar-amparo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": import.meta.env.VITE_SUPABASE_KEY,
      },
      body: JSON.stringify({
        paciente: {
          nombre: paciente.Nombre_Completo,
          dni: paciente.dni,
          obra_social: paciente.Obra_social,
          numero_afiliado: paciente.numero_afiliado || "",
          fecha_nacimiento: paciente.fecha_nacimiento,
          diagnostico: paciente.diagnostico,
          motivo_ingreso: paciente.motivo_ingreso,
          antecedentes: paciente.antecedentes || "",
          medicacion: paciente.medicacion?.split("\n").filter(m => m.trim()) || [],
        },
      }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || `Error ${response.status}`)
    return result.html
  }

  // ── Gestión ───────────────────────────────────────────────────────────────

  const crearAmparo = async () => {
    if (!form.paciente_id) {
      toaster.create({ title: "Seleccioná un paciente", type: "warning", duration: 3000 })
      return
    }
    setGuardando(true)
    const { error } = await supabase.from("amparos").insert({
      geriatrico_id: geriatrico.id,
      paciente_id: Number(form.paciente_id),
      estado: "preparando_documentacion",
      observaciones: form.observaciones || null,
    })
    setGuardando(false)
    if (error) {
      toaster.create({ title: "Error al crear", description: error.message, type: "error", duration: 5000 })
    } else {
      toaster.create({ title: "Amparo creado", type: "success", duration: 2000 })
      setForm({ paciente_id: "", observaciones: "" })
      setMostrarNuevo(false)
      fetchAmparos()
    }
  }

  const cambiarEstado = async (amparoId, nuevoEstado) => {
    await supabase.from("amparos")
      .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
      .eq("id", amparoId)
    setAmparos(prev => prev.map(a => a.id === amparoId ? { ...a, estado: nuevoEstado } : a))
  }

  const generarAmparo = async (amparo) => {
    const paciente = amparo.Pacientes
    const faltantes = validarCamposAmparo(paciente)
    if (faltantes.length > 0) {
      toaster.create({ title: "Faltan datos del paciente", description: `Completá: ${faltantes.join(", ")}`, type: "warning", duration: 6000 })
      return
    }
    setGenerando(amparo.id)
    try {
      const session = await obtenerSession()
      const html = await fetchHtmlAmparo(paciente, session)
      setPreview({ html, nombre: paciente.Nombre_Completo, amparoId: amparo.id })
    } catch (err) {
      toaster.create({ title: "Error al generar", description: err.message, type: "error", duration: 5000 })
    }
    setGenerando(null)
  }

  const descargarPDF = async () => {
    if (!preview) return
    setDescargando(true)
    const html2pdf = (await import("html2pdf.js")).default
    const container = document.createElement("div")
    container.innerHTML = preview.html
    await html2pdf().set({ ...PDF_OPTS, filename: `Amparo - ${preview.nombre}.pdf` }).from(container).save()
    await supabase.from("amparos").update({ estado: "amparo_generado", updated_at: new Date().toISOString() }).eq("id", preview.amparoId)
    setDescargando(false)
    setPreview(null)
    fetchAmparos()
    toaster.create({ title: "Amparo descargado", type: "success", duration: 3000 })
  }

  const eliminarAmparo = async (id) => {
    await supabase.from("amparos").delete().eq("id", id)
    setAmparos(prev => prev.filter(a => a.id !== id))
  }

  // ── Archivo ───────────────────────────────────────────────────────────────

  const descargarPDFDirecto = async (amparo) => {
    const paciente = amparo.Pacientes
    const faltantes = validarCamposAmparo(paciente)
    if (faltantes.length > 0) {
      toaster.create({ title: "Faltan datos del paciente", description: `Completá: ${faltantes.join(", ")}`, type: "warning", duration: 6000 })
      return
    }
    setGenerando(amparo.id)
    try {
      const session = await obtenerSession()
      const html = await fetchHtmlAmparo(paciente, session)
      const html2pdf = (await import("html2pdf.js")).default
      const container = document.createElement("div")
      container.innerHTML = html
      await html2pdf().set({ ...PDF_OPTS, filename: `Amparo - ${paciente.Nombre_Completo}.pdf` }).from(container).save()
      toaster.create({ title: "PDF descargado", type: "success", duration: 2000 })
    } catch (err) {
      toaster.create({ title: "Error al descargar", description: err.message, type: "error", duration: 5000 })
    }
    setGenerando(null)
  }

  const descargarZipMes = async (amparosDelMes, labelMes, keyMes) => {
    setDescargandoZip(keyMes)
    try {
      const session = await obtenerSession()
      const html2pdf = (await import("html2pdf.js")).default
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()

      for (const amparo of amparosDelMes) {
        const paciente = amparo.Pacientes
        const faltantes = validarCamposAmparo(paciente)
        if (faltantes.length > 0) continue // saltar amparos incompletos
        try {
          const html = await fetchHtmlAmparo(paciente, session)
          const container = document.createElement("div")
          container.innerHTML = html
          const worker = html2pdf().set(PDF_OPTS).from(container)
          const pdf = await worker.toPdf().get("pdf")
          const blob = pdf.output("blob")
          zip.file(`Amparo - ${paciente.Nombre_Completo}.pdf`, blob)
        } catch {
          // si falla uno, seguir con los demás
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Amparos - ${labelMes}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toaster.create({ title: `ZIP de ${labelMes} descargado`, type: "success", duration: 3000 })
    } catch (err) {
      toaster.create({ title: "Error al generar ZIP", description: err.message, type: "error", duration: 5000 })
    }
    setDescargandoZip(null)
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const amparosFiltrados = filtroEstado === "todos" ? amparos : amparos.filter(a => a.estado === filtroEstado)

  const amparosPorMes = amparos.reduce((acc, a) => {
    const d = new Date(a.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleString("es-AR", { month: "long", year: "numeric" })
    if (!acc[key]) acc[key] = { label, amparos: [] }
    acc[key].amparos.push(a)
    return acc
  }, {})

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box px={6} py={6}>
      <Toaster />
      <PreviewAmparoModal
        open={!!preview}
        onClose={() => setPreview(null)}
        html={preview?.html || ""}
        nombrePaciente={preview?.nombre || ""}
        onDescargar={descargarPDF}
        descargando={descargando}
      />

      <HStack justify="space-between" mb={6} flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg" color="text.main">Amparos</Heading>
          <Text fontSize="sm" color="text.muted">
            {amparos.length} amparo{amparos.length !== 1 ? "s" : ""} registrado{amparos.length !== 1 ? "s" : ""}
          </Text>
        </Box>
      </HStack>

      <Tabs.Root defaultValue="gestion">
        <Tabs.List mb={5}>
          <Tabs.Trigger value="gestion">Gestión</Tabs.Trigger>
          <Tabs.Trigger value="archivo">Archivo por mes</Tabs.Trigger>
        </Tabs.List>

        {/* ── Tab Gestión ── */}
        <Tabs.Content value="gestion">
          <HStack justify="flex-end" mb={4}>
            <Button colorPalette="blue" onClick={() => setMostrarNuevo(v => !v)}>
              {mostrarNuevo ? "Cancelar" : "+ Nuevo Amparo"}
            </Button>
          </HStack>

          {mostrarNuevo && (
            <Card.Root borderRadius="xl" boxShadow="md" mb={5} border="1px solid" borderColor="blue.200">
              <Card.Body>
                <Stack gap={4}>
                  <Text fontWeight="600" color="text.main">Nuevo Amparo</Text>
                  <HStack gap={4} flexWrap="wrap">
                    <FieldRoot flex={1} minW="200px">
                      <FieldLabel fontSize="sm">Paciente *</FieldLabel>
                      <NativeSelect.Root>
                        <NativeSelect.Field
                          value={form.paciente_id}
                          onChange={e => setForm(prev => ({ ...prev, paciente_id: e.target.value }))}
                          bg="bg.muted"
                        >
                          <option value="">Seleccionar paciente...</option>
                          {pacientes.map(p => (
                            <option key={p.id} value={p.id}>{p.Nombre_Completo}</option>
                          ))}
                        </NativeSelect.Field>
                        <NativeSelect.Indicator />
                      </NativeSelect.Root>
                    </FieldRoot>
                    <FieldRoot flex={2} minW="250px">
                      <FieldLabel fontSize="sm">Observaciones</FieldLabel>
                      <Input
                        placeholder="Notas sobre este amparo..."
                        value={form.observaciones}
                        onChange={e => setForm(prev => ({ ...prev, observaciones: e.target.value }))}
                        bg="bg.muted"
                      />
                    </FieldRoot>
                  </HStack>
                  <HStack>
                    <Button colorPalette="blue" onClick={crearAmparo} loading={guardando}>Crear Amparo</Button>
                    <Button variant="ghost" onClick={() => setMostrarNuevo(false)}>Cancelar</Button>
                  </HStack>
                </Stack>
              </Card.Body>
            </Card.Root>
          )}

          <HStack gap={2} mb={4} flexWrap="wrap">
            <Button size="sm" borderRadius="full" variant={filtroEstado === "todos" ? "solid" : "outline"} colorPalette="gray" onClick={() => setFiltroEstado("todos")}>
              Todos ({amparos.length})
            </Button>
            {Object.entries(ESTADOS_AMPARO).map(([k, v]) => {
              const count = amparos.filter(a => a.estado === k).length
              if (count === 0) return null
              return (
                <Button key={k} size="sm" borderRadius="full" variant={filtroEstado === k ? "solid" : "outline"} colorPalette={v.color} onClick={() => setFiltroEstado(k)}>
                  {v.label} ({count})
                </Button>
              )
            })}
          </HStack>

          <Card.Root borderRadius="xl" boxShadow="md">
            <Card.Body p={0}>
              {cargando ? (
                <Box display="flex" justifyContent="center" py={10}><Spinner size="lg" color="blue.500" /></Box>
              ) : amparosFiltrados.length === 0 ? (
                <Text color="text.muted" textAlign="center" py={10}>
                  {filtroEstado === "todos" ? "No hay amparos registrados." : "No hay amparos con este estado."}
                </Text>
              ) : (
                <Table.Root size="md">
                  <Table.Header>
                    <Table.Row bg="bg.muted">
                      <Table.ColumnHeader fontWeight="600">Paciente</Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="600">Estado</Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="600">Fecha</Table.ColumnHeader>
                      <Table.ColumnHeader fontWeight="600">Observaciones</Table.ColumnHeader>
                      <Table.ColumnHeader></Table.ColumnHeader>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {amparosFiltrados.map(a => {
                      const estado = ESTADOS_AMPARO[a.estado] || ESTADOS_AMPARO.preparando_documentacion
                      return (
                        <Table.Row key={a.id} _hover={{ bg: "bg.hover" }}>
                          <Table.Cell>
                            <Text fontWeight="500" fontSize="sm" cursor="pointer" color="blue.600" onClick={() => navigate(`/paciente/${a.Pacientes?.id}`)} _hover={{ textDecoration: "underline" }}>
                              {a.Pacientes?.Nombre_Completo}
                            </Text>
                            <Text fontSize="xs" color="text.faint">DNI: {a.Pacientes?.dni}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <NativeSelect.Root maxW="200px">
                              <NativeSelect.Field value={a.estado} onChange={e => cambiarEstado(a.id, e.target.value)} fontSize="xs">
                                {Object.entries(ESTADOS_AMPARO).map(([k, v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </NativeSelect.Field>
                              <NativeSelect.Indicator />
                            </NativeSelect.Root>
                            <Badge colorPalette={estado.color} variant="subtle" borderRadius="full" px={2} fontSize="xs" mt={1}>
                              {estado.label}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="xs" color="text.muted">{new Date(a.created_at).toLocaleDateString("es-AR")}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <Text fontSize="xs" color="text.muted" maxW="180px">{a.observaciones || "—"}</Text>
                          </Table.Cell>
                          <Table.Cell>
                            <HStack gap={1}>
                              <Button size="xs" colorPalette="blue" variant="outline" onClick={() => generarAmparo(a)} loading={generando === a.id}>
                                Generar
                              </Button>
                              <Button size="xs" colorPalette="red" variant="ghost" onClick={() => eliminarAmparo(a.id)}>✕</Button>
                            </HStack>
                          </Table.Cell>
                        </Table.Row>
                      )
                    })}
                  </Table.Body>
                </Table.Root>
              )}
            </Card.Body>
          </Card.Root>
        </Tabs.Content>

        {/* ── Tab Archivo ── */}
        <Tabs.Content value="archivo">
          {cargando ? (
            <Box display="flex" justifyContent="center" py={10}><Spinner size="lg" color="blue.500" /></Box>
          ) : Object.keys(amparosPorMes).length === 0 ? (
            <Text color="text.muted" textAlign="center" py={10}>No hay amparos registrados aún.</Text>
          ) : (
            <Stack gap={5}>
              {Object.entries(amparosPorMes).map(([key, { label, amparos: lista }]) => (
                <Card.Root key={key} borderRadius="xl" boxShadow="md">
                  <Card.Header>
                    <HStack justify="space-between" flexWrap="wrap" gap={3}>
                      <Box>
                        <Text fontWeight="700" fontSize="md" color="text.main" textTransform="capitalize">{label}</Text>
                        <Text fontSize="xs" color="text.muted">{lista.length} amparo{lista.length !== 1 ? "s" : ""}</Text>
                      </Box>
                      <Button
                        size="sm" colorPalette="blue" variant="outline"
                        onClick={() => descargarZipMes(lista, label, key)}
                        loading={descargandoZip === key}
                      >
                        Descargar ZIP
                      </Button>
                    </HStack>
                  </Card.Header>
                  <Card.Body p={0}>
                    <Table.Root size="sm">
                      <Table.Header>
                        <Table.Row bg="bg.muted">
                          <Table.ColumnHeader pl={4} fontWeight="600">Paciente</Table.ColumnHeader>
                          <Table.ColumnHeader fontWeight="600">Estado</Table.ColumnHeader>
                          <Table.ColumnHeader fontWeight="600">Fecha</Table.ColumnHeader>
                          <Table.ColumnHeader pr={4}></Table.ColumnHeader>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {lista.map(a => {
                          const estado = ESTADOS_AMPARO[a.estado] || ESTADOS_AMPARO.preparando_documentacion
                          return (
                            <Table.Row key={a.id} _hover={{ bg: "bg.hover" }}>
                              <Table.Cell pl={4}>
                                <Text fontWeight="500" fontSize="sm">{a.Pacientes?.Nombre_Completo}</Text>
                                <Text fontSize="xs" color="text.faint">DNI: {a.Pacientes?.dni}</Text>
                              </Table.Cell>
                              <Table.Cell>
                                <Badge colorPalette={estado.color} variant="subtle" borderRadius="full" px={2} fontSize="xs">
                                  {estado.label}
                                </Badge>
                              </Table.Cell>
                              <Table.Cell>
                                <Text fontSize="xs" color="text.muted">{new Date(a.created_at).toLocaleDateString("es-AR")}</Text>
                              </Table.Cell>
                              <Table.Cell pr={4}>
                                <Button size="xs" colorPalette="blue" variant="ghost" onClick={() => descargarPDFDirecto(a)} loading={generando === a.id}>
                                  PDF
                                </Button>
                              </Table.Cell>
                            </Table.Row>
                          )
                        })}
                      </Table.Body>
                    </Table.Root>
                  </Card.Body>
                </Card.Root>
              ))}
            </Stack>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
