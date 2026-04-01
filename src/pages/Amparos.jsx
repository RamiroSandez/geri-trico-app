import { useState, useEffect } from "react"
import { supabase } from "../services/supabase"
import { useAuth } from "../contexts/AuthContext"
import {
  Box, Button, Card, FieldLabel, FieldRoot,
  Heading, HStack, Input, NativeSelect, Spinner, Stack, Text,
} from "@chakra-ui/react"
import { Toaster, toaster } from "../components/toaster"
import { TIPOS_AMPARO, validarCamposAmparo } from "../utils/constants"

const PDF_OPTS = {
  margin: 15,
  image: { type: "jpeg", quality: 0.98 },
  html2canvas: { scale: 2 },
  jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
}

const tipoLabel = (key) => TIPOS_AMPARO.find(t => t.key === key)?.label || key

const mesActual = () => {
  const d = new Date()
  return `${d.toLocaleString("es-AR", { month: "long" }).replace(/^\w/, c => c.toUpperCase())}/${d.getFullYear()}`
}

const buildPacientePayload = (paciente) => ({
  nombre: paciente.Nombre_Completo,
  dni: paciente.dni,
  obra_social: paciente.Obra_social,
  numero_afiliado: paciente.numero_afiliado || "",
  fecha_nacimiento: paciente.fecha_nacimiento,
  diagnostico: paciente.diagnostico,
  motivo_ingreso: paciente.motivo_ingreso,
  antecedentes: paciente.antecedentes || "",
  medicacion: paciente.medicacion?.split("\n").filter(m => m.trim()) || [],
})

const llamarEdgeFunction = async (session, paciente, tipo, geriatrico = {}, extras = {}) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generar-amparo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": import.meta.env.VITE_SUPABASE_KEY,
    },
    body: JSON.stringify({
      paciente: buildPacientePayload(paciente),
      tipo,
      geriatrico: { nombre: geriatrico.nombre || "", nombre_director: geriatrico.nombre_director || "" },
      extras,
    }),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || `Error ${response.status}`)
  return result.html
}

