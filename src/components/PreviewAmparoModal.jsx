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
  HStack,
} from "@chakra-ui/react"

export default function PreviewAmparoModal({ open, onClose, html, nombrePaciente, onDescargar, descargando }) {
  return (
    <DialogRoot open={open} onOpenChange={e => { if (!e.open) onClose() }} size="cover">
      <DialogBackdrop />
      <DialogPositioner>
        <DialogContent borderRadius="xl" maxH="95vh" display="flex" flexDirection="column">
          <DialogHeader>
            <DialogTitle>Vista previa — Amparo {nombrePaciente}</DialogTitle>
          </DialogHeader>
          <DialogCloseTrigger />
          <DialogBody flex={1} p={0} overflow="hidden">
            <iframe
              srcDoc={html}
              style={{ width: "100%", height: "100%", minHeight: "70vh", border: "none" }}
              title="Vista previa amparo"
            />
          </DialogBody>
          <DialogFooter gap={2}>
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button colorPalette="blue" onClick={onDescargar} loading={descargando}>
              Descargar PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPositioner>
    </DialogRoot>
  )
}
