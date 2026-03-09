import { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import Svg, { Rect, Line } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { formatCurrency } from "@/utils/formatCurrency";
import { colors } from "@/theme";
import type { GroupExpense } from "@/types/api.types";

interface MonthlyData {
  month: string;       // "Jan", "Feb", etc.
  monthIndex: number;  // 0-11
  amount: number;
}

interface SpendingChartProps {
  expenses: GroupExpense[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function buildChartData(expenses: GroupExpense[]): { data: MonthlyData[]; year: number } {
  const now = new Date();
  const year = now.getFullYear();

  const monthMap: Record<number, number> = {};
  for (const exp of expenses) {
    const d = new Date(exp.createdAt);
    if (d.getFullYear() === year) {
      const m = d.getMonth();
      monthMap[m] = (monthMap[m] ?? 0) + exp.amount;
    }
  }

  const data: MonthlyData[] = MONTHS.map((month, i) => ({
    month,
    monthIndex: i,
    amount: monthMap[i] ?? 0,
  }));

  return { data, year };
}

function formatYLabel(value: number): string {
  if (value >= 100000) return `${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

export function SpendingChart({ expenses }: SpendingChartProps) {
  const { data, year } = useMemo(() => buildChartData(expenses), [expenses]);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const maxAmount = useMemo(() => Math.max(...data.map((d) => d.amount), 1), [data]);
  const selectedData = data[selectedMonth];
  const peakMonth = useMemo(() => data.reduce((a, b) => (b.amount > a.amount ? b : a), data[0]), [data]);

  // Month-over-month change
  const prevAmount = selectedMonth > 0 ? data[selectedMonth - 1].amount : 0;
  const change = prevAmount > 0
    ? Math.round(((selectedData.amount - prevAmount) / prevAmount) * 100)
    : 0;

  const BAR_WIDTH = 28;
  const BAR_GAP = 8;
  const CHART_HEIGHT = 160;
  const CHART_WIDTH = (BAR_WIDTH + BAR_GAP) * 12 + BAR_GAP;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Spending Overview</Text>
          <Text style={styles.subtitle}>Monthly breakdown · {year}</Text>
        </View>
        <View style={styles.yearBadge}>
          <View style={styles.yearDot} />
          <Text style={styles.yearText}>{year}</Text>
        </View>
      </View>

      {/* Stats cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <Text style={styles.statLabel}>{MONTHS[selectedMonth].toUpperCase()}</Text>
          <Text style={styles.statAmount}>{formatCurrency(selectedData.amount)}</Text>
          {change !== 0 && (
            <Text style={[styles.statChange, change > 0 ? styles.changeUp : styles.changeDown]}>
              {change > 0 ? "↑" : "↓"} {Math.abs(change)}% vs {MONTHS[selectedMonth - 1] ?? "—"}
            </Text>
          )}
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>PEAK MONTH</Text>
          <Text style={styles.peakMonth}>{peakMonth.month}</Text>
          <Text style={styles.peakAmount}>{formatCurrency(peakMonth.amount)}</Text>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Y-axis labels */}
            <View style={styles.yAxisLabels}>
              {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
                <Text key={ratio} style={styles.yLabel}>
                  {formatYLabel(Math.round(maxAmount * ratio))}
                </Text>
              ))}
            </View>

            {/* Bars */}
            <View style={styles.chartArea}>
              <Svg width={CHART_WIDTH} height={CHART_HEIGHT}>
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                  <Line
                    key={ratio}
                    x1={0}
                    y1={CHART_HEIGHT * (1 - ratio)}
                    x2={CHART_WIDTH}
                    y2={CHART_HEIGHT * (1 - ratio)}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                ))}

                {/* Bars */}
                {data.map((d, i) => {
                  const barHeight = maxAmount > 0 ? (d.amount / maxAmount) * (CHART_HEIGHT - 8) : 0;
                  const x = BAR_GAP + i * (BAR_WIDTH + BAR_GAP);
                  const y = CHART_HEIGHT - barHeight;
                  const isSelected = i === selectedMonth;

                  return (
                    <Rect
                      key={i}
                      x={x}
                      y={y}
                      width={BAR_WIDTH}
                      height={Math.max(barHeight, 2)}
                      rx={6}
                      fill={isSelected ? colors.semantic.positive : "rgba(255,255,255,0.12)"}
                      opacity={d.amount === 0 ? 0.3 : 1}
                    />
                  );
                })}
              </Svg>

              {/* Amount label on selected bar */}
              {selectedData.amount > 0 && (
                <Text
                  style={[
                    styles.barLabel,
                    {
                      left:
                        BAR_GAP +
                        selectedMonth * (BAR_WIDTH + BAR_GAP) +
                        BAR_WIDTH / 2 -
                        30,
                    },
                  ]}
                >
                  {formatCurrency(selectedData.amount)}
                </Text>
              )}
            </View>

            {/* X-axis labels (touchable) */}
            <View style={styles.xAxis}>
              {data.map((d, i) => (
                <TouchableOpacity
                  key={i}
                  style={{ width: BAR_WIDTH + BAR_GAP, alignItems: "center" }}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedMonth(i);
                  }}
                >
                  <Text
                    style={[
                      styles.xLabel,
                      i === selectedMonth && styles.xLabelActive,
                    ]}
                  >
                    {d.month}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    color: "#ffffff",
    fontSize: 18,
    fontFamily: "Inter-Bold",
  },
  subtitle: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontFamily: "Inter",
    marginTop: 2,
  },
  yearBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  yearDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.semantic.positive,
  },
  yearText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Inter-SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
    gap: 4,
  },
  statCardPrimary: {
    flex: 1.5,
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    borderColor: "rgba(52, 211, 153, 0.2)",
  },
  statLabel: {
    color: colors.semantic.positive,
    fontSize: 11,
    fontFamily: "Inter-Bold",
    letterSpacing: 0.5,
  },
  statAmount: {
    color: "#ffffff",
    fontSize: 24,
    fontFamily: "Inter-Bold",
  },
  statChange: {
    fontSize: 12,
    fontFamily: "Inter-Medium",
    marginTop: 2,
  },
  changeUp: { color: colors.semantic.negative },
  changeDown: { color: colors.semantic.positive },
  peakMonth: {
    color: "#ffffff",
    fontSize: 22,
    fontFamily: "Inter-Bold",
  },
  peakAmount: {
    color: colors.text.tertiary,
    fontSize: 13,
    fontFamily: "Inter",
  },
  chartContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    padding: 16,
  },
  yAxisLabels: {
    position: "absolute",
    left: -4,
    top: 0,
    height: 160,
    justifyContent: "space-between",
    zIndex: 1,
  },
  yLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontFamily: "Inter",
    width: 35,
    textAlign: "right",
  },
  chartArea: {
    marginLeft: 40,
    position: "relative",
  },
  barLabel: {
    position: "absolute",
    top: -18,
    width: 60,
    textAlign: "center",
    color: colors.text.secondary,
    fontSize: 10,
    fontFamily: "Inter-SemiBold",
  },
  xAxis: {
    flexDirection: "row",
    marginLeft: 40,
    marginTop: 6,
  },
  xLabel: {
    color: colors.text.tertiary,
    fontSize: 10,
    fontFamily: "Inter",
  },
  xLabelActive: {
    color: colors.semantic.positive,
    fontFamily: "Inter-Bold",
  },
});
