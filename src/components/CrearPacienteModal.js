import { useState } from "react"
import { supabase } from "../services/supabase"
import {
  Button,
  DialogBackdrop,
  DialogBody,
  DialogCloseTrigger,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogPositioner,
  DialogRoot,
  DialogTitle,
  FieldLabel,
  FieldRoot,
  Input,
  Stack,
  Textarea,
} from "@chakra-ui/react"
import { toaster } from "./toaster"

const FORM_INICIAL = {
  Nombre_Completo: "",
  dni: "",
  Obra_social: "",
  numero_afiliado: "",
  fecha_nacimiento: "",
  diagnostico: "",
  nombre_geriatrico: "",
  telefono_contacto: "",
  nombre_contacto: "",
}

export default function CrearPacienteModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(FORM_INICIAL)
  const [guardando, setGuardando] = useState(false)

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  const guardar = async () => {
    if (!form.Nombre_Completo.trim() || !form.dni.trim()) {
      toaster.create({ title: "Nombre y DNI son obligatorios", type: "error", duration: 3000 })
      return
    }
    setGuardando(true)
    const { error } = await supabase.from("Pacientes").insert([{
      ...form,
      fecha_nacimiento: form.fecha_nacimiento || null,
      estado_amparo: "preparando_documentacion",
    }])
    setGuardando(false)
    if (error) {
      toaster.create({ title: "Error al guardar", description: error.message, type: "error", duration: 4000 })
    } else {
      toaster.create({ title: "Paciente creado", type: "success", duration: 3000 })
      setForm(FORM_INICIAL)
      onCreated?.()
      onClose()
    }
  }

  return (
    <DialogRoot open={open} onOpenChange={e => { if (!e.open) onClose() }} size="lg">
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent borderRadius="xl">
          <DialogHeader>
            <DialogTitle>Nuevo Paciente</DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody>
            <Stack gap={4}>
              <FieldRoot required>
                <FieldLabel fontSize="sm">Nombre completo *</FieldLabel>
                <Input
                  value={form.Nombre_Completo}
                  onChange={e => set("Nombre_Completo", e.target.value)}
                  placeholder="Ej: Juan García"
                />
              </FieldRoot>
              <FieldRoot required>
                <FieldLabel fontSize="sm">DNI *</FieldLabel>
                <Input
                  value={form.dni}
                  onChange={e => set("dni", e.target.value)}
                  placeholder="Ej: 30123456"
                />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Obra Social</FieldLabel>
                <Input
                  value={form.Obra_social}
                  onChange={e => set("Obra_social", e.target.value)}
                  placeholder="Ej: OSDE"
                />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">N° de Afiliado</FieldLabel>
                <Input
                  value={form.numero_afiliado}
                  onChange={e => set("numero_afiliado", e.target.value)}
                  placeholder="Número de afiliado"
                />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Fecha de Nacimiento</FieldLabel>
                <Input
                  type="date"
                  value={form.fecha_nacimiento}
                  onChange={e => set("fecha_nacimiento", e.target.value)}
                />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Geriátrico / Institución</FieldLabel>
                <Input
                  value={form.nombre_geriatrico}
                  onChange={e => set("nombre_geriatrico", e.target.value)}
                  placeholder="Nombre del geriátrico"
                />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Diagnóstico</FieldLabel>
                <Textarea
                  value={form.diagnostico}
                  onChange={e => set("diagnostico", e.target.value)}
                  placeholder="Diagnóstico principal"
                  rows={2}
                />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Contacto / Familiar</FieldLabel>
                <Input
                  value={form.nombre_contacto}
                  onChange={e => set("nombre_contacto", e.target.value)}
                  placeholder="Nombre del contacto"
                />
              </FieldRoot>
              <FieldRoot>
                <FieldLabel fontSize="sm">Teléfono de Contacto</FieldLabel>
                <Input
                  value={form.telefono_contacto}
                  onChange={e => set("telefono_contacto", e.target.value)}
                  placeholder="Ej: +54 11 1234-5678"
                />
              </FieldRoot>
            </Stack>
          </DialogBody>
          <DialogFooter gap={2}>
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button colorPalette="blue" onClick={guardar} loading={guardando}>
              Crear Paciente
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}
