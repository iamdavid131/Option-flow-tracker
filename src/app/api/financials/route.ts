import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.MASSIVE_API_KEY ?? "";
const BASE = "https://api.polygon.io";

/**
 * GET /api/financials?ticker=NVDA&timeframe=annual
 *
 * Returns financial statements (income, balance sheet, cash flow).
 * Supports annual and quarterly timeframes.
 */
export async function GET(req: NextRequest) {
  const ticker = (req.nextUrl.searchParams.get("ticker") ?? "NVDA").toUpperCase();
  const timeframe = req.nextUrl.searchParams.get("timeframe") ?? "annual"; // annual | quarterly

  try {
    const limit = timeframe === "quarterly" ? 12 : 5;
    const url =
      `${BASE}/vX/reference/financials?ticker=${ticker}&timeframe=${timeframe}&limit=${limit}&sort=filing_date&order=desc&apiKey=${API_KEY}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();
    const results = data.results ?? [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const periods = results.map((r: any) => {
      const fin = r.financials ?? {};
      const inc = fin.income_statement ?? {};
      const bs = fin.balance_sheet ?? {};
      const cf = fin.cash_flow_statement ?? {};

      const val = (obj: Record<string, { value?: number }>, key: string) =>
        obj[key]?.value ?? null;

      return {
        fiscalYear: r.fiscal_year,
        fiscalPeriod: r.fiscal_period, // "FY", "Q1", "Q2", etc.
        startDate: r.start_date,
        endDate: r.end_date,
        filingDate: r.filing_date,

        // Income Statement
        revenue: val(inc, "revenues"),
        costOfRevenue: val(inc, "cost_of_revenue"),
        grossProfit: val(inc, "gross_profit"),
        operatingExpenses: val(inc, "operating_expenses"),
        operatingIncome: val(inc, "operating_income_loss"),
        netIncome: val(inc, "net_income_loss"),
        eps: val(inc, "diluted_earnings_per_share"),
        epsBasic: val(inc, "basic_earnings_per_share"),
        ebitda:
          (val(inc, "operating_income_loss") ?? 0) +
          (val(cf, "net_cash_flow_from_operating_activities") ?? 0) -
          (val(inc, "operating_income_loss") ?? 0)
            ? val(cf, "net_cash_flow_from_operating_activities")
            : null,
        researchDev: val(inc, "research_and_development"),
        sga: val(inc, "selling_general_and_administrative_expenses"),
        incomeTax: val(inc, "income_tax_expense_benefit"),
        incomeBeforeTax: val(inc, "income_loss_from_continuing_operations_before_tax"),

        // Balance Sheet
        totalAssets: val(bs, "assets"),
        currentAssets: val(bs, "current_assets"),
        noncurrentAssets: val(bs, "noncurrent_assets"),
        totalLiabilities: val(bs, "liabilities"),
        currentLiabilities: val(bs, "current_liabilities"),
        noncurrentLiabilities: val(bs, "noncurrent_liabilities"),
        totalEquity: val(bs, "equity_attributable_to_parent"),
        inventory: val(bs, "inventory"),
        accountsPayable: val(bs, "accounts_payable"),
        longTermDebt: val(bs, "long_term_debt"),
        fixedAssets: val(bs, "fixed_assets"),
        intangibleAssets: val(bs, "intangible_assets"),

        // Cash Flow
        operatingCashFlow: val(cf, "net_cash_flow_from_operating_activities"),
        investingCashFlow: val(cf, "net_cash_flow_from_investing_activities"),
        financingCashFlow: val(cf, "net_cash_flow_from_financing_activities"),
        netCashFlow: val(cf, "net_cash_flow"),
      };
    });

    return NextResponse.json({
      ticker,
      timeframe,
      periods,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Financials API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch financial data", periods: [] },
      { status: 500 }
    );
  }
}
