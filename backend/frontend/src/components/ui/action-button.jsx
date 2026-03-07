import * as React from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

/**
 * ActionButton - Un bouton avec tooltip intégré
 * Simplifie l'ajout de tooltips sur les boutons d'action de l'application
 * 
 * @param {string} tooltip - Le texte du tooltip à afficher
 * @param {React.ReactNode} children - Le contenu du bouton (icône, texte, etc.)
 * @param {object} props - Toutes les autres props du Button de shadcn/ui
 */
export const ActionButton = React.forwardRef(({ tooltip, children, ...props }, ref) => {
  if (!tooltip) {
    // Si pas de tooltip, retourner juste le bouton
    return <Button ref={ref} {...props}>{children}</Button>
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button ref={ref} {...props}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
})

ActionButton.displayName = "ActionButton"
