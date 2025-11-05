
"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { analyticsData } from "@/lib/data" // This will be replaced by props
import { ChartTooltip, ChartTooltipContent, ChartContainer, ChartLegend } from "../ui/chart"

const chartConfig = {
  completed: {
    label: "Completed",
    color: "hsl(var(--primary))",
  },
  in_progress: {
    label: "In Progress",
    color: "hsl(var(--accent))",
  },
};

interface WorkflowEfficiencyChartProps {
    data: { date: string; completed: number; in_progress: number }[];
}

export function WorkflowEfficiencyChart({ data }: WorkflowEfficiencyChartProps) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 0,
          }}
        >
          <XAxis dataKey="date" stroke="hsl(var(--foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--foreground))" fontSize={12} />
          <ChartTooltip 
            content={<ChartTooltipContent
              indicator="line"
              labelClassName="font-bold"
              className="!bg-card/90 backdrop-blur-sm"
              />}
          />
          <ChartLegend />
          <Line
            type="monotone"
            dataKey="completed"
            stroke="var(--color-completed)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="in_progress"
            name="In Progress"
            stroke="var(--color-in_progress)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
