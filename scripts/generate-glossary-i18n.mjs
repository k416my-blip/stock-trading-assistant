import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'src/constants/glossary.ts'), 'utf8');
const ja = {};
const re =
  /^\s+(\w+):\s*\{\s*label:\s*'((?:\\'|[^'])*)',\s*description:\s*'((?:\\'|[^'])*)'/gm;
let m;
while ((m = re.exec(src))) {
  ja[m[1]] = {
    label: m[2].replace(/\\'/g, "'"),
    description: m[3].replace(/\\'/g, "'"),
  };
}

const enMap = {
  stock: ['Stock', 'A company share name'],
  stockPrice: ['Stock price', 'Price per share'],
  buy: ['Buy', 'Purchasing shares'],
  sell: ['Sell', 'Selling shares'],
  portfolioHoldings: ['Holdings', 'Stocks you currently own'],
  investmentAmount: ['Investment amount', 'Money used for stocks'],
  virtualCapital: ['Virtual capital', 'Practice money'],
  unrealizedPnL: ['Unrealized P/L', 'Gain/loss on shares not yet sold'],
  realizedPnL: ['Realized P/L', 'Profit or loss from completed sales'],
  takeProfit: ['Take profit', 'Selling while in profit'],
  stopLoss: ['Stop loss', 'Selling before losses grow'],
  dividend: ['Dividend', 'Part of company profits paid to shareholders'],
  dividendYield: ['Dividend yield', 'Dividend relative to stock price'],
  per: ['P/E ratio', 'How expensive the stock is vs earnings'],
  marketCap: ['Market cap', 'Total market value of the company'],
  volume: ['Volume', 'Amount of shares traded'],
  rsi: ['RSI', 'Overbought/oversold indicator'],
  movingAverage: ['Moving average', 'Average price trend line'],
  buySignal: ['Buy signal', 'Sign suggesting a buy'],
  sellSignal: ['Sell signal', 'Sign suggesting a sell'],
  portfolio: ['Portfolio', 'List of your assets'],
  returnPct: ['Return', 'Percentage gain or loss'],
  risk: ['What is risk?', 'Chance of loss. Higher risk can mean bigger swings.'],
  brokerageFee: ['Brokerage fee', 'Cost of each trade'],
  cashBalance: ['Cash balance', 'Money not yet invested'],
  holdingsValue: ['Holdings value', 'Current value of your stocks at market price'],
  winRate: ['Win rate', 'Share of profitable trades'],
  buyingPower: ['Buying power', 'Estimated money available to buy stocks'],
  practiceMode: ['Practice mode', 'Practice without real money'],
  entry: ['Entry', 'Reference buy-in price'],
  cashReserve: ['Cash reserve', 'Money kept uninvested'],
  allocationPct: ['Allocation %', 'Percent of funds per stock'],
  estimatedShares: ['Est. shares', 'Approximate shares for the amount'],
  diversification: ['Diversification', 'Spreading across multiple stocks'],
  allocationPlan: ['Allocation plan', 'Suggested split across buy candidates'],
  fractionalShares: ['Fractional shares', 'Buying less than one share (broker-dependent)'],
  sharesHeld: ['Shares held', 'Number of shares you own'],
  holdingAllocationPct: ['Allocation %', 'This stock as % of portfolio'],
  purchaseAmount: ['Purchase amount', 'Total cost at buy (price × shares)'],
  currentValuation: ['Current value', 'Estimated value if sold now'],
  currentStockPrice: ['Current price', 'Latest stock price'],
  sellAll: ['Sell all', 'Sell every holding'],
  newsScore: ['News score', 'Whether recent news is positive or negative'],
  earningsScore: ['Earnings score', 'Whether company performance is improving'],
  snsScore: ['Social score', 'Social media sentiment (can change quickly)'],
  historicalScore: ['Historical data', 'Reference score from past price action'],
  pbr: ['P/B ratio', 'Stock price vs book value'],
  roe: ['ROE', 'Return on equity'],
  debtRatio: ['Debt ratio', 'How much debt the company has'],
  recommendationScore: ['Overall score', 'Combined reference score (out of 100)'],
  longTermInvesting: ['Long-term investing?', 'Holding for months to years'],
  shortTermTrading: ['Short-term trading?', 'Trading over days to weeks'],
  investmentStyle: ['Investment style', 'Risk and time horizon preference'],
  suggestedStopLossTotal: ['Suggested stop-loss', 'Stop price × shares reference'],
  suggestedTakeProfitTotal: ['Suggested take-profit', 'Target price × shares reference'],
  avgBuyPrice: ['Avg buy price', 'Average cost per share across buys'],
  stopLossUnitPrice: ['Stop-loss price', 'Per-share stop reference'],
  takeProfitUnitPrice: ['Take-profit price', 'Per-share target reference'],
};

const zhMap = {
  stock: ['股票', '公司名称'],
  stockPrice: ['股价', '每股价格'],
  buy: ['买入', '购买股票'],
  sell: ['卖出', '出售股票'],
  portfolioHoldings: ['持仓', '您目前持有的股票'],
  investmentAmount: ['投资金额', '用于股票的资金'],
  virtualCapital: ['虚拟资金', '练习用资金'],
  unrealizedPnL: ['浮动盈亏', '尚未卖出股票的盈亏'],
  realizedPnL: ['已实现盈亏', '卖出后确定的盈亏'],
  takeProfit: ['止盈', '有盈利时卖出'],
  stopLoss: ['止损', '在亏损扩大前卖出'],
  dividend: ['股息', '公司分给股东的部分利润'],
  dividendYield: ['股息率', '股息相对股价的比例'],
  per: ['市盈率', '股价相对盈利的指标'],
  marketCap: ['市值', '公司市场总价值'],
  volume: ['成交量', '交易的股票数量'],
  rsi: ['RSI', '超买/超卖指标'],
  movingAverage: ['移动平均线', '股价平均趋势线'],
  buySignal: ['买入信号', '建议买入的信号'],
  sellSignal: ['卖出信号', '建议卖出的信号'],
  portfolio: ['投资组合', '您持有的资产列表'],
  returnPct: ['回报率', '投资增减的百分比'],
  risk: ['什么是风险？', '亏损的可能性。风险越高波动可能越大。'],
  brokerageFee: ['手续费', '每笔交易的费用'],
  cashBalance: ['现金余额', '尚未买入股票的现金'],
  holdingsValue: ['持仓市值', '按当前股价计算的持仓价值'],
  winRate: ['胜率', '盈利交易的比例'],
  buyingPower: ['购买力', '可用于买入股票的估计金额'],
  practiceMode: ['练习模式', '不使用真实资金的练习'],
  entry: ['入场价', '买入参考价格'],
  cashReserve: ['现金储备', '保留不立即使用的资金'],
  allocationPct: ['配置比例', '每只股票的资金占比'],
  estimatedShares: ['预估股数', '该金额大约可买的股数'],
  diversification: ['分散投资', '不集中于一只股票'],
  allocationPlan: ['推荐配置', '将资金分配到多个买入候选的参考方案'],
  fractionalShares: ['碎股', '不足一股的交易（取决于券商）'],
  sharesHeld: ['持有股数', '您持有的股票数量'],
  holdingAllocationPct: ['配置比例', '该股票占投资组合的百分比'],
  purchaseAmount: ['买入金额', '买入时的单价×股数'],
  currentValuation: ['当前估值', '现在卖出的估计价值'],
  currentStockPrice: ['当前股价', '最新股价'],
  sellAll: ['全部卖出', '卖出所有持仓'],
  newsScore: ['新闻评分', '近期新闻对股价的影响'],
  earningsScore: ['财报评分', '公司业绩是否改善'],
  snsScore: ['社交评分', '社交媒体情绪（变化较快）'],
  historicalScore: ['历史数据', '基于过去走势的参考评分'],
  pbr: ['市净率', '股价相对净资产'],
  roe: ['净资产收益率', '股本回报率'],
  debtRatio: ['负债率', '公司负债程度'],
  recommendationScore: ['综合推荐度', '多项分析的综合参考分（满分100）'],
  longTermInvesting: ['什么是长期投资？', '持有数月到数年'],
  shortTermTrading: ['什么是短期交易？', '数日到数周的交易'],
  investmentStyle: ['投资风格', '风险和时间范围的偏好'],
  suggestedStopLossTotal: ['建议止损金额', '止损价×股数的参考'],
  suggestedTakeProfitTotal: ['建议止盈金额', '目标价×股数的参考'],
  avgBuyPrice: ['平均买入价', '多次买入的每股平均成本'],
  stopLossUnitPrice: ['止损单价', '每股止损参考价'],
  takeProfitUnitPrice: ['止盈单价', '每股目标参考价'],
};

const en = {};
const zh = {};
for (const [k, v] of Object.entries(ja)) {
  en[k] = enMap[k]
    ? { label: enMap[k][0], description: enMap[k][1] }
    : { label: v.label, description: v.description };
  zh[k] = zhMap[k]
    ? { label: zhMap[k][0], description: zhMap[k][1] }
    : { label: v.label, description: v.description };
}

const bundles = {
  ja: { ...ja, explainTitle: '{{term}}の説明' },
  en: { ...en, explainTitle: 'About {{term}}' },
  'zh-Hans': { ...zh, explainTitle: '关于{{term}}' },
};

for (const [loc, data] of Object.entries(bundles)) {
  const out = path.join(ROOT, 'src/i18n/resources', loc, 'glossary.json');
  fs.writeFileSync(out, `${JSON.stringify(data, null, 2)}\n`);
}
console.log(`glossary written: ${Object.keys(ja).length} terms`);
