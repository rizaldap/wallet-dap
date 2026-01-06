import { NextResponse } from 'next/server';
import * as sheetsData from '@/lib/sheets/data';
import { formatRupiah } from '@/types';

export async function GET() {
    try {
        // Fetch all data
        const [wallets, creditCards, categories, transactions] = await Promise.all([
            sheetsData.getWallets(),
            sheetsData.getCreditCards(),
            sheetsData.getCategories(),
            sheetsData.getTransactions(),
        ]);

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Calculate summaries
        const monthlyTx = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getFullYear() === year && txDate.getMonth() + 1 === month;
        });

        const totalIncome = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExpense = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const totalBalance = wallets.reduce((s, w) => s + (w.balance || 0), 0);

        // Category breakdown
        const categoryMap = new Map<string, { name: string; icon: string; total: number }>();
        const catLookup = new Map(categories.map(c => [c.id, c]));

        monthlyTx.filter(t => t.type === 'expense').forEach(tx => {
            const cat = catLookup.get(tx.categoryId || '');
            if (cat) {
                const existing = categoryMap.get(cat.id) || { name: cat.name, icon: cat.icon, total: 0 };
                existing.total += tx.amount;
                categoryMap.set(cat.id, existing);
            }
        });

        const categoryBreakdown = Array.from(categoryMap.values())
            .sort((a, b) => b.total - a.total);

        // Generate HTML report
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallet-Dap Report - ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 2rem; margin-bottom: 8px; }
        .subtitle { color: #888; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .card { background: #111; border: 1px solid #222; border-radius: 16px; padding: 24px; }
        .card-title { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .card-value { font-size: 2rem; font-weight: 600; }
        .card-value.green { color: #22c55e; }
        .card-value.red { color: #ef4444; }
        .chart-container { background: #111; border: 1px solid #222; border-radius: 16px; padding: 24px; margin-bottom: 40px; }
        h2 { font-size: 1.2rem; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #222; }
        th { color: #666; font-size: 12px; text-transform: uppercase; }
        .amount { text-align: right; }
        .income { color: #22c55e; }
        .expense { color: #ef4444; }
        .footer { text-align: center; color: #666; margin-top: 60px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>💰 Wallet-Dap Financial Report</h1>
        <p class="subtitle">Generated on ${now.toLocaleString('id-ID')}</p>

        <div class="grid">
            <div class="card">
                <p class="card-title">Total Balance</p>
                <p class="card-value">${formatRupiah(totalBalance)}</p>
            </div>
            <div class="card">
                <p class="card-title">Income (${now.toLocaleDateString('id-ID', { month: 'short' })})</p>
                <p class="card-value green">+${formatRupiah(totalIncome)}</p>
            </div>
            <div class="card">
                <p class="card-title">Expense (${now.toLocaleDateString('id-ID', { month: 'short' })})</p>
                <p class="card-value red">-${formatRupiah(totalExpense)}</p>
            </div>
            <div class="card">
                <p class="card-title">Net Savings</p>
                <p class="card-value ${totalIncome - totalExpense >= 0 ? 'green' : 'red'}">${formatRupiah(totalIncome - totalExpense)}</p>
            </div>
        </div>

        <div class="chart-container">
            <h2>📊 Spending by Category</h2>
            <canvas id="categoryChart" height="300"></canvas>
        </div>

        <div class="chart-container">
            <h2>🏦 Wallets</h2>
            <table>
                <thead>
                    <tr><th>Wallet</th><th>Type</th><th class="amount">Balance</th></tr>
                </thead>
                <tbody>
                    ${wallets.map(w => `
                        <tr>
                            <td>${w.icon} ${w.name}</td>
                            <td>${w.type}</td>
                            <td class="amount">${formatRupiah(w.balance || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${creditCards.length > 0 ? `
        <div class="chart-container">
            <h2>💳 Credit Cards</h2>
            <table>
                <thead>
                    <tr><th>Card</th><th class="amount">Balance</th><th class="amount">Limit</th></tr>
                </thead>
                <tbody>
                    ${creditCards.map(c => `
                        <tr>
                            <td>${c.name}</td>
                            <td class="amount expense">${formatRupiah(c.currentBalance || 0)}</td>
                            <td class="amount">${formatRupiah(c.limit || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="chart-container">
            <h2>📝 Recent Transactions (${transactions.length} total)</h2>
            <table>
                <thead>
                    <tr><th>Date</th><th>Description</th><th>Category</th><th class="amount">Amount</th></tr>
                </thead>
                <tbody>
                    ${transactions.slice(0, 50).map(tx => {
            const cat = catLookup.get(tx.categoryId || '');
            return `
                            <tr>
                                <td>${new Date(tx.date).toLocaleDateString('id-ID')}</td>
                                <td>${tx.description}</td>
                                <td>${cat ? `${cat.icon} ${cat.name}` : '-'}</td>
                                <td class="amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${formatRupiah(tx.amount)}</td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
            ${transactions.length > 50 ? `<p style="text-align:center;color:#666;margin-top:16px;">...and ${transactions.length - 50} more transactions</p>` : ''}
        </div>

        <p class="footer">💰 Wallet-Dap · Powered by Google Sheets</p>
    </div>

    <script>
        const ctx = document.getElementById('categoryChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(categoryBreakdown.map(c => `${c.icon} ${c.name}`))},
                datasets: [{
                    data: ${JSON.stringify(categoryBreakdown.map(c => c.total))},
                    backgroundColor: ['#fff', '#aaa', '#666', '#444', '#333', '#222'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'right', labels: { color: '#fff' } }
                }
            }
        });
    </script>
</body>
</html>`;

        return new NextResponse(html, {
            headers: {
                'Content-Type': 'text/html',
                'Content-Disposition': `attachment; filename="wallet-dap-report-${year}-${month}.html"`,
            },
        });
    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to export data' },
            { status: 500 }
        );
    }
}
