
"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import {
  ChartTooltipContent,
  ChartTooltip,
  ChartContainer,
} from "@/components/ui/chart"

const chartConfig = {
  time: {
    label: "Time",
    color: "hsl(var(--primary))",
  },
}

interface ProcessingTimesChartProps {
    data: { department: string; time: number }[];
}

export function ProcessingTimesChart({ data }: ProcessingTimesChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="department"
            stroke="hsl(var(--foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}d`}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent 
              formatter={(value, name) => [`${(value as number).toFixed(1)} days`, "Avg Time"]}
              labelClassName="font-bold"
              className="!bg-card/90 backdrop-blur-sm"
            />}
          />
          <Bar dataKey="time" fill="var(--color-time)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