export default function Amparos() {
  const { geriatrico } = useAuth()
  const [amparos, setAmparos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [cargando, setCargando] = useState(true)

  // Generación
  const [pacienteId, setPacienteId] = useState("")
  const [tipoSeleccionado, setTipoSeleccionado] = useState("")
  const [itemsPresupuesto, setItemsPresupuesto] = useState([
    { mes: "Marzo/2026", monto: "3.700.000" },
    { mes: "Abril/2026", monto: "3.700.000" },
    { mes: "Mayo/2026", monto: "3.800.000" },
    { mes: "Junio/2026", monto: "3.800.000" },
    { mes: "Julio/2026", monto: "3.900.000" },
    { mes: "Agosto/2026", monto: "3.900.000" },
    { mes: "Septiembre/2026", monto: "3.900.000" },
    { mes: "Octubre/2026", monto: "4.000.000" },
    { mes: "Noviembre/2026", monto: "4.100.000" },
    { mes: "Diciembre/2026", monto: "4.100.000" },
    { mes: "Enero/2027", monto: "4.200.000" },
    { mes: "Febrero/2027", monto: "4.300.000" },
    { mes: "Marzo/2027", monto: "4.400.000" },
  ])
  const [previsualizando, setPrevisualizando] = useState(false)
  const [htmlPreview, setHtmlPreview] = useState("")
  const [guardandoDoc, setGuardandoDoc] = useState(false)

  // Descarga / eliminación
  const [descargandoZip, setDescargandoZip] = useState(null)
  const [eliminando, setEliminando] = useState(null)

  const tiposDisponibles = TIPOS_AMPARO.filter(t => t.templateId)

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
      .select("id, Nombre_Completo, dni, Obra_social, fecha_nacimiento, diagnostico, motivo_ingreso, antecedentes, medicacion, numero_afiliado")
      .eq("geriatrico_id", geriatrico?.id)
      .order("Nombre_Completo")
    setPacientes(data || [])
  }

  useEffect(() => {
    if (geriatrico?.id) { fetchAmparos(); fetchPacientes() }
  }, [geriatrico?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Previsualizar ─────────────────────────────────────────────────────────

  const previsualizar = async () => {
    const paciente = pacientes.find(p => p.id === Number(pacienteId))
    if (!paciente) {
      toaster.create({ title: "Seleccioná un paciente", type: "warning", duration: 3000 })
      return
    }
    if (!tipoSeleccionado) {
      toaster.create({ title: "Seleccioná un tipo de documento", type: "warning", duration: 3000 })
      return
    }
    const faltantes = validarCamposAmparo(paciente)
    if (faltantes.length > 0) {
      toaster.create({ title: "Faltan datos del paciente", description: `Completá: ${faltantes.join(", ")}`, type: "warning", duration: 6000 })
      return
    }
    const yaExiste = amparos.some(a => a.paciente_id === paciente.id && a.tipo === tipoSeleccionado)
    if (yaExiste) {
      toaster.create({ title: "Ya existe este documento", description: "Eliminalo desde el historial para poder regenerarlo.", type: "warning", duration: 5000 })
      return
    }
    setPrevisualizando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const extras = tipoSeleccionado === "presupuesto"
        ? { item_presupuesto: itemsPresupuesto.filter(i => i.mes && i.monto).map(i => `${i.mes.replace(/\//g, "-")}: $${i.monto}`).join("<br>") }
        : {}
      const html = await llamarEdgeFunction(session, paciente, tipoSeleccionado, geriatrico, extras)
      setHtmlPreview(html)
    } catch (err) {
      toaster.create({ title: "Error al previsualizar", description: err.message, type: "error", duration: 5000 })
    }
    setPrevisualizando(false)
  }

  // ── Guardar documento ─────────────────────────────────────────────────────

  const guardarDocumento = async () => {
    const paciente = pacientes.find(p => p.id === Number(pacienteId))
    if (!paciente) return
    setGuardandoDoc(true)
    try {
      const itemsStr = tipoSeleccionado === "presupuesto"
        ? itemsPresupuesto.filter(i => i.mes && i.monto).map(i => `${i.mes.replace(/\//g, "-")}: $${i.monto}`).join("<br>")
        : null
      const { error } = await supabase.from("amparos").insert({
        geriatrico_id: geriatrico.id,
        paciente_id: paciente.id,
        tipo: tipoSeleccionado,
        estado: "amparo_generado",
        observaciones: itemsStr,
      })
      if (error) throw new Error(error.message)
      setHtmlPreview("")
      setItemsPresupuesto([
        { mes: "Marzo/2026", monto: "3.700.000" },
        { mes: "Abril/2026", monto: "3.700.000" },
        { mes: "Mayo/2026", monto: "3.800.000" },
        { mes: "Junio/2026", monto: "3.800.000" },
        { mes: "Julio/2026", monto: "3.900.000" },
        { mes: "Agosto/2026", monto: "3.900.000" },
        { mes: "Septiembre/2026", monto: "3.900.000" },
        { mes: "Octubre/2026", monto: "4.000.000" },
        { mes: "Noviembre/2026", monto: "4.100.000" },
        { mes: "Diciembre/2026", monto: "4.100.000" },
        { mes: "Enero/2027", monto: "4.200.000" },
        { mes: "Febrero/2027", monto: "4.300.000" },
        { mes: "Marzo/2027", monto: "4.400.000" },
      ])
      setPacienteId("")
      setTipoSeleccionado("")
      fetchAmparos()
      toaster.create({ title: "Documento guardado", type: "success", duration: 2000 })
    } catch (err) {
      toaster.create({ title: "Error al guardar", description: err.message, type: "error", duration: 5000 })
    }
    setGuardandoDoc(false)
  }

  // ── Descarga individual ───────────────────────────────────────────────────

  const descargarPDFDirecto = async (amparo) => {
    const paciente = amparo.Pacientes
    const tipo = amparo.tipo || TIPOS_AMPARO[0].key
    const faltantes = validarCamposAmparo(paciente)
    if (faltantes.length > 0) {
      toaster.create({ title: "Faltan datos", description: `Completá: ${faltantes.join(", ")}`, type: "warning", duration: 6000 })
      return
    }
    setDescargandoZip(amparo.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const extras = amparo.observaciones ? { item_presupuesto: amparo.observaciones } : {}
      const html = await llamarEdgeFunction(session, paciente, tipo, geriatrico, extras)
      const html2pdf = (await import("html2pdf.js")).default
      const container = document.createElement("div")
      container.innerHTML = html
      await html2pdf().set({ ...PDF_OPTS, filename: `${tipoLabel(tipo)} - ${paciente.Nombre_Completo}.pdf` }).from(container).save()
      toaster.create({ title: "PDF descargado", type: "success", duration: 2000 })
    } catch (err) {
      toaster.create({ title: "Error", description: err.message, type: "error", duration: 5000 })
    }
    setDescargandoZip(null)
  }

  // ── ZIP por paciente ──────────────────────────────────────────────────────

  const descargarZipPaciente = async (lista, nombre, key) => {
    setDescargandoZip(key)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const html2pdf = (await import("html2pdf.js")).default
      const JSZip = (await import("jszip")).default
      const zip = new JSZip()
      for (const amparo of lista) {
        const paciente = amparo.Pacientes
        if (validarCamposAmparo(paciente).length > 0) continue
        const tipo = amparo.tipo || TIPOS_AMPARO[0].key
        const extras = amparo.observaciones ? { item_presupuesto: amparo.observaciones } : {}
        try {
          const html = await llamarEdgeFunction(session, paciente, tipo, geriatrico, extras)
          const container = document.createElement("div")
          container.innerHTML = html
          const pdf = await html2pdf().set(PDF_OPTS).from(container).toPdf().get("pdf")
          const fecha = new Date(amparo.created_at).toLocaleDateString("es-AR").replace(/\//g, "-")
          zip.file(`${tipoLabel(tipo)} - ${fecha}.pdf`, pdf.output("blob"))
        } catch { continue }
      }
      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = `${nombre}.zip`; a.click()
      URL.revokeObjectURL(url)
      toaster.create({ title: "Carpeta descargada", type: "success", duration: 3000 })
    } catch (err) {
      toaster.create({ title: "Error al generar ZIP", description: err.message, type: "error", duration: 5000 })
    }
    setDescargandoZip(null)
  }

  // ── Eliminar ─────────────────────────────────────────────────────────────

  const eliminarAmparo = async (id) => {
    setEliminando(id)
    const { error } = await supabase.from("amparos").delete().eq("id", id)
    if (error) {
      toaster.create({ title: "Error al eliminar", description: error.message, type: "error", duration: 4000 })
    } else {
      fetchAmparos()
    }
    setEliminando(null)
  }

  // ── Computed ──────────────────────────────────────────────────────────────

  const amparosPorPaciente = amparos.reduce((acc, a) => {
    const pid = a.Pacientes?.id
    if (!acc[pid]) acc[pid] = { nombre: a.Pacientes?.Nombre_Completo, amparos: [] }
    acc[pid].amparos.push(a)
    return acc
  }, {})

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box px={6} py={6}>
      <Toaster />

      <Heading size="lg" color="text.main" mb={6}>Amparos</Heading>

      {/* Panel generar */}
      {!htmlPreview && (
        <Card.Root borderRadius="xl" boxShadow="md" mb={6} border="1px solid" borderColor="blue.200">
          <Card.Body>
            <Text fontWeight="600" color="text.main" mb={4}>Nuevo documento</Text>
            <Stack gap={4}>
              <HStack gap={4} flexWrap="wrap" alignItems="flex-end">
                <FieldRoot flex={1} minW="220px">
                  <FieldLabel fontSize="sm">Paciente</FieldLabel>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={pacienteId} onChange={e => setPacienteId(e.target.value)} bg="bg.muted">
                      <option value="">Seleccionar paciente...</option>
                      {pacientes.map(p => (
                        <option key={p.id} value={p.id}>{p.Nombre_Completo}</option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </FieldRoot>
                <FieldRoot flex={1} minW="220px">
                  <FieldLabel fontSize="sm">Tipo de documento</FieldLabel>
                  <NativeSelect.Root>
                    <NativeSelect.Field value={tipoSeleccionado} onChange={e => setTipoSeleccionado(e.target.value)} bg="bg.muted">
                      <option value="">Seleccionar tipo...</option>
                      {tiposDisponibles.map(t => (
                        <option key={t.key} value={t.key}>{t.label}</option>
                      ))}
                    </NativeSelect.Field>
                    <NativeSelect.Indicator />
                  </NativeSelect.Root>
                </FieldRoot>
              </HStack>

              {tipoSeleccionado === "presupuesto" && (
                <Box>
                  <Text fontSize="sm" fontWeight="500" mb={2}>Ítems del presupuesto</Text>
                  <Stack gap={2}>
                    {itemsPresupuesto.map((item, i) => (
                      <HStack key={i} gap={2}>
                        <Input
                          value={item.mes}
                          onChange={e => setItemsPresupuesto(prev => prev.map((it, idx) => idx === i ? { ...it, mes: e.target.value } : it))}
                          placeholder="Abril/2026"
                          bg="bg.muted"
                          flex={1}
                        />
                        <Text color="text.muted" flexShrink={0}>$</Text>
                        <Input
                          value={item.monto}
                          onChange={e => setItemsPresupuesto(prev => prev.map((it, idx) => idx === i ? { ...it, monto: e.target.value } : it))}
                          placeholder="3.700.000"
                          bg="bg.muted"
                          flex={1}
                        />
                        {itemsPresupuesto.length > 1 && (
                          <Button
                            size="sm" variant="ghost" colorPalette="red"
                            onClick={() => setItemsPresupuesto(prev => prev.filter((_, idx) => idx !== i))}
                          >
                            ✕
                          </Button>
                        )}
                      </HStack>
                    ))}
                    <Button
                      size="sm" variant="ghost" colorPalette="blue" alignSelf="flex-start"
                      onClick={() => setItemsPresupuesto(prev => [...prev, { mes: "", monto: "" }])}
                    >
                      + Agregar ítem
                    </Button>
                  </Stack>
                </Box>
              )}

              <Box>
                <Button colorPalette="blue" onClick={previsualizar} loading={previsualizando}>
                  Previsualizar
                </Button>
              </Box>
            </Stack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Vista previa */}
      {htmlPreview && (
        <Card.Root borderRadius="xl" boxShadow="md" mb={6}>
          <Card.Header>
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <Text fontWeight="600" color="text.main">Vista previa — {tipoLabel(tipoSeleccionado)}</Text>
              <HStack gap={3}>
                <Button size="sm" variant="outline" onClick={() => setHtmlPreview("")}>
                  Cancelar
                </Button>
                <Button size="sm" colorPalette="blue" onClick={guardarDocumento} loading={guardandoDoc}>
                  Guardar documento
                </Button>
              </HStack>
            </HStack>
          </Card.Header>
          <Card.Body p={0}>
            <Box borderTop="1px solid" borderColor="border.muted">
              <iframe
                srcDoc={htmlPreview}
                style={{ width: "100%", height: "700px", border: "none", display: "block" }}
                title="Vista previa del documento"
              />
            </Box>
          </Card.Body>
        </Card.Root>
      )}

      {/* Carpetas por paciente */}
      {cargando ? (
        <Box display="flex" justifyContent="center" py={10}><Spinner size="lg" color="blue.500" /></Box>
      ) : Object.keys(amparosPorPaciente).length === 0 ? (
        <Text color="text.muted" textAlign="center" py={10}>No hay documentos generados aún.</Text>
      ) : (
        <Stack gap={4}>
          {Object.entries(amparosPorPaciente).map(([pid, { nombre, amparos: lista }]) => (
            <Card.Root key={pid} borderRadius="xl" boxShadow="md">
              <Card.Header>
                <HStack justify="space-between" flexWrap="wrap" gap={3}>
                  <Box>
                    <Text fontWeight="700" fontSize="md" color="text.main">{nombre}</Text>
                    <Text fontSize="xs" color="text.muted">{lista.length} documento{lista.length !== 1 ? "s" : ""}</Text>
                  </Box>
                  <Button size="sm" colorPalette="blue" variant="outline" onClick={() => descargarZipPaciente(lista, nombre, pid)} loading={descargandoZip === pid}>
                    Descargar carpeta
                  </Button>
                </HStack>
              </Card.Header>
              <Card.Body pt={0}>
                <Stack gap={1}>
                  {lista.map(a => (
                    <HStack key={a.id} justify="space-between" py={2} px={3} borderRadius="md" _hover={{ bg: "bg.hover" }}>
                      <Text fontSize="xs" color="text.muted" minW="70px">{new Date(a.created_at).toLocaleDateString("es-AR")}</Text>
                      <HStack gap={1}>
                        <Button size="xs" colorPalette="blue" variant="ghost" onClick={() => descargarPDFDirecto(a)} loading={descargandoZip === a.id}>
                          {tipoLabel(a.tipo)}
                        </Button>
                        <Button size="xs" colorPalette="red" variant="ghost" onClick={() => eliminarAmparo(a.id)} loading={eliminando === a.id}>
                          ✕
                        </Button>
                      </HStack>
                    </HStack>
                  ))}
                </Stack>
              </Card.Body>
            </Card.Root>
          ))}
        </Stack>
      )}
    </Box>
  )
}
