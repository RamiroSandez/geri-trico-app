import { useState } from "react";
import { supabase } from "../services/supabase";
import {
  Box,
  Button,
  Card,
  FieldLabel,
  FieldRoot,
  Heading,
  Input,
  Stack,
} from "@chakra-ui/react";
import { Toaster, toaster } from "./toaster";

export default function CrearPaciente() {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [obraSocial, setObraSocial] = useState("");

  const guardarPaciente = async () => {
    const { error } = await supabase
      .from("Pacientes")
      .insert([
        {
          Nombre_Completo: nombre,
          dni: dni,
          Obra_social: obraSocial,
        },
      ]);

    if (error) {
      console.log(error);
      toaster.create({
        title: "Error al guardar",
        description: error.message,
        type: "error",
        duration: 4000,
      });
    } else {
      toaster.create({
        title: "Paciente creado exitosamente",
        type: "success",
        duration: 3000,
      });
      setNombre("");
      setDni("");
      setObraSocial("");
    }
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      px={4}
      pb={6}
    >
      <Toaster />

      <Card.Root w="100%" maxW="440px" boxShadow="lg" borderRadius="xl">
        <Card.Header pb={0}>
          <Heading size="md" textAlign="center" color="blue.600">
            Crear Paciente
          </Heading>
        </Card.Header>

        <Card.Body>
          <Stack gap={4}>
            <FieldRoot>
              <FieldLabel fontSize="sm">Nombre completo</FieldLabel>
              <Input
                placeholder="Ej: Juan García"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </FieldRoot>

            <FieldRoot>
              <FieldLabel fontSize="sm">DNI</FieldLabel>
              <Input
                placeholder="Ej: 30123456"
                value={dni}
                onChange={(e) => setDni(e.target.value)}
              />
            </FieldRoot>

            <FieldRoot>
              <FieldLabel fontSize="sm">Obra Social</FieldLabel>
              <Input
                placeholder="Ej: OSDE"
                value={obraSocial}
                onChange={(e) => setObraSocial(e.target.value)}
              />
            </FieldRoot>

            <Button
              colorScheme="blue"
              onClick={guardarPaciente}
              mt={2}
              w="100%"
            >
              Guardar Paciente
            </Button>
          </Stack>
        </Card.Body>
      </Card.Root>
    </Box>
  );
}
