// Logs Management JavaScript
class LogsManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.currentSort = { field: 'created_at', direction: 'desc' };
        this.filters = {};
        
        this.init();
    }

    init() {
        this.initEventListeners();
        this.calculateStats();
        this.setupPagination();
        this.applyInitialSort();
    }

    initEventListeners() {
        // Refresh logs
        document.getElementById('refreshLogs')?.addEventListener('click', () => {
            this.refreshLogs();
        });

        // Export logs
        document.getElementById('exportLogs')?.addEventListener('click', () => {
            this.exportLogs();
        });

        // Filter controls
        document.getElementById('applyFilters')?.addEventListener('click', () => {
            this.applyFilters();
        });

        document.getElementById('clearFilters')?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Items per page
        document.getElementById('itemsPerPage')?.addEventListener('change', (e) => {
            this.itemsPerPage = parseInt(e.target.value);
            this.setupPagination();
            this.renderTable();
        });

        // Sort buttons
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const field = e.currentTarget.dataset.sort;
                this.sortTable(field);
            });
        });

        // Pagination
        document.getElementById('prevPage')?.addEventListener('click', () => {
            this.previousPage();
        });

        document.getElementById('nextPage')?.addEventListener('click', () => {
            this.nextPage();
        });

        // Log details modal
        document.querySelectorAll('.view-log-details').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.showLogDetails(e.currentTarget);
            });
        });

        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModal();
            });
        });

        // Close modal on backdrop click
        document.getElementById('logDetailsModal')?.addEventListener('click', (e) => {
            if (e.target.id === 'logDetailsModal') {
                this.hideModal();
            }
        });
    }

    applyFilters() {
        this.filters = {
            user: document.getElementById('filterUser')?.value.trim() || '',
            event: document.getElementById('filterEvent')?.value || '',
            dateFrom: document.getElementById('filterDateFrom')?.value || '',
            dateTo: document.getElementById('filterDateTo')?.value || ''
        };

        this.currentPage = 1;
        this.renderTable();
        this.calculateStats();
    }

    clearFilters() {
        document.getElementById('filterUser').value = '';
        document.getElementById('filterEvent').value = '';
        document.getElementById('filterDateFrom').value = '';
        document.getElementById('filterDateTo').value = '';

        this.filters = {};
        this.currentPage = 1;
        this.renderTable();
        this.calculateStats();
    }

    sortTable(field) {
        if (this.currentSort.field === field) {
            this.currentSort.direction = this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSort.field = field;
            this.currentSort.direction = 'asc';
        }

        this.updateSortIndicators();
        this.renderTable();
    }

    updateSortIndicators() {
        document.querySelectorAll('.sort-btn').forEach(btn => {
            const indicator = btn.querySelector('.sort-indicator');
            if (btn.dataset.sort === this.currentSort.field) {
                indicator.textContent = this.currentSort.direction === 'asc' ? '↑' : '↓';
            } else {
                indicator.textContent = '↕';
            }
        });
    }

    applyInitialSort() {
        this.updateSortIndicators();
    }

    calculateStats() {
        const logs = Array.from(document.querySelectorAll('.log-row'));
        
        const stats = {
            login: logs.filter(row => row.dataset.event.includes('login')).length,
            failedLogin: logs.filter(row => row.dataset.event.includes('failed') || row.dataset.event.includes('error')).length,
            passwordChange: logs.filter(row => row.dataset.event.includes('password')).length,
            userManagement: logs.filter(row => row.dataset.event.includes('user_')).length
        };

        document.getElementById('loginCount').textContent = stats.login;
        document.getElementById('failedLoginCount').textContent = stats.failedLogin;
        document.getElementById('passwordChangeCount').textContent = stats.passwordChange;
        document.getElementById('userManagementCount').textContent = stats.userManagement;
    }

    setupPagination() {
        const visibleLogs = this.getVisibleLogs();
        const totalPages = Math.ceil(visibleLogs.length / this.itemsPerPage);
        
        document.getElementById('totalPages').textContent = totalPages;
        document.getElementById('currentPage').textContent = this.currentPage;
        
        document.getElementById('prevPage').disabled = this.currentPage === 1;
        document.getElementById('nextPage').disabled = this.currentPage === totalPages;
        
        document.getElementById('logsCount').textContent = Math.min(
            this.itemsPerPage, 
            visibleLogs.length - (this.currentPage - 1) * this.itemsPerPage
        );
    }

    getVisibleLogs() {
        const allLogs = Array.from(document.querySelectorAll('.log-row'));
        
        return allLogs.filter(log => {
            const userMatch = !this.filters.user || 
                log.dataset.user.toLowerCase().includes(this.filters.user.toLowerCase());
            const eventMatch = !this.filters.event || 
                log.dataset.event.includes(this.filters.event);
            const dateMatch = (!this.filters.dateFrom || log.dataset.date >= this.filters.dateFrom) &&
                            (!this.filters.dateTo || log.dataset.date <= this.filters.dateTo);
            
            return userMatch && eventMatch && dateMatch;
        });
    }

    renderTable() {
        const visibleLogs = this.getVisibleLogs();
        
        // Sort logs
        visibleLogs.sort((a, b) => {
            let aValue = a.dataset[this.currentSort.field];
            let bValue = b.dataset[this.currentSort.field];
            
            if (this.currentSort.field === 'created_at') {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (aValue < bValue) return this.currentSort.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return this.currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Hide all logs first
        document.querySelectorAll('.log-row').forEach(row => {
            row.style.display = 'none';
        });

        // Show logs for current page
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        
        visibleLogs.slice(startIndex, endIndex).forEach(log => {
            log.style.display = '';
        });

        this.setupPagination();
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderTable();
        }
    }

    nextPage() {
        const visibleLogs = this.getVisibleLogs();
        const totalPages = Math.ceil(visibleLogs.length / this.itemsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderTable();
        }
    }

    showLogDetails(button) {
        const modal = document.getElementById('logDetailsModal');
        
        document.getElementById('modalLogId').textContent = button.dataset.logId;
        document.getElementById('modalLogDate').textContent = button.dataset.date;
        document.getElementById('modalLogUser').textContent = button.dataset.username || '-';
        document.getElementById('modalLogEvent').textContent = button.dataset.event;
        document.getElementById('modalLogDetails').textContent = button.dataset.details || 'Brak szczegółów';
        
        modal.style.display = 'flex';
    }

    hideModal() {
        document.getElementById('logDetailsModal').style.display = 'none';
    }

    refreshLogs() {
        window.location.reload();
    }

    async exportLogs() {
        try {
            const response = await fetch('/admin/logs/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.filters)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `logs-export-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert('Błąd podczas eksportowania logów');
            }
        } catch (error) {
            console.error('Export error:', error);
            alert('Błąd podczas eksportowania logów');
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LogsManager();
});