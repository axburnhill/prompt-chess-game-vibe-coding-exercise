// Global variables
let tournamentData = [];
let currentSort = { column: 'Rank', ascending: true };
let charts = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    await loadData();
    renderLeaderboard();
    initializeCharts();
    setupEventListeners();
    populatePlayerSelects();
});

// Load CSV data
async function loadData() {
    try {
        const response = await fetch('data/final_standings.csv');
        const csvText = await response.text();
        tournamentData = parseCSV(csvText);
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading tournament data. Please ensure the data file exists.');
    }
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');

    return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
            const value = values[index];
            // Convert numeric fields
            if (['Rank', 'Rating_Mu', 'Rating_Sigma', 'Wins', 'Draws', 'Losses', 'Games', 'Win_Rate'].includes(header)) {
                obj[header] = parseFloat(value);
            } else {
                obj[header] = value;
            }
        });
        return obj;
    });
}

// Render leaderboard table
function renderLeaderboard(data = tournamentData) {
    const tbody = document.getElementById('leaderboard-body');
    tbody.innerHTML = '';

    data.forEach(player => {
        const row = document.createElement('tr');
        row.onclick = () => showPlayerDetails(player);

        const rankClass = player.Rank <= 3 ? `rank-${player.Rank}` : 'rank-other';
        const winRateClass = getWinRateClass(player.Win_Rate);

        row.innerHTML = `
            <td><span class="rank-badge ${rankClass}">${player.Rank}</span></td>
            <td><span class="player-name">${player.Player}</span></td>
            <td>${player.Rating_Mu.toFixed(2)}</td>
            <td>${player.Rating_Sigma.toFixed(2)}</td>
            <td>${player.Wins}</td>
            <td>${player.Draws}</td>
            <td>${player.Losses}</td>
            <td>${player.Games}</td>
            <td><span class="win-rate ${winRateClass}">${(player.Win_Rate * 100).toFixed(1)}%</span></td>
        `;

        tbody.appendChild(row);
    });
}

// Get win rate class for styling
function getWinRateClass(winRate) {
    if (winRate >= 0.6) return 'win-rate-high';
    if (winRate >= 0.4) return 'win-rate-medium';
    return 'win-rate-low';
}

// Sort table
function sortTable(column) {
    if (currentSort.column === column) {
        currentSort.ascending = !currentSort.ascending;
    } else {
        currentSort.column = column;
        currentSort.ascending = true;
    }

    const sortedData = [...tournamentData].sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
        }

        if (aVal < bVal) return currentSort.ascending ? -1 : 1;
        if (aVal > bVal) return currentSort.ascending ? 1 : -1;
        return 0;
    });

    renderLeaderboard(sortedData);
}

// Initialize charts
function initializeCharts() {
    createWinRateChart();
    createRatingChart();
    createGameStatsChart();
    createTopPlayersChart();
}

// Win Rate Distribution Chart
function createWinRateChart() {
    const ctx = document.getElementById('winRateChart');
    const ranges = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    const labels = ['0-20%', '20-40%', '40-60%', '60-80%', '80-100%'];
    const data = new Array(labels.length).fill(0);

    tournamentData.forEach(player => {
        for (let i = 0; i < ranges.length - 1; i++) {
            if (player.Win_Rate >= ranges[i] && player.Win_Rate <= ranges[i + 1]) {
                data[i]++;
                break;
            }
        }
    });

    charts.winRate = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Number of Players',
                data: data,
                backgroundColor: [
                    'rgba(220, 38, 38, 0.7)',
                    'rgba(234, 88, 12, 0.7)',
                    'rgba(234, 179, 8, 0.7)',
                    'rgba(34, 197, 94, 0.7)',
                    'rgba(22, 163, 74, 0.7)'
                ],
                borderColor: [
                    'rgb(220, 38, 38)',
                    'rgb(234, 88, 12)',
                    'rgb(234, 179, 8)',
                    'rgb(34, 197, 94)',
                    'rgb(22, 163, 74)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

// Rating Distribution Chart
function createRatingChart() {
    const ctx = document.getElementById('ratingChart');
    const sortedByRating = [...tournamentData].sort((a, b) => b.Rating_Mu - a.Rating_Mu);

    charts.rating = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedByRating.map((_, i) => i + 1),
            datasets: [{
                label: 'Rating (μ)',
                data: sortedByRating.map(p => p.Rating_Mu),
                borderColor: 'rgb(37, 99, 235)',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Player Rank'
                    }
                },
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Rating'
                    }
                }
            }
        }
    });
}

