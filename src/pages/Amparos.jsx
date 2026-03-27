import { useState, useEffect } from "react"
import { supabase } from "../services/supabase"
import { useAuth } from "../contexts/AuthContext"
import {
  Badge, Box, Button, Card, FieldLabel, FieldRoot,
  Heading, HStack, NativeSelect, Spinner, Stack, Text,
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
  const [amparos, setAmparos] = useState([])
  const [pacientes, setPacientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [pacienteId, setPacienteId] = useState("")
  const [generando, setGenerando] = useState(false)
  const [preview, setPreview] = useState(null)
  const [descargando, setDescargando] = useState(false)
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

  // ── Generar ───────────────────────────────────────────────────────────────

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
    setGenerando(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
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
      setPreview({ html: result.html, nombre: paciente.Nombre_Completo, pacienteId: paciente.id })
    } catch (err) {
      toaster.create({ title: "Error al generar", description: err.message, type: "error", duration: 5000 })
    }
    setGenerando(false)
  }

  const descargarPDF = async () => {
    if (!preview) return
    setDescargando(true)
    const html2pdf = (await import("html2pdf.js")).default
    const container = document.createElement("div")
    container.innerHTML = preview.html
    await html2pdf().set({ ...PDF_OPTS, filename: `Amparo - ${preview.nombre}.pdf` }).from(container).save()
    await supabase.from("amparos").insert({
      geriatrico_id: geriatrico.id,
      paciente_id: preview.pacienteId,
      estado: "amparo_generado",
    })
    setDescargando(false)
    setPreview(null)
    fetchAmparos()
    toaster.create({ title: "Amparo descargado", type: "success", duration: 3000 })
  }

  // ── Archivo: descarga directa e individual ────────────────────────────────

  const descargarPDFDirecto = async (amparo) => {
    const paciente = amparo.Pacientes
    const faltantes = validarCamposAmparo(paciente)
    if (faltantes.length > 0) {
      toaster.create({ title: "Faltan datos", description: `Completá: ${faltantes.join(", ")}`, type: "warning", duration: 6000 })
      return
    }
    setGenerando(amparo.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
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
      const html2pdf = (await import("html2pdf.js")).default
      const container = document.createElement("div")
      container.innerHTML = result.html
      await html2pdf().set({ ...PDF_OPTS, filename: `Amparo - ${paciente.Nombre_Completo}.pdf` }).from(container).save()
      toaster.create({ title: "PDF descargado", type: "success", duration: 2000 })
    } catch (err) {
      toaster.create({ title: "Error", description: err.message, type: "error", duration: 5000 })
    }
    setGenerando(null)
  }

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
        try {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generar-amparo`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}`, "apikey": import.meta.env.VITE_SUPABASE_KEY },
            body: JSON.stringify({ paciente: { nombre: paciente.Nombre_Completo, dni: paciente.dni, obra_social: paciente.Obra_social, numero_afiliado: paciente.numero_afiliado || "", fecha_nacimiento: paciente.fecha_nacimiento, diagnostico: paciente.diagnostico, motivo_ingreso: paciente.motivo_ingreso, antecedentes: paciente.antecedentes || "", medicacion: paciente.medicacion?.split("\n").filter(m => m.trim()) || [] } }),
          })
          const result = await response.json()
          if (!response.ok) continue
          const container = document.createElement("div")
          container.innerHTML = result.html
          const pdf = await html2pdf().set(PDF_OPTS).from(container).toPdf().get("pdf")
          const fecha = new Date(amparo.created_at).toLocaleDateString("es-AR").replace(/\//g, "-")
          zip.file(`Amparo - ${nombre} - ${fecha}.pdf`, pdf.output("blob"))
        } catch { continue }
      }
      const blob = await zip.generateAsync({ type: "blob" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `Amparos - ${nombre}.zip`
      a.click()
      URL.revokeObjectURL(url)
      toaster.create({ title: "ZIP descargado", type: "success", duration: 3000 })
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
      <PreviewAmparoModal
        open={!!preview}
        onClose={() => setPreview(null)}
        html={preview?.html || ""}
        nombrePaciente={preview?.nombre || ""}
        onDescargar={descargarPDF}
        descargando={descargando}
      />

      <Heading size="lg" color="text.main" mb={6}>Amparos</Heading>

      {/* Panel generar */}
      <Card.Root borderRadius="xl" boxShadow="md" mb={6} border="1px solid" borderColor="blue.200">
        <Card.Body>
          <Text fontWeight="600" color="text.main" mb={4}>Generar amparo</Text>
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
            <Button colorPalette="blue" onClick={generarAmparo} loading={generando === true}>
              Generar PDF
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
                    <Text fontSize="xs" color="text.muted">{lista.length} amparo{lista.length !== 1 ? "s" : ""}</Text>
                  </Box>
                  {lista.length > 1 && (
                    <Button size="sm" colorPalette="blue" variant="outline" onClick={() => descargarZipPaciente(lista, nombre, pid)} loading={descargandoZip === pid}>
                      Descargar ZIP
                    </Button>
                  )}
                </HStack>
              </Card.Header>
              <Card.Body pt={0}>
                <Stack gap={1}>
                  {lista.map(a => {
                    const estado = ESTADOS_AMPARO[a.estado] || ESTADOS_AMPARO.preparando_documentacion
                    return (
                      <HStack key={a.id} justify="space-between" py={2} px={3} borderRadius="md" _hover={{ bg: "bg.hover" }}>
                        <HStack gap={3}>
                          <Text fontSize="xs" color="text.muted" minW="70px">{new Date(a.created_at).toLocaleDateString("es-AR")}</Text>
                          <Badge colorPalette={estado.color} variant="subtle" borderRadius="full" px={2} fontSize="xs">{estado.label}</Badge>
                          {a.observaciones && <Text fontSize="xs" color="text.faint">{a.observaciones}</Text>}
                        </HStack>
                        <Button size="xs" colorPalette="blue" variant="ghost" onClick={() => descargarPDFDirecto(a)} loading={generando === a.id}>
                          PDF
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
