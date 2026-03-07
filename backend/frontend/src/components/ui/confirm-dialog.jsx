import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./alert-dialog";

export function ConfirmDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  onConfirm,
  confirmText = "Confirmer",
  cancelText = "Annuler",
  variant = "default" // "default" ou "destructive"
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-line">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className={variant === "destructive" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Composant interne pour le dialogue de confirmation qui utilise les refs
const InternalConfirmDialog = React.memo(function InternalConfirmDialog({ stateRef, openState, onOpenChange }) {
  const state = stateRef.current;
  return (
    <ConfirmDialog
      open={openState}
      onOpenChange={onOpenChange}
      title={state.title}
      description={state.description}
      onConfirm={state.onConfirm}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      variant={state.variant}
    />
  );
});

// Hook personnalisé pour faciliter l'utilisation
export function useConfirmDialog() {
  const [open, setOpen] = React.useState(false);
  const stateRef = React.useRef({
    title: '',
    description: '',
    onConfirm: () => {},
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    variant: 'default'
  });

  const confirm = React.useCallback(({
    title,
    description,
    onConfirm,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    variant = 'default'
  }) => {
    // Stocker les valeurs dans le ref (ne cause pas de re-render)
    stateRef.current = {
      title,
      description,
      onConfirm,
      confirmText,
      cancelText,
      variant
    };
    // Seul setOpen cause un re-render
    setOpen(true);
  }, []);

  const handleOpenChange = React.useCallback((newOpen) => {
    setOpen(newOpen);
  }, []);

  // Composant stable qui ne change jamais d'identité
  const ConfirmDialogComponent = React.useCallback(() => (
    <InternalConfirmDialog
      stateRef={stateRef}
      openState={open}
      onOpenChange={handleOpenChange}
    />
  ), [open, handleOpenChange]);

  return { confirm, ConfirmDialog: ConfirmDialogComponent };
}
