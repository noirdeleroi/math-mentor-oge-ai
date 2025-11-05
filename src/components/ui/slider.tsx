import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center cursor-pointer",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-full bg-[#1f2937] border border-white/10">
      <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#a8e063] to-[#56ab2f] transition-all duration-200 ease-out" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-7 w-7 rounded-full border-3 border-white bg-gradient-to-br from-[#a8e063] to-[#56ab2f] shadow-xl shadow-green-500/40 ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#a8e063]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-125 active:scale-110 cursor-grab active:cursor-grabbing" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
