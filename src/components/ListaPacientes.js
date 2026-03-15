import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import {
  Box,
  Button,
  Card,
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
  Heading,
  HStack,
  Input,
  Spinner,
  Table,
  Text,
} from "@chakra-ui/react";
import { Toaster, toaster } from "./toaster";

export default function ListaPacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [editando, setEditando] = useState(null);
  const [eliminando, setEliminando] = useState(null);

  const fetchPacientes = async () => {
    const { data, error } = await supabase
      .from("Pacientes")
      .select("*")
      .order("id", { ascending: true });

    if (!error) setPacientes(data);
    setCargando(false);
  };

  useEffect(() => { fetchPacientes(); }, []);

  const eliminarPaciente = async () => {
    const { error } = await supabase
      .from("Pacientes")
      .delete()
      .eq("id", eliminando.id);

    console.log("eliminar error:", error, "id usado:", eliminando.id);
    if (error) {
      toaster.create({ title: `Error: ${error.message}`, type: "error", duration: 5000 });
    } else {
      toaster.create({ title: "Paciente eliminado", type: "success", duration: 3000 });
      setEliminando(null);
      fetchPacientes();
    }
  };

  const guardarEdicion = async () => {
    const { error } = await supabase
      .from("Pacientes")
      .update({
        Nombre_Completo: editando.Nombre_Completo,
        dni: editando.dni,
        Obra_social: editando.Obra_social,
      })
      .eq("id", editando.id);

    console.log("editar error:", error, "id usado:", editando.id);
    if (error) {
      toaster.create({ title: `Error: ${error.message}`, type: "error", duration: 5000 });
    } else {
      toaster.create({ title: "Paciente actualizado", type: "success", duration: 3000 });
      setEditando(null);
      fetchPacientes();
    }
  };

  return (
    <Box px={4} pb={8}>
      <Toaster />

      <Card.Root boxShadow="lg" borderRadius="xl">
        <Card.Header>
          <Heading size="md" color="blue.600">
            Pacientes Registrados
          </Heading>
        </Card.Header>

        <Card.Body>
          {cargando ? (
            <Box display="flex" justifyContent="center" py={6}>
              <Spinner size="lg" color="blue.500" />
            </Box>
          ) : pacientes.length === 0 ? (
            <Text color="gray.500" textAlign="center" py={6}>
              No hay pacientes registrados.
            </Text>
          ) : (
            <Table.Root size="md" variant="outline">
              <Table.Header>
                <Table.Row bg="gray.50">
                  <Table.ColumnHeader fontWeight="600">Nombre Completo</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="600">DNI</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="600">Obra Social</Table.ColumnHeader>
                  <Table.ColumnHeader fontWeight="600" textAlign="center">Acciones</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {pacientes.map((p) => (
                  <Table.Row key={p.id}>
                    <Table.Cell>{p.Nombre_Completo}</Table.Cell>
                    <Table.Cell>{p.dni}</Table.Cell>
                    <Table.Cell>{p.Obra_social}</Table.Cell>
                    <Table.Cell textAlign="center">
                      <HStack justify="center" gap={2}>
                        <Button
                          size="xs"
                          colorScheme="yellow"
                          variant="outline"
                          onClick={() => setEditando({ ...p })}
                        >
                          Editar
                        </Button>
                        <Button
                          size="xs"
                          colorScheme="red"
                          variant="outline"
                          onClick={() => setEliminando(p)}
                        >
                          Eliminar
                        </Button>
                      </HStack>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </Card.Body>
      </Card.Root>

      {/* Dialog Editar */}
      <DialogRoot open={!!editando} onOpenChange={(e) => { if (!e.open) setEditando(null); }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent borderRadius="xl">
            <DialogHeader>
              <DialogTitle>Editar Paciente</DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <DialogBody>
              {editando && (
                <Box display="flex" flexDirection="column" gap={4}>
                  <FieldRoot>
                    <FieldLabel fontSize="sm">Nombre completo</FieldLabel>
                    <Input
                      value={editando.Nombre_Completo}
                      onChange={(e) => setEditando({ ...editando, Nombre_Completo: e.target.value })}
                    />
                  </FieldRoot>
                  <FieldRoot>
                    <FieldLabel fontSize="sm">DNI</FieldLabel>
                    <Input
                      value={editando.dni}
                      onChange={(e) => setEditando({ ...editando, dni: e.target.value })}
                    />
                  </FieldRoot>
                  <FieldRoot>
                    <FieldLabel fontSize="sm">Obra Social</FieldLabel>
                    <Input
                      value={editando.Obra_social}
                      onChange={(e) => setEditando({ ...editando, Obra_social: e.target.value })}
                    />
                  </FieldRoot>
                </Box>
              )}
            </DialogBody>
            <DialogFooter gap={2}>
              <Button variant="ghost" onClick={() => setEditando(null)}>Cancelar</Button>
              <Button colorScheme="blue" onClick={guardarEdicion}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>

      {/* Dialog Confirmar Eliminar */}
      <DialogRoot open={!!eliminando} onOpenChange={(e) => { if (!e.open) setEliminando(null); }}>
        <DialogBackdrop />
        <DialogPositioner>
          <DialogContent borderRadius="xl">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>
            <DialogCloseTrigger />
            <DialogBody>
              <Text>
                ¿Estás seguro que querés eliminar a{" "}
                <strong>{eliminando?.Nombre_Completo}</strong>?
              </Text>
            </DialogBody>
            <DialogFooter gap={2}>
              <Button variant="ghost" onClick={() => setEliminando(null)}>Cancelar</Button>
              <Button colorScheme="red" onClick={eliminarPaciente}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </DialogPositioner>
      </DialogRoot>
    </Box>
  );
}
