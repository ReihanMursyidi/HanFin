"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"

import {
   Popover,
   PopoverContent,
   PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
   value?: Date;
   onSelect?: (date: Date | undefined) => void;
}

export function DatePicker({ value, onSelect }: DatePickerProps) {
   return (
      <Popover>
         <PopoverTrigger asChild>
            <Button
               variant="outline"
               data-empty={!value}
               className="justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
            >
               <CalendarIcon />
               {value ? format(value, "PPP") : <span>Pick a date</span>}
            </Button>
         </PopoverTrigger>
         <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={value} onSelect={onSelect} />
         </PopoverContent>
      </Popover>
   )
}