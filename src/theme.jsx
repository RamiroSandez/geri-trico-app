import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react"

const config = defineConfig({
  conditions: {
    light: ":root &, .light &",
    dark: ".dark &, .dark .chakra-theme:not(.light) &",
  },
  theme: {
    semanticTokens: {
      colors: {
        "bg.page":       { value: { base: "#F8F9FB",  _dark: "#0F1117" } },
        "bg.panel":      { value: { base: "white",    _dark: "#1A1D27" } },
        "bg.muted":      { value: { base: "{colors.gray.50}",  _dark: "#13151F" } },
        "bg.hover":      { value: { base: "{colors.gray.50}",  _dark: "#22263A" } },
        "border.subtle": { value: { base: "{colors.gray.100}", _dark: "#2A2E42" } },
        "text.main":     { value: { base: "{colors.gray.900}", _dark: "{colors.gray.50}"  } },
        "text.muted":    { value: { base: "{colors.gray.500}", _dark: "{colors.gray.400}" } },
        "text.faint":    { value: { base: "{colors.gray.400}", _dark: "{colors.gray.600}" } },
      },
    },
  },
})

export const system = createSystem(defaultConfig, config)
