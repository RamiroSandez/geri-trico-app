import {
  Box,
  ToastCloseTrigger,
  ToastDescription,
  ToastIndicator,
  ToastRoot,
  ToastTitle,
  Toaster as ChakraToaster,
  createToaster,
} from "@chakra-ui/react";

export const toaster = createToaster({ placement: "top" });

export function Toaster() {
  return (
    <ChakraToaster toaster={toaster}>
      {(toast) => (
        <ToastRoot key={toast.id} type={toast.type}>
          <ToastIndicator />
          <Box flex="1">
            <ToastTitle>{toast.title}</ToastTitle>
            {toast.description && (
              <ToastDescription>{toast.description}</ToastDescription>
            )}
          </Box>
          <ToastCloseTrigger />
        </ToastRoot>
      )}
    </ChakraToaster>
  );
}
