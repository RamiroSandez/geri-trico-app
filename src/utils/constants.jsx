export const ESTADOS_AMPARO = {
  preparando_documentacion: { label: 'Preparando documentación', color: 'gray' },
  documentacion_completa: { label: 'Documentación completa', color: 'blue' },
  amparo_generado: { label: 'Amparo generado', color: 'purple' },
  presentado: { label: 'Presentado', color: 'orange' },
  cautelar_otorgada: { label: 'Cautelar otorgada', color: 'green' },
  rechazado: { label: 'Rechazado', color: 'red' },
}

export const TIPOS_DOCUMENTO = {
  dni: 'DNI',
  historia_clinica: 'Historia Clínica',
  cert_discapacidad: 'Certificado de Discapacidad',
  negativa_obra_social: 'Negativa de Obra Social',
  presupuesto_geriatrico: 'Presupuesto Geriátrico',
  poder_notarial: 'Poder Notarial',
  otro: 'Otro',
}

export const CATEGORIAS_GASTO = {
  medicamentos: { label: 'Medicamentos', color: 'red' },
  alimentacion: { label: 'Alimentación', color: 'orange' },
  personal: { label: 'Personal / Sueldos', color: 'blue' },
  mantenimiento: { label: 'Mantenimiento', color: 'yellow' },
  servicios: { label: 'Servicios (luz/agua/gas)', color: 'cyan' },
  equipamiento: { label: 'Equipamiento médico', color: 'purple' },
  otro: { label: 'Otro', color: 'gray' },
}

export const COLOR_TIPO_DOCUMENTO = {
  dni: 'blue',
  historia_clinica: 'green',
  cert_discapacidad: 'purple',
  negativa_obra_social: 'red',
  presupuesto_geriatrico: 'orange',
  poder_notarial: 'cyan',
  otro: 'gray',
}

export const CAMPOS_REQUERIDOS_AMPARO = [
  { key: "Nombre_Completo", label: "Nombre completo" },
  { key: "dni",             label: "DNI" },
  { key: "Obra_social",     label: "Obra social" },
  { key: "fecha_nacimiento",label: "Fecha de nacimiento" },
  { key: "diagnostico",     label: "Diagnóstico" },
  { key: "motivo_ingreso",  label: "Motivo de ingreso" },
]

export const validarCamposAmparo = (paciente) =>
  CAMPOS_REQUERIDOS_AMPARO
    .filter(({ key }) => !paciente?.[key])
    .map(({ label }) => label)

export const ROLES_GERIATRICO = {
  admin: { label: "Administrador", color: "blue" },
  gerente: { label: "Gerente", color: "purple" },
  profesional: { label: "Profesional", color: "green" },
}
