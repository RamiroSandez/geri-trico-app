import { useState, useEffect } from "react"
import { supabase } from "../services/supabase"
import {
  Box, Button, Grid, Heading, HStack, Input, Stack, Text,
  DialogBackdrop, DialogBody, DialogCloseTrigger, DialogContent,
  DialogFooter, DialogHeader, DialogPositioner, DialogRoot, DialogTitle,
} from "@chakra-ui/react"
import { toaster } from "./toaster"

const MEALS = [
  { key: "desayuno", label: "D", full: "Desayuno" },
  { key: "almuerzo", label: "A", full: "Almuerzo" },
  { key: "merienda", label: "M", full: "Merienda" },
  { key: "cena",     label: "C", full: "Cena" },
]

const VITALS = [
  { key: "presion_maxima", label: "Presión Máx." },
  { key: "presion_minima", label: "Presión Mín." },
  { key: "pulso",          label: "Pulso" },
  { key: "temperatura",    label: "Temperatura" },
  { key: "respiracion",    label: "Respiración" },
]

const ROW_H  = "34px"
const SEC_H  = "26px"
const COL_W  = "52px"
const LABEL_W = "190px"

function fechaStr(year, month, dia) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`
}

export default function ControlDiario({ pacienteId }) {
  const today     = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const [medicamentos, setMedicamentos] = useState([])
  const [registroMed, setRegistroMed]   = useState({})   // "fecha-medId" → row
  const [registroSig, setRegistroSig]   = useState({})   // "fecha" → row

  const [diaOpen, setDiaOpen]   = useState(null)
  const [formDia, setFormDia]   = useState({})
  const [guardando, setGuardando] = useState(false)

  const diasEnMes = new Date(year, month + 1, 0).getDate()
  const dias      = Array.from({ length: diasEnMes }, (_, i) => i + 1)
  const todayStr  = today.toISOString().split("T")[0]

  useEffect(() => {
    const primer  = fechaStr(year, month, 1)
    const ultimo  = fechaStr(year, month, diasEnMes)

    supabase
      .from("paciente_medicamentos")
      .select("id, medicamento:medicamento_id(id, nombre)")
      .eq("paciente_id", pacienteId)
      .then(({ data }) => setMedicamentos(data || []))

    supabase
      .from("registro_medicacion_diaria")
      .select("*")
      .eq("paciente_id", pacienteId)
      .gte("fecha", primer)
      .lte("fecha", ultimo)
      .then(({ data }) => {
        const m = {}
        for (const r of (data || [])) m[`${r.fecha}-${r.medicamento_id}`] = r
        setRegistroMed(m)
      })

    supabase
      .from("registro_signos_vitales")
      .select("*")
      .eq("paciente_id", pacienteId)
      .gte("fecha", primer)
      .lte("fecha", ultimo)
      .then(({ data }) => {
        const s = {}
        for (const r of (data || [])) s[r.fecha] = r
        setRegistroSig(s)
      })
  }, [pacienteId, year, month, diasEnMes])

  const abrirDia = (dia) => {
    const fecha = fechaStr(year, month, dia)
    const sig   = registroSig[fecha] || {}
    const meds  = {}
    for (const m of medicamentos) {
      const r = registroMed[`${fecha}-${m.medicamento.id}`]
      meds[m.medicamento.id] = {
        desayuno: r?.desayuno || false,
        almuerzo: r?.almuerzo || false,
        merienda: r?.merienda || false,
        cena:     r?.cena     || false,
      }
    }
    setFormDia({
      fecha, dia,
      signos: {
        presion_maxima: sig.presion_maxima || "",
        presion_minima: sig.presion_minima || "",
        pulso:          sig.pulso          || "",
        temperatura:    sig.temperatura    || "",
        respiracion:    sig.respiracion    || "",
      },
      meds,
    })
    setDiaOpen(dia)
  }

  const toggleComida = (medId, comida) =>
    setFormDia(p => ({
      ...p,
      meds: { ...p.meds, [medId]: { ...p.meds[medId], [comida]: !p.meds[medId][comida] } },
    }))

  const setSigno = (key, val) =>
    setFormDia(p => ({ ...p, signos: { ...p.signos, [key]: val } }))

  const guardar = async () => {
    setGuardando(true)
    const { fecha } = formDia

    const { error: errSig } = await supabase
      .from("registro_signos_vitales")
      .upsert({ paciente_id: pacienteId, fecha, ...formDia.signos }, { onConflict: "paciente_id,fecha" })

    if (errSig) {
      toaster.create({ title: "Error al guardar signos", description: errSig.message, type: "error", duration: 4000 })
      setGuardando(false)
      return
    }

    for (const m of medicamentos) {
      await supabase
        .from("registro_medicacion_diaria")
        .upsert({
          paciente_id:    pacienteId,
          medicamento_id: m.medicamento.id,
          fecha,
          ...formDia.meds[m.medicamento.id],
        }, { onConflict: "paciente_id,medicamento_id,fecha" })
    }

    toaster.create({ title: "Registro guardado", type: "success", duration: 2000 })
    setDiaOpen(null)

    // Refresh
    const primer = fechaStr(year, month, 1)
    const ultimo = fechaStr(year, month, diasEnMes)
    supabase.from("registro_medicacion_diaria").select("*").eq("paciente_id", pacienteId).gte("fecha", primer).lte("fecha", ultimo)
      .then(({ data }) => { const m = {}; for (const r of (data || [])) m[`${r.fecha}-${r.medicamento_id}`] = r; setRegistroMed(m) })
    supabase.from("registro_signos_vitales").select("*").eq("paciente_id", pacienteId).gte("fecha", primer).lte("fecha", ultimo)
      .then(({ data }) => { const s = {}; for (const r of (data || [])) s[r.fecha] = r; setRegistroSig(s) })

    setGuardando(false)
  }

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0);  setYear(y => y + 1) } else setMonth(m => m + 1) }

  const nombreMes = new Date(year, month).toLocaleDateString("es-AR", { month: "long", year: "numeric" })

  return (
    <Box>
      {/* Header */}
      <HStack mb={4} justify="space-between">
        <Heading size="sm" color="text.main" textTransform="capitalize">{nombreMes}</Heading>
        <HStack gap={2}>
          <Button size="xs" variant="outline" onClick={prevMonth}>‹</Button>
          <Button size="xs" variant="outline" onClick={nextMonth}>›</Button>
        </HStack>
      </HStack>

      {/* Grid */}
      <Box overflowX="auto" borderRadius="xl" border="1px solid" borderColor="border.subtle">
        <Box display="flex" minW="max-content">

          {/* ── Left sticky column ── */}
          <Box
            position="sticky"
            left={0}
            zIndex={2}
            w={LABEL_W}
            flexShrink={0}
            borderRight="2px solid"
            borderColor="border.subtle"
            bg="bg.panel"
          >
            {/* Day header spacer */}
            <Box h={ROW_H} borderBottom="1px solid" borderColor="border.subtle" />

            {/* Medicación section */}
            <Box
              h={SEC_H}
              px={3}
              display="flex"
              alignItems="center"
              borderBottom="1px solid"
              borderColor="border.subtle"
              bg="blue.50"
            >
              <Text fontSize="10px" fontWeight="700" color="blue.700" textTransform="uppercase" letterSpacing="wider">
                Medicación
              </Text>
            </Box>
            {medicamentos.length === 0 ? (
              <Box h={ROW_H} px={3} display="flex" alignItems="center" borderBottom="1px solid" borderColor="border.subtle">
                <Text fontSize="xs" color="text.faint">Sin medicamentos asignados</Text>
              </Box>
            ) : medicamentos.map((m, i) => (
              <Box
                key={m.id}
                h={ROW_H}
                px={3}
                display="flex"
                alignItems="center"
                borderBottom="1px solid"
                borderColor="border.subtle"
                bg={i % 2 === 0 ? "bg.panel" : "bg.muted"}
              >
                <Text fontSize="xs" fontWeight="500" color="text.main" noOfLines={1} title={m.medicamento.nombre}>
                  {m.medicamento.nombre}
                </Text>
              </Box>
            ))}

            {/* Signos vitales section */}
            <Box
              h={SEC_H}
              px={3}
              display="flex"
              alignItems="center"
              borderBottom="1px solid"
              borderColor="border.subtle"
              bg="green.50"
            >
              <Text fontSize="10px" fontWeight="700" color="green.700" textTransform="uppercase" letterSpacing="wider">
                Signos Vitales
              </Text>
            </Box>
            {VITALS.map((v, i) => (
              <Box
                key={v.key}
                h={ROW_H}
                px={3}
                display="flex"
                alignItems="center"
                borderBottom={i < VITALS.length - 1 ? "1px solid" : "none"}
                borderColor="border.subtle"
                bg={i % 2 === 0 ? "bg.panel" : "bg.muted"}
              >
                <Text fontSize="xs" color="text.muted">{v.label}</Text>
              </Box>
            ))}
          </Box>

          {/* ── Day columns ── */}
          {dias.map(dia => {
            const fecha   = fechaStr(year, month, dia)
            const eHoy    = fecha === todayStr
            const signo   = registroSig[fecha]
            const tieneAlgo = !!signo || medicamentos.some(m => {
              const r = registroMed[`${fecha}-${m.medicamento.id}`]
              return r && (r.desayuno || r.almuerzo || r.merienda || r.cena)
            })

            return (
              <Box
                key={dia}
                w={COL_W}
                flexShrink={0}
                borderRight="1px solid"
                borderColor="border.subtle"
                cursor="pointer"
                onClick={() => abrirDia(dia)}
                _hover={{ bg: "blue.50" }}
                transition="background 0.1s"
              >
                {/* Day number */}
                <Box
                  h={ROW_H}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  borderBottom="1px solid"
                  borderColor="border.subtle"
                  bg={eHoy ? "blue.600" : tieneAlgo ? "green.100" : "bg.muted"}
                >
                  <Text
                    fontSize="xs"
                    fontWeight="700"
                    color={eHoy ? "white" : tieneAlgo ? "green.800" : "text.main"}
                  >
                    {dia}
                  </Text>
                </Box>

                {/* Medicación section header spacer */}
                <Box h={SEC_H} borderBottom="1px solid" borderColor="border.subtle" bg="blue.50" />

                {/* Medication rows */}
                {medicamentos.length === 0 ? (
                  <Box h={ROW_H} borderBottom="1px solid" borderColor="border.subtle" />
                ) : medicamentos.map((m, i) => {
                  const r = registroMed[`${fecha}-${m.medicamento.id}`]
                  return (
                    <Box
                      key={m.id}
                      h={ROW_H}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      gap="2px"
                      borderBottom="1px solid"
                      borderColor="border.subtle"
                      bg={i % 2 === 0 ? "white" : "gray.50"}
                    >
                      {MEALS.map(meal => (
                        <Box
                          key={meal.key}
                          w="9px"
                          h="9px"
                          borderRadius="2px"
                          bg={r?.[meal.key] ? "blue.500" : "gray.200"}
                          title={meal.full}
                          flexShrink={0}
                        />
                      ))}
                    </Box>
                  )
                })}

                {/* Signos vitales section header spacer */}
                <Box h={SEC_H} borderBottom="1px solid" borderColor="border.subtle" bg="green.50" />

                {/* Vital sign rows */}
                {VITALS.map((v, i) => (
                  <Box
                    key={v.key}
                    h={ROW_H}
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    borderBottom={i < VITALS.length - 1 ? "1px solid" : "none"}
                    borderColor="border.subtle"
                    bg={i % 2 === 0 ? "white" : "gray.50"}
                  >
                    <Text fontSize="10px" fontWeight="500" color={signo?.[v.key] ? "text.main" : "gray.300"}>
                      {signo?.[v.key] || "·"}
                    </Text>
                  </Box>
                ))}
              </Box>
            )
          })}
        </Box>
      </Box>

      {/* Legend */}
      <HStack mt={3} gap={4} flexWrap="wrap">
        {MEALS.map(m => (
          <HStack key={m.key} gap={1}>
            <Box w="9px" h="9px" borderRadius="2px" bg="blue.500" flexShrink={0} />
            <Text fontSize="xs" color="text.faint">{m.label} = {m.full}</Text>
          </HStack>
        ))}
        <HStack gap={1}>
          <Box w="12px" h="12px" borderRadius="sm" bg="green.100" border="1px solid" borderColor="green.300" />
          <Text fontSize="xs" color="text.faint">Día con registro</Text>
        </HStack>
      </HStack>

      {/* ── Modal por día ── */}
      <DialogRoot
        open={diaOpen !== null}
        onOpenChange={e => { if (!e.open) setDiaOpen(null) }}
        size="lg"
      >
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent borderRadius="xl">
            <DialogHeader>
              <DialogTitle>
                {diaOpen && new Date(year, month, diaOpen).toLocaleDateString("es-AR", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric"
                })}
              </DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <DialogBody>
              <Stack gap={5}>
                {/* Medicación */}
                {medicamentos.length > 0 && (
                  <Box>
                    <Text fontWeight="600" fontSize="sm" color="blue.600" mb={3}>Medicación</Text>
                    <Stack gap={3}>
                      {medicamentos.map(m => (
                        <Box key={m.id} p={3} border="1px solid" borderColor="border.subtle" borderRadius="lg">
                          <Text fontSize="sm" fontWeight="600" mb={2}>{m.medicamento.nombre}</Text>
                          <HStack gap={2} flexWrap="wrap">
                            {MEALS.map(meal => {
                              const checked = formDia.meds?.[m.medicamento.id]?.[meal.key] || false
                              return (
                                <Box
                                  key={meal.key}
                                  px={3}
                                  py={1.5}
                                  borderRadius="md"
                                  border="1px solid"
                                  borderColor={checked ? "blue.500" : "border.subtle"}
                                  bg={checked ? "blue.500" : "bg.muted"}
                                  color={checked ? "white" : "text.muted"}
                                  fontSize="sm"
                                  fontWeight="500"
                                  cursor="pointer"
                                  userSelect="none"
                                  onClick={() => toggleComida(m.medicamento.id, meal.key)}
                                  transition="all 0.15s"
                                >
                                  {checked ? "✓" : "○"} {meal.full}
                                </Box>
                              )
                            })}
                          </HStack>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Signos vitales */}
                <Box>
                  <Text fontWeight="600" fontSize="sm" color="green.600" mb={3}>Signos Vitales</Text>
                  <Grid templateColumns="1fr 1fr" gap={3}>
                    {VITALS.map(v => (
                      <Box key={v.key}>
                        <Text fontSize="xs" color="text.faint" mb={1}>{v.label}</Text>
                        <Input
                          size="sm"
                          value={formDia.signos?.[v.key] || ""}
                          onChange={e => setSigno(v.key, e.target.value)}
                          placeholder="—"
                        />
                      </Box>
                    ))}
                  </Grid>
                </Box>
              </Stack>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button variant="ghost" onClick={() => setDiaOpen(null)}>Cancelar</Button>
              <Button colorPalette="blue" onClick={guardar} loading={guardando}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Box>
  )
}
