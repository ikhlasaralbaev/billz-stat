export type AnomalySeverity = "critical" | "warning" | "info";

export type AnomalyType =
  | "discount_spike"
  | "high_returns"
  | "revenue_drop"
  | "low_margin"
  | "seller_underperformance"
  | "zero_sales_days"
  | "avg_cheque_drop";

export interface Anomaly {
  type: AnomalyType;
  severity: AnomalySeverity;
  entityName: string;   // seller name, shop name, or "General"
  message: string;      // 1 short sentence, in the user's language
  recommendation: string; // 1-2 actionable sentences, in the user's language
  value?: number;       // the metric value that triggered this
}
