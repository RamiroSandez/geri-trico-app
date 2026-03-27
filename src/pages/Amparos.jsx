import { useState, useEffect } from "react"
import { supabase } from "../services/supabase"
import { useAuth } from "../contexts/AuthContext"
import {
  Box, Button, Card, FieldLabel, FieldRoot,
  Heading, HStack, NativeSelect, Spinner, Stack, Text,
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

const llamarEdgeFunction = async (session, paciente, tipo) => {
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generar-amparo`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`,
      "apikey": import.meta.env.VITE_SUPABASE_KEY,
    },
    body: JSON.stringify({ paciente: buildPacientePayload(paciente), tipo }),
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
  const [pacienteId, setPacienteId] = useState("")
  const [generando, setGenerando] = useState(false)
  const [descargandoZip, setDescargandoZip] = useState(null)

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

  // ── Generar todos los PDFs disponibles ────────────────────────────────────

  const generarAmparo = async () => {
    const paciente = pacientes.find(p => p.id === Number(pacienteId))
    if (!paciente) {
      toaster.create({ title: "Seleccioná un paciente", type: "warning", duration: 3000 })
      return
    }
    const faltantes = validarCamposAmparo(paciente)
    if (faltantes.length > 0) {
      toaster.create({ title: "Faltan datos del paciente", description: `Completá: ${faltantes.join(", ")}`, type: "warning", duration: 6000 })
      return
    }
    const tiposDisponibles = TIPOS_AMPARO.filter(t => t.templateId)
    if (tiposDisponibles.length === 0) {
      toaster.create({ title: "No hay templates configurados aún", type: "warning", duration: 3000 })
      return
    }
    setGenerando(true)
    try {
      const inserts = tiposDisponibles.map(tipo => ({
        geriatrico_id: geriatrico.id,
        paciente_id: paciente.id,
        tipo: tipo.key,
        estado: "amparo_generado",
      }))
      const { error } = await supabase.from("amparos").insert(inserts)
      if (error) throw new Error(error.message)
      fetchAmparos()
      toaster.create({ title: "Amparo generado", type: "success", duration: 3000 })
    } catch (err) {
      toaster.create({ title: "Error al generar", description: err.message, type: "error", duration: 5000 })
    }
    setGenerando(false)
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
      const html = await llamarEdgeFunction(session, paciente, tipo)
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
        try {
          const html = await llamarEdgeFunction(session, paciente, tipo)
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
      <Card.Root borderRadius="xl" boxShadow="md" mb={6} border="1px solid" borderColor="blue.200">
        <Card.Body>
          <Text fontWeight="600" color="text.main" mb={4}>Generar amparos</Text>
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
            <Button colorPalette="blue" onClick={generarAmparo} loading={generando}>
              Generar Amparo
            </Button>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Carpetas por paciente */}
      {cargando ? (
        <Box display="flex" justifyContent="center" py={10}><Spinner size="lg" color="blue.500" /></Box>
      ) : Object.keys(amparosPorPaciente).length === 0 ? (
        <Text color="text.muted" textAlign="center" py={10}>No hay amparos generados aún.</Text>
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
                  {lista.map(a => {
                    return (
                      <HStack key={a.id} justify="space-between" py={2} px={3} borderRadius="md" _hover={{ bg: "bg.hover" }}>
                        <HStack gap={3}>
                          <Text fontSize="xs" color="text.muted" minW="70px">{new Date(a.created_at).toLocaleDateString("es-AR")}</Text>
                          {a.observaciones && <Text fontSize="xs" color="text.faint">{a.observaciones}</Text>}
                        </HStack>
                        <Button size="xs" colorPalette="blue" variant="ghost" onClick={() => descargarPDFDirecto(a)} loading={descargandoZip === a.id}>
                          {tipoLabel(a.tipo)}
                        </Button>
                      </HStack>
                    )
                  })}
                </Stack>
              </Card.Body>
            </Card.Root>
          ))}
        </Stack>
      )}
    </Box>
  )
}