// Game Statistics Chart
function createGameStatsChart() {
    const ctx = document.getElementById('gameStatsChart');
    const totalWins = tournamentData.reduce((sum, p) => sum + p.Wins, 0);
    const totalDraws = tournamentData.reduce((sum, p) => sum + p.Draws, 0);
    const totalLosses = tournamentData.reduce((sum, p) => sum + p.Losses, 0);

    charts.gameStats = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Wins', 'Draws', 'Losses'],
            datasets: [{
                data: [totalWins, totalDraws, totalLosses],
                backgroundColor: [
                    'rgba(22, 163, 74, 0.8)',
                    'rgba(234, 179, 8, 0.8)',
                    'rgba(220, 38, 38, 0.8)'
                ],
                borderColor: [
                    'rgb(22, 163, 74)',
                    'rgb(234, 179, 8)',
                    'rgb(220, 38, 38)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Top Players Chart
function createTopPlayersChart() {
    const ctx = document.getElementById('topPlayersChart');
    const topPlayers = [...tournamentData]
        .sort((a, b) => b.Win_Rate - a.Win_Rate)
        .slice(0, 10);

    charts.topPlayers = new Chart(ctx, {
        type: 'horizontalBar',
        data: {
            labels: topPlayers.map(p => p.Player),
            datasets: [{
                label: 'Win Rate %',
                data: topPlayers.map(p => (p.Win_Rate * 100).toFixed(1)),
                backgroundColor: 'rgba(37, 99, 235, 0.7)',
                borderColor: 'rgb(37, 99, 235)',
                borderWidth: 2
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Win Rate %'
                    }
                }
            }
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
}

// Handle search
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredData = tournamentData.filter(player =>
        player.Player.toLowerCase().includes(searchTerm)
    );
    renderLeaderboard(filteredData);
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.filter-buttons .btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected section
    document.getElementById(`${sectionName}-section`).classList.add('active');

    // Add active class to clicked button
    event.target.classList.add('active');
}

// Show player details modal
function showPlayerDetails(player) {
    const modal = document.getElementById('playerModal');
    const detailsDiv = document.getElementById('playerDetails');

    const rankClass = player.Rank <= 3 ? `rank-${player.Rank}` : 'rank-other';
    const winRateClass = getWinRateClass(player.Win_Rate);

    detailsDiv.innerHTML = `
        <div class="player-detail-header">
            <h2>${player.Player}</h2>
            <p class="player-detail-rank">
                <span class="rank-badge ${rankClass}">${player.Rank}</span>
                Rank #${player.Rank} of ${tournamentData.length}
            </p>
        </div>
        <div class="detail-stats">
            <div class="detail-stat">
                <div class="detail-stat-label">Rating (μ)</div>
                <div class="detail-stat-value">${player.Rating_Mu.toFixed(2)}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-label">Uncertainty (σ)</div>
                <div class="detail-stat-value">${player.Rating_Sigma.toFixed(2)}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-label">Wins</div>
                <div class="detail-stat-value" style="color: var(--success-color);">${player.Wins}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-label">Draws</div>
                <div class="detail-stat-value" style="color: var(--warning-color);">${player.Draws}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-label">Losses</div>
                <div class="detail-stat-value" style="color: var(--danger-color);">${player.Losses}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-label">Total Games</div>
                <div class="detail-stat-value">${player.Games}</div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-label">Win Rate</div>
                <div class="detail-stat-value">
                    <span class="win-rate ${winRateClass}">${(player.Win_Rate * 100).toFixed(1)}%</span>
                </div>
            </div>
            <div class="detail-stat">
                <div class="detail-stat-label">Win/Loss Ratio</div>
                <div class="detail-stat-value">${player.Losses > 0 ? (player.Wins / player.Losses).toFixed(2) : player.Wins}</div>
            </div>
        </div>
    `;

    modal.style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('playerModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('playerModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Populate player select dropdowns
function populatePlayerSelects() {
    const player1Select = document.getElementById('player1Select');
    const player2Select = document.getElementById('player2Select');

    tournamentData.forEach(player => {
        const option1 = document.createElement('option');
        option1.value = player.Player;
        option1.textContent = `${player.Player} (Rank #${player.Rank})`;
        player1Select.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = player.Player;
        option2.textContent = `${player.Player} (Rank #${player.Rank})`;
        player2Select.appendChild(option2);
    });
}

// Update comparison
function updateComparison() {
    const player1Name = document.getElementById('player1Select').value;
    const player2Name = document.getElementById('player2Select').value;
    const resultDiv = document.getElementById('comparison-result');

    if (!player1Name || !player2Name) {
        resultDiv.innerHTML = '<p class="placeholder-text">Select two players to compare their statistics</p>';
        return;
    }

    const player1 = tournamentData.find(p => p.Player === player1Name);
    const player2 = tournamentData.find(p => p.Player === player2Name);

    resultDiv.innerHTML = `
        <div class="comparison-grid">
            <div class="player-card">
                <h3>${player1.Player}</h3>
                ${generatePlayerStats(player1)}
            </div>
            <div class="comparison-vs">VS</div>
            <div class="player-card">
                <h3>${player2.Player}</h3>
                ${generatePlayerStats(player2)}
            </div>
        </div>
    `;
}

// Generate player stats for comparison
function generatePlayerStats(player) {
    return `
        <div class="stat-row">
            <span class="stat-label">Rank</span>
            <span class="stat-value">#${player.Rank}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Rating (μ)</span>
            <span class="stat-value">${player.Rating_Mu.toFixed(2)}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Wins</span>
            <span class="stat-value">${player.Wins}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Draws</span>
            <span class="stat-value">${player.Draws}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Losses</span>
            <span class="stat-value">${player.Losses}</span>
        </div>
        <div class="stat-row">
            <span class="stat-label">Win Rate</span>
            <span class="stat-value">${(player.Win_Rate * 100).toFixed(1)}%</span>
        </div>
    `;
}

// Export to CSV
function exportToCSV() {
    const headers = ['Rank', 'Player', 'Rating_Mu', 'Rating_Sigma', 'Wins', 'Draws', 'Losses', 'Games', 'Win_Rate'];
    const csvContent = [
        headers.join(','),
        ...tournamentData.map(player =>
            headers.map(header => player[header]).join(',')
        )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tournament_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
}
