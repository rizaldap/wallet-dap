import { NextResponse } from 'next/server';
import { getCurrentUser, createClient } from '@/lib/supabase/server';
import { formatRupiah } from '@/types';

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const format = searchParams.get('format') || 'html';

        const supabase = await createClient();

        // Fetch all data from Supabase
        const [walletsRes, creditCardsRes, categoriesRes, transactionsRes, goalsRes, goldRes] = await Promise.all([
            supabase.from('wallets').select('*').eq('user_id', user.id),
            supabase.from('credit_cards').select('*').eq('user_id', user.id),
            supabase.from('categories').select('*').eq('user_id', user.id),
            supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
            supabase.from('goals').select('*').eq('owner_id', user.id),
            supabase.from('gold_holdings').select('*').eq('user_id', user.id),
        ]);

        const wallets = walletsRes.data || [];
        const creditCards = creditCardsRes.data || [];
        const categories = categoriesRes.data || [];
        const transactions = transactionsRes.data || [];
        const goals = goalsRes.data || [];
        const goldHoldings = goldRes.data || [];

        // Calculate wallet balances from transactions
        const walletBalances: Record<string, number> = {};
        wallets.forEach(w => { walletBalances[w.id] = w.initial_balance || 0; });
        transactions.forEach(tx => {
            if (tx.type === 'income' && tx.wallet_id) {
                walletBalances[tx.wallet_id] = (walletBalances[tx.wallet_id] || 0) + tx.amount;
            } else if (tx.type === 'expense' && tx.wallet_id) {
                walletBalances[tx.wallet_id] = (walletBalances[tx.wallet_id] || 0) - tx.amount;
            }
        });

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;

        // Monthly transactions
        const monthlyTx = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate.getFullYear() === year && txDate.getMonth() + 1 === month;
        });

        const totalIncome = monthlyTx.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalExpense = monthlyTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const totalBalance = Object.values(walletBalances).reduce((s, b) => s + b, 0);

        // Category breakdown
        const categoryMap = new Map<string, { name: string; icon: string; total: number }>();
        const catLookup = new Map(categories.map(c => [c.id, c]));

        monthlyTx.filter(t => t.type === 'expense').forEach(tx => {
            const cat = catLookup.get(tx.category_id || '');
            if (cat) {
                const existing = categoryMap.get(cat.id) || { name: cat.name, icon: cat.icon, total: 0 };
                existing.total += tx.amount;
                categoryMap.set(cat.id, existing);
            }
        });

        const categoryBreakdown = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);

        // Goals summary
        const activeGoals = goals.filter(g => g.status === 'active');
        const totalGoalsTarget = activeGoals.reduce((s, g) => s + g.target_amount, 0);
        const totalGoalsCurrent = activeGoals.reduce((s, g) => s + g.current_amount, 0);

        // Gold summary
        const totalGoldGrams = goldHoldings.reduce((s, h) => s + (h.total_grams || 0), 0);

        if (format === 'csv') {
            // CSV export
            const headers = ['Date', 'Type', 'Amount', 'Description', 'Category', 'Wallet', 'Notes'];
            const rows = transactions.map(tx => {
                const cat = catLookup.get(tx.category_id || '');
                const wallet = wallets.find(w => w.id === tx.wallet_id);
                return [
                    tx.date,
                    tx.type,
                    tx.amount,
                    `"${(tx.description || '').replace(/"/g, '""')}"`,
                    cat?.name || '',
                    wallet?.name || '',
                    `"${(tx.notes || '').replace(/"/g, '""')}"`,
                ];
            });

            const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            return new Response(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="wallet-dap-transactions-${year}-${month}.csv"`,
                },
            });
        }

        // HTML report
        const html = `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallet-Dap Report - ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; padding: 40px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { font-size: 2rem; margin-bottom: 8px; display: flex; align-items: center; gap: 12px; }
        .logo { width: 40px; height: 40px; border-radius: 8px; }
        .subtitle { color: #888; margin-bottom: 40px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 40px; }
        .card { background: linear-gradient(135deg, #1a1a2e, #16213e); border: 1px solid #333; border-radius: 16px; padding: 24px; }
        .card-title { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
        .card-value { font-size: 1.6rem; font-weight: 700; }
        .card-value.green { color: #22c55e; }
        .card-value.red { color: #ef4444; }
        .card-value.gold { color: #f59e0b; }
        .card-value.blue { color: #3b82f6; }
        .section { background: #111; border: 1px solid #222; border-radius: 16px; padding: 24px; margin-bottom: 24px; }
        h2 { font-size: 1.1rem; margin-bottom: 16px; color: #ddd; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { text-align: left; padding: 12px 8px; border-bottom: 1px solid #222; }
        th { color: #666; font-size: 11px; text-transform: uppercase; }
        .amount { text-align: right; font-family: monospace; }
        .income { color: #22c55e; }
        .expense { color: #ef4444; }
        .progress-bar { background: #333; border-radius: 4px; height: 8px; overflow: hidden; margin-top: 8px; }
        .progress-fill { height: 100%; background: linear-gradient(90deg, #22c55e, #10b981); }
        .footer { text-align: center; color: #666; margin-top: 60px; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>
            <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%2310b981' width='100' height='100' rx='20'/%3E%3Ctext x='50' y='65' text-anchor='middle' fill='white' font-size='50' font-family='sans-serif' font-weight='bold'%3EW%3C/text%3E%3C/svg%3E" class="logo" alt="Logo">
            Wallet-Dap Report
        </h1>
        <p class="subtitle">Generated: ${now.toLocaleString('id-ID')} • Period: ${now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}</p>

        <div class="grid">
            <div class="card">
                <p class="card-title">Total Balance</p>
                <p class="card-value">${formatRupiah(totalBalance)}</p>
            </div>
            <div class="card">
                <p class="card-title">Income Bulan Ini</p>
                <p class="card-value green">+${formatRupiah(totalIncome)}</p>
            </div>
            <div class="card">
                <p class="card-title">Expense Bulan Ini</p>
                <p class="card-value red">-${formatRupiah(totalExpense)}</p>
            </div>
            <div class="card">
                <p class="card-title">Net Savings</p>
                <p class="card-value ${totalIncome - totalExpense >= 0 ? 'green' : 'red'}">${formatRupiah(totalIncome - totalExpense)}</p>
            </div>
            <div class="card">
                <p class="card-title">Goals Progress</p>
                <p class="card-value blue">${totalGoalsTarget > 0 ? ((totalGoalsCurrent / totalGoalsTarget) * 100).toFixed(0) : 0}%</p>
                <div class="progress-bar"><div class="progress-fill" style="width: ${totalGoalsTarget > 0 ? (totalGoalsCurrent / totalGoalsTarget) * 100 : 0}%"></div></div>
            </div>
            <div class="card">
                <p class="card-title">Gold Holdings</p>
                <p class="card-value gold">${totalGoldGrams.toFixed(2)}g</p>
            </div>
        </div>

        ${categoryBreakdown.length > 0 ? `
        <div class="section">
            <h2>📊 Spending by Category</h2>
            <canvas id="categoryChart" height="200"></canvas>
        </div>
        ` : ''}

        <div class="section">
            <h2>🏦 Wallets (${wallets.length})</h2>
            <table>
                <thead><tr><th>Wallet</th><th>Type</th><th class="amount">Balance</th></tr></thead>
                <tbody>
                    ${wallets.map(w => `
                        <tr>
                            <td>${w.icon} ${w.name}</td>
                            <td>${w.type}</td>
                            <td class="amount">${formatRupiah(walletBalances[w.id] || 0)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        ${goals.length > 0 ? `
        <div class="section">
            <h2>🎯 Goals (${goals.length})</h2>
            <table>
                <thead><tr><th>Goal</th><th>Status</th><th class="amount">Progress</th><th class="amount">Target</th></tr></thead>
                <tbody>
                    ${goals.map(g => `
                        <tr>
                            <td>${g.icon} ${g.name}</td>
                            <td>${g.status}</td>
                            <td class="amount">${formatRupiah(g.current_amount)}</td>
                            <td class="amount">${formatRupiah(g.target_amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        <div class="section">
            <h2>📝 Recent Transactions (${Math.min(transactions.length, 30)} of ${transactions.length})</h2>
            <table>
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="amount">Amount</th></tr></thead>
                <tbody>
                    ${transactions.slice(0, 30).map(tx => {
            const cat = catLookup.get(tx.category_id || '');
            return `
                            <tr>
                                <td>${new Date(tx.date).toLocaleDateString('id-ID')}</td>
                                <td>${tx.description || '-'}</td>
                                <td>${cat ? `${cat.icon} ${cat.name}` : '-'}</td>
                                <td class="amount ${tx.type}">${tx.type === 'income' ? '+' : '-'}${formatRupiah(tx.amount)}</td>
                            </tr>
                        `;
        }).join('')}
                </tbody>
            </table>
            ${transactions.length > 30 ? `<p style="text-align:center;color:#666;margin-top:16px;">...dan ${transactions.length - 30} transaksi lainnya</p>` : ''}
        </div>

        <p class="footer">💰 Wallet-Dap • Generated by Supabase</p>
    </div>

    ${categoryBreakdown.length > 0 ? `
    <script>
        new Chart(document.getElementById('categoryChart'), {
            type: 'doughnut',
            data: {
                labels: ${JSON.stringify(categoryBreakdown.map(c => `${c.icon} ${c.name}`))},
                datasets: [{
                    data: ${JSON.stringify(categoryBreakdown.map(c => c.total))},
                    backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'right', labels: { color: '#fff' } } }
            }
        });
    </script>
    ` : ''}
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
