import { useState, useEffect } from "react"
import { supabase } from "../services/supabase"
import { useAuth } from "../contexts/AuthContext"
import {
  Badge,
  Box,
  Button,
  Card,
  FieldLabel,
  FieldRoot,
  Grid,
  Heading,
  HStack,
  Input,
  NativeSelect,
  Spinner,
  Stack,
  Table,
  Text,
  Textarea,
} from "@chakra-ui/react"
import { Toaster, toaster } from "../components/toaster"
import { CATEGORIAS_GASTO } from "../utils/constants"

const formatPesos = (monto) =>
  new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto)

const formatFecha = (d) =>
  new Date(d + "T12:00:00").toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })

const mesAnterior = (mes) => {
  const [y, m] = mes.split("-").map(Number)
  const d = new Date(y, m - 2)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const mesSiguiente = (mes) => {
  const [y, m] = mes.split("-").map(Number)
  const d = new Date(y, m)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const nombreMes = (mes) => {
  const [y, m] = mes.split("-").map(Number)
  return new Date(y, m - 1).toLocaleString("es-AR", { month: "long", year: "numeric" })
}

const mesActual = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export default function Gastos() {
  const { geriatrico } = useAuth()
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [filtroMes, setFiltroMes] = useState(mesActual())
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [form, setForm] = useState({
    categoria: "medicamentos",
    descripcion: "",
    monto: "",
    fecha: new Date().toISOString().split("T")[0],
    proveedor: "",
    notas: "",
  })

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const fetchGastos = async () => {
    setCargando(true)
    const [y, m] = filtroMes.split("-").map(Number)
    const ultimoDia = new Date(y, m, 0).toISOString().split("T")[0]
    const { data, error } = await supabase
      .from("gastos")
      .select("*")
      .eq("geriatrico_id", geriatrico?.id)
      .gte("fecha", `${filtroMes}-01`)
      .lte("fecha", ultimoDia)
      .order("fecha", { ascending: false })
    if (!error) setGastos(data || [])
    setCargando(false)
  }

  useEffect(() => { if (geriatrico?.id) fetchGastos() }, [filtroMes, geriatrico?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const formVacio = { categoria: "medicamentos", descripcion: "", monto: "", fecha: new Date().toISOString().split("T")[0], proveedor: "", notas: "" }

  const abrirNuevo = () => {
    setEditandoId(null)
    setForm(formVacio)
    setMostrarForm(true)
  }

  const abrirEditar = (g) => {
    setEditandoId(g.id)
    setForm({ categoria: g.categoria, descripcion: g.descripcion, monto: String(g.monto), fecha: g.fecha, proveedor: g.proveedor || "", notas: g.notas || "" })
    setMostrarForm(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const guardarGasto = async () => {
    if (!form.descripcion || !form.monto || !form.fecha) {
      toaster.create({ title: "Completá descripción, monto y fecha", type: "warning", duration: 3000 })
      return
    }
    setGuardando(true)
    const datos = {
      categoria: form.categoria,
      descripcion: form.descripcion,
      monto: parseFloat(form.monto),
      fecha: form.fecha,
      proveedor: form.proveedor || null,
      notas: form.notas || null,
      geriatrico_id: geriatrico?.id,
    }
    const { error } = editandoId
      ? await supabase.from("gastos").update(datos).eq("id", editandoId)
      : await supabase.from("gastos").insert(datos)
    setGuardando(false)
    if (error) {
      toaster.create({ title: "Error al guardar", description: error.message, type: "error", duration: 4000 })
    } else {
      toaster.create({ title: editandoId ? "Gasto actualizado" : "Gasto registrado", type: "success", duration: 2000 })
      setForm(formVacio)
      setEditandoId(null)
      setMostrarForm(false)
      fetchGastos()
    }
  }

  const eliminarGasto = async (id) => {
    const { error } = await supabase.from("gastos").delete().eq("id", id)
    if (!error) {
      toaster.create({ title: "Gasto eliminado", type: "success", duration: 2000 })
      fetchGastos()
    }
  }

  const totalMes = gastos.reduce((acc, g) => acc + Number(g.monto), 0)

  const resumenCategorias = Object.entries(CATEGORIAS_GASTO)
    .map(([key, cat]) => ({
      key,
      cat,
      total: gastos.filter(g => g.categoria === key).reduce((acc, g) => acc + Number(g.monto), 0),
    }))
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total)

  return (
    <Box px={6} py={6} maxW="1400px" mx="auto">
      <Toaster />

      {/* Header con navegación de meses */}
      <HStack mb={6} justify="space-between" flexWrap="wrap" gap={3}>
        <HStack gap={3} align="center">
          <Button variant="ghost" size="sm" onClick={() => setFiltroMes(mesAnterior(filtroMes))}>←</Button>
          <Heading size="lg" color="text.main" textTransform="capitalize" minW="220px" textAlign="center">
            {nombreMes(filtroMes)}
          </Heading>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFiltroMes(mesSiguiente(filtroMes))}
            disabled={filtroMes >= mesActual()}
          >→</Button>
        </HStack>
        <Button colorPalette="green" onClick={() => mostrarForm ? (setMostrarForm(false), setEditandoId(null)) : abrirNuevo()}>
          {mostrarForm ? "Cancelar" : "+ Nuevo gasto"}
        </Button>
      </HStack>

      {/* Stat principal */}
      <Grid templateColumns={{ base: "1fr", md: "1fr 1fr 1fr" }} gap={4} mb={6}>
        <Card.Root borderRadius="xl" boxShadow="sm" bg="blue.600" color="white">
          <Card.Body py={5} px={6}>
            <Text fontSize="sm" opacity={0.8} mb={1}>Total del mes</Text>
            <Text fontSize="3xl" fontWeight="bold">{formatPesos(totalMes)}</Text>
            <Text fontSize="xs" opacity={0.7} mt={1}>{gastos.length} gastos registrados</Text>
          </Card.Body>
        </Card.Root>
        {resumenCategorias.slice(0, 2).map(({ key, cat, total }) => (
          <Card.Root key={key} borderRadius="xl" boxShadow="sm" bg="bg.panel">
            <Card.Body py={5} px={6}>
              <HStack justify="space-between" mb={1}>
                <Badge colorPalette={cat.color} variant="subtle" borderRadius="full" px={3} fontSize="xs">
                  {cat.label}
                </Badge>
                <Text fontSize="xs" color="text.faint">
                  {totalMes > 0 ? Math.round((total / totalMes) * 100) : 0}%
                </Text>
              </HStack>
              <Text fontSize="2xl" fontWeight="bold" color={`${cat.color}.600`}>{formatPesos(total)}</Text>
            </Card.Body>
          </Card.Root>
        ))}
      </Grid>

      {/* Formulario */}
      {mostrarForm && (
        <Card.Root borderRadius="xl" boxShadow="md" mb={6} borderLeft="4px solid" borderColor="green.400">
          <Card.Header pb={2}>
            <Heading size="sm" color="text.main">
              {editandoId ? "Editar gasto" : "Registrar nuevo gasto"}
            </Heading>
          </Card.Header>
          <Card.Body>
            <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={4}>
              <FieldRoot>
                <FieldLabel fontSize="sm">Categoría</FieldLabel>
                <NativeSelect.Root>
                  <NativeSelect.Field value={form.categoria} onChange={e => set("categoria", e.target.value)}>
                    {Object.entries(CATEGORIAS_GASTO).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </NativeSelect.Field>
                  <NativeSelect.Indicator />
                </NativeSelect.Root>
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Descripción *</FieldLabel>
                <Input value={form.descripcion} onChange={e => set("descripcion", e.target.value)} placeholder="Ej: Compra de pañales" />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Monto (ARS) *</FieldLabel>
                <Input type="number" value={form.monto} onChange={e => set("monto", e.target.value)} placeholder="0.00" />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Fecha *</FieldLabel>
                <Input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Proveedor</FieldLabel>
                <Input value={form.proveedor} onChange={e => set("proveedor", e.target.value)} placeholder="Nombre del proveedor" />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Notas</FieldLabel>
                <Textarea value={form.notas} onChange={e => set("notas", e.target.value)} rows={1} placeholder="Observaciones..." />
              </FieldRoot>
            </Grid>
            <Button mt={4} colorPalette="green" onClick={guardarGasto} loading={guardando}>
              {editandoId ? "Guardar cambios" : "Guardar gasto"}
            </Button>
          </Card.Body>
        </Card.Root>
      )}

      {/* Layout principal: tabla + resumen */}
      <Grid templateColumns={{ base: "1fr", lg: "1fr 320px" }} gap={6} alignItems="start">

        {/* Tabla */}
        <Card.Root boxShadow="md" borderRadius="xl">
          <Card.Header>
            <Heading size="sm" color="text.main">
              Detalle de gastos — <Text as="span" textTransform="capitalize">{nombreMes(filtroMes)}</Text>
            </Heading>
          </Card.Header>
          <Card.Body p={0}>
            {cargando ? (
              <Box display="flex" justifyContent="center" py={10}>
                <Spinner size="lg" color="blue.500" />
              </Box>
            ) : gastos.length === 0 ? (
              <Box textAlign="center" py={12}>
                <Text fontSize="3xl" mb={2}>💸</Text>
                <Text color="text.faint">No hay gastos registrados para este mes.</Text>
                <Button mt={3} size="sm" colorPalette="green" onClick={() => setMostrarForm(true)}>
                  + Agregar primer gasto
                </Button>
              </Box>
            ) : (
              <Table.Root size="sm">
                <Table.Header>
                  <Table.Row bg="bg.muted">
                    <Table.ColumnHeader fontWeight="600" pl={4}>Fecha</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="600">Categoría</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="600">Descripción</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="600">Proveedor</Table.ColumnHeader>
                    <Table.ColumnHeader fontWeight="600" textAlign="right">Monto</Table.ColumnHeader>
                    <Table.ColumnHeader pr={4}></Table.ColumnHeader>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {gastos.map(g => {
                    const cat = CATEGORIAS_GASTO[g.categoria] || CATEGORIAS_GASTO.otro
                    return (
                      <Table.Row key={g.id} _hover={{ bg: "bg.hover" }}>
                        <Table.Cell pl={4} fontSize="sm" color="text.muted" whiteSpace="nowrap">
                          {formatFecha(g.fecha)}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge colorPalette={cat.color} variant="subtle" borderRadius="full" px={2} fontSize="xs">
                            {cat.label}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell fontWeight="500" fontSize="sm">{g.descripcion}</Table.Cell>
                        <Table.Cell fontSize="sm" color="text.faint">{g.proveedor || "—"}</Table.Cell>
                        <Table.Cell textAlign="right" fontWeight="600" fontSize="sm" color="text.main">
                          {formatPesos(g.monto)}
                        </Table.Cell>
                        <Table.Cell pr={4}>
                          <HStack gap={0}>
                            <Button size="xs" variant="ghost" colorPalette="blue" onClick={() => abrirEditar(g)}>
                              ✏
                            </Button>
                            <Button size="xs" variant="ghost" colorPalette="red" onClick={() => eliminarGasto(g.id)}>
                              ✕
                            </Button>
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

        {/* Resumen por categoría */}
        {gastos.length > 0 && (
          <Card.Root borderRadius="xl" boxShadow="md">
            <Card.Header>
              <Heading size="sm" color="text.main">Resumen por categoría</Heading>
            </Card.Header>
            <Card.Body>
              <Stack gap={4}>
                {resumenCategorias.map(({ key, cat, total }) => {
                  const porcentaje = totalMes > 0 ? Math.round((total / totalMes) * 100) : 0
                  return (
                    <Box key={key}>
                      <HStack justify="space-between" mb={1}>
                        <Text fontSize="sm" fontWeight="500" color="text.main">{cat.label}</Text>
                        <Text fontSize="sm" fontWeight="600" color="text.main">{formatPesos(total)}</Text>
                      </HStack>
                      <Box bg="bg.muted" borderRadius="full" h="6px" overflow="hidden">
                        <Box
                          bg={`${cat.color}.400`}
                          h="100%"
                          borderRadius="full"
                          w={`${porcentaje}%`}
                          transition="width 0.3s"
                        />
                      </Box>
                      <Text fontSize="xs" color="text.faint" mt={0.5}>{porcentaje}% del total</Text>
                    </Box>
                  )
                })}
                <Box borderTop="1px solid" borderColor="border.subtle" pt={3} mt={1}>
                  <HStack justify="space-between">
                    <Text fontWeight="700" color="text.main">Total</Text>
                    <Text fontWeight="700" color="blue.600" fontSize="lg">{formatPesos(totalMes)}</Text>
                  </HStack>
                </Box>
              </Stack>
            </Card.Body>
          </Card.Root>
        )}
      </Grid>
    </Box>
  )
}
