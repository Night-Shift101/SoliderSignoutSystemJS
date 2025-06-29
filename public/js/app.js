exportLogs = async () => {
    try {
        Utils.showLoading(true);

        const params = new URLSearchParams();
        if (this.startDate?.value) params.append('startDate', this.startDate.value);
        if (this.endDate?.value) params.append('endDate', this.endDate.value);
        if (this.soldierNameFilter?.value) params.append('soldierName', this.soldierNameFilter.value);
        if (this.locationFilter?.value) params.append('location', this.locationFilter.value);
        if (this.statusFilter?.value) params.append('status', this.statusFilter.value);

        const response = await Utils.fetchWithAuth(`/api/signouts/export/logs?${params}`, {
            headers: {
                'Requested-By': this.currentUser?.full_name || 'Unknown'
            }
        });

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

        this.notificationManager.showNotification('Logs exported successfully', 'success');

    } catch (error) {
        console.error('Error exporting logs:', error);
        this.notificationManager.showNotification('Failed to export logs', 'error');
    } finally {
        Utils.showLoading(false);
    }
}



