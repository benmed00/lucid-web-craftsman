import { useTheme } from "next-themes"
import { Toaster as Sonner, toast } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:max-w-[90vw] sm:group-[.toaster]:max-w-md",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:shadow-sm group-[.toast]:hover:bg-primary/90 group-[.toast]:transition-colors group-[.toast]:whitespace-nowrap",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg group-[.toast]:px-3 group-[.toast]:py-2 group-[.toast]:text-sm group-[.toast]:font-medium group-[.toast]:hover:bg-muted/80 group-[.toast]:transition-colors group-[.toast]:whitespace-nowrap",
        },
      }}
      {...props}
    />
  )
}

export { Toaster, toast }
