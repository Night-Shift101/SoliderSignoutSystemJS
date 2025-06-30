class LogsManager {
    constructor(app) {
        this.app = app;
    }

    async loadFilteredLogs() {
        try {
            const startDate = this.app.domManager.get('startDate');
            const endDate = this.app.domManager.get('endDate');
            const soldierNameFilter = this.app.domManager.get('soldierNameFilter');
            const locationFilter = this.app.domManager.get('locationFilter');
            const statusFilter = this.app.domManager.get('statusFilter');
            
            const params = new URLSearchParams();
            if (startDate?.value) params.append('startDate', startDate.value);
            if (endDate?.value) params.append('endDate', endDate.value);
            if (soldierNameFilter?.value) params.append('soldierName', soldierNameFilter.value);
            if (locationFilter?.value) params.append('location', locationFilter.value);
            if (statusFilter?.value) params.append('status', statusFilter.value);
            
            const response = await Utils.fetchWithAuth(`/api/signouts?${params}`);
            
            if (!response.ok) throw new Error('Failed to fetch logs');
            
            const logs = await response.json();
            this.renderLogsTable(logs);
        } catch (error) {
            console.error('Error loading logs:', error);
            this.app.notificationManager.showNotification('Failed to load logs', 'error');
        }
    }

    renderLogsTable(logs) {
        const tbody = this.app.domManager.get('logsTableBody');
        const emptyState = this.app.domManager.get('logsEmptyState');
        
        if (!logs || logs.length === 0) {
            if (tbody) tbody.innerHTML = '';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }
        
        if (emptyState) emptyState.style.display = 'none';
        
        if (tbody) {
            tbody.innerHTML = logs.map(log => {
                const signOutTime = Utils.formatTime(log.sign_out_time);
                const signInTime = log.sign_in_time ? Utils.formatTime(log.sign_in_time) : 'N/A';
                const duration = log.sign_in_time 
                    ? Utils.calculateDuration(log.sign_out_time, log.sign_in_time)
                    : Utils.calculateDuration(log.sign_out_time);
                
                return `
                    <tr data-signout-id="${log.signout_id}" class="log-row">
                        <td><span class="id-badge">${log.signout_id}</span></td>
                        <td>
                            ${Utils.renderSoldierChipsForTable(log.soldiers, log.soldier_count)}
                        </td>
                        <td>${log.location}</td>
                        <td>${signOutTime}</td>
                        <td>${signInTime}</td>
                        <td>${duration}</td>
                        <td>${log.signed_out_by_name}</td>
                        <td>${log.signed_in_by_name || 'N/A'}</td>
                        <td><span class="status-badge status-${log.status.toLowerCase()}">${log.status}</span></td>
                        <td>${log.notes || ''}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    clearFilters() {
        const startDate = this.app.domManager.get('startDate');
        const endDate = this.app.domManager.get('endDate');
        const soldierNameFilter = this.app.domManager.get('soldierNameFilter');
        const locationFilter = this.app.domManager.get('locationFilter');
        const statusFilter = this.app.domManager.get('statusFilter');
        
        if (startDate) startDate.value = '';
        if (endDate) endDate.value = '';
        if (soldierNameFilter) soldierNameFilter.value = '';
        if (locationFilter) locationFilter.value = '';
        if (statusFilter) statusFilter.value = '';
        
        this.loadFilteredLogs();
    }

    async exportLogs() {
        try {
            Utils.showLoading(true);
            
            const startDate = this.app.domManager.get('startDate');
            const endDate = this.app.domManager.get('endDate');
            const soldierNameFilter = this.app.domManager.get('soldierNameFilter');
            const locationFilter = this.app.domManager.get('locationFilter');
            const statusFilter = this.app.domManager.get('statusFilter');
            
            const params = new URLSearchParams();
            if (startDate?.value) params.append('startDate', startDate.value);
            if (endDate?.value) params.append('endDate', endDate.value);
            if (soldierNameFilter?.value) params.append('soldierName', soldierNameFilter.value);
            if (locationFilter?.value) params.append('location', locationFilter.value);
            if (statusFilter?.value) params.append('status', statusFilter.value);
            
            const response = await Utils.fetchWithAuth(`/api/signouts/export/logs?${params}`);
            
            if (!response.ok) throw new Error('Failed to export logs');
            
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `signout-logs-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            this.app.notificationManager.showNotification('Logs exported successfully', 'success');
            
        } catch (error) {
            console.error('Error exporting logs:', error);
            this.app.notificationManager.showNotification('Failed to export logs', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    async exportLogsPDF() {
        try {
            Utils.showLoading(true);
            
            const startDate = this.app.domManager.get('startDate');
            const endDate = this.app.domManager.get('endDate');
            const soldierNameFilter = this.app.domManager.get('soldierNameFilter');
            const locationFilter = this.app.domManager.get('locationFilter');
            const statusFilter = this.app.domManager.get('statusFilter');
            
            const params = new URLSearchParams();
            if (startDate?.value) params.append('startDate', startDate.value);
            if (endDate?.value) params.append('endDate', endDate.value);
            if (soldierNameFilter?.value) params.append('soldierName', soldierNameFilter.value);
            if (locationFilter?.value) params.append('location', locationFilter.value);
            if (statusFilter?.value) params.append('status', statusFilter.value);
            
            const response = await Utils.fetchWithAuth(`/api/signouts/logs?${params}`);
            
            if (!response.ok) throw new Error('Failed to fetch logs for PDF export');
            
            const logs = await response.json();
            this.generateLogsPDF(logs);
            
        } catch (error) {
            console.error('Error exporting logs as PDF:', error);
            this.app.notificationManager.showNotification('Failed to export logs as PDF', 'error');
        } finally {
            Utils.showLoading(false);
        }
    }

    generateLogsPDF(logs) {
        const doc = new window.jsPDF();
        
        doc.setFontSize(20);
        doc.text('Sign-Out Logs Report', 20, 20);
        
        doc.setFontSize(12);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 20, 30);
        
        doc.text(`Total Records: ${logs.length}`, 20, 40);
        
        let y = 55;
        
        doc.setFontSize(10);
        doc.text('ID', 20, y);
        doc.text('Soldiers', 35, y);
        doc.text('Location', 80, y);
        doc.text('Out Time', 120, y);
        doc.text('Status', 160, y);
        
        y += 10;
        
        doc.line(20, y - 5, 190, y - 5);
        
        logs.forEach((log, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
                
                doc.text('ID', 20, y);
                doc.text('Soldiers', 35, y);
                doc.text('Location', 80, y);
                doc.text('Out Time', 120, y);
                doc.text('Status', 160, y);
                y += 10;
                doc.line(20, y - 5, 190, y - 5);
            }
            
            const soldierNames = log.soldiers && Array.isArray(log.soldiers) 
                ? log.soldiers.map(s => `${s.rank} ${s.last_name}`).join(', ')
                : `${log.soldier_rank} ${log.soldier_last_name}` || 'Unknown';
            
            doc.text(String(log.signout_id), 20, y);
            doc.text(soldierNames.substring(0, 25), 35, y);
            doc.text(log.location.substring(0, 20), 80, y);
            doc.text(new Date(log.sign_out_time).toLocaleDateString(), 120, y);
            doc.text(log.status, 160, y);
            
            y += 8;
        });
        
        doc.save(`signout-logs-${new Date().toISOString().split('T')[0]}.pdf`);
        this.app.notificationManager.showNotification('PDF exported successfully', 'success');
    }
}

export default LogsManager;
