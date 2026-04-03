import { serve } from "https://deno.land/std@0.170.0/http/server.ts"

const TEMPLATE_IDS: Record<string, string> = {
  resumen_historia_clinica: "148LbUTSyofdAs625zdr1FPSgMtMRFAzVRCrmOnsFTcE",
  presupuesto: "1Ufa6kkS01kys2yZnQSjEBP54vg3NBWiiqqbFNghFLi0",
  tipo_3: "1ajhujyE4wSc8e34tPKpOT_z-b5YvbUh-AdLB3VmPupo",
  tipo_4: "",
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

async function getServiceAccountToken(): Promise<string> {
  const clientEmail = Deno.env.get("GOOGLE_CLIENT_EMAIL")!
  const privateKeyRaw = Deno.env.get("GOOGLE_PRIVATE_KEY")!
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n")

  const header = { alg: "RS256", typ: "JWT" }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")

  const headerB64 = encode(header)
  const payloadB64 = encode(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  const pemBody = privateKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "")
  const binaryKey = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")

  const jwt = `${signingInput}.${sigB64}`

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })
  const tokenData = await tokenRes.json()
  if (!tokenData.access_token) throw new Error(`Token error: ${JSON.stringify(tokenData)}`)
  return tokenData.access_token
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const { paciente, tipo, geriatrico = {}, extras = {} } = await req.json()

    const templateId = TEMPLATE_IDS[tipo]
    if (!templateId) throw new Error(`Tipo de documento no válido o sin template asignado: ${tipo}`)

    const token = await getServiceAccountToken()

    // Export template as HTML (read-only, no quota used)
    const exportRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${templateId}/export?mimeType=text/html`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!exportRes.ok) {
      const errText = await exportRes.text()
      throw new Error(`Error exportando template: ${errText}`)
    }

    let html = await exportRes.text()

    // Normalize HTML entities inside placeholders {…} so accented chars match
    html = html.replace(/\{[^}]{1,60}\}/g, (match) =>
      match
        .replace(/&aacute;/g, "á").replace(/&#225;/g, "á")
        .replace(/&eacute;/g, "é").replace(/&#233;/g, "é")
        .replace(/&iacute;/g, "í").replace(/&#237;/g, "í")
        .replace(/&oacute;/g, "ó").replace(/&#243;/g, "ó")
        .replace(/&uacute;/g, "ú").replace(/&#250;/g, "ú")
        .replace(/&ntilde;/g, "ñ").replace(/&#241;/g, "ñ")
    )

    // Calcular edad
    const edad = paciente.fecha_nacimiento
      ? Math.floor((Date.now() - new Date(paciente.fecha_nacimiento).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : ""

    const medicacion = Array.isArray(paciente.medicacion)
      ? paciente.medicacion.join("\n")
      : paciente.medicacion || ""

    const fecha = new Date().toLocaleDateString("es-AR")

    const reemplazos: [string, string][] = [
      ["{fecha_amparo}", fecha],
      ["{nombre_completo}", paciente.nombre || ""],
      ["{dni}", paciente.dni || ""],
      ["{edad}", String(edad)],
      ["{fecha_nacimiento}", paciente.fecha_nacimiento || ""],
      ["{obra_social}", paciente.obra_social || ""],
      ["{numero_afiliado}", paciente.numero_afiliado || ""],
      ["{motivo_ingreso}", paciente.motivo_ingreso || ""],
      ["{diagnóstico_actual}", paciente.diagnostico || ""],
      ["{diagnostico_actual}", paciente.diagnostico || ""],
      ["{antecedentes}", paciente.antecedentes || ""],
      ["{medicación}", medicacion],
      ["{medicacion}", medicacion],
      ["{nombre_geriatrico}", geriatrico.nombre || ""],
      ["{nombre_director}", geriatrico.nombre_director || ""],
      ["{item_presupuesto}", extras.item_presupuesto || ""],
      ["{monto_letras}", extras.monto_letras || ""],
      ["{monto_numerico}", extras.monto_numerico || ""],
      ["{periodo}", extras.periodo || ""],
    ]

    for (const [placeholder, value] of reemplazos) {
      html = html.split(placeholder).join(value)
    }

    return new Response(JSON.stringify({ html }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
