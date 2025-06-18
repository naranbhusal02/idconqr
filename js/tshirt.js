const tshirtApp = {
    currentParticipant: null,
    scanner: null,

    init: function () {
        console.log('Initializing T-shirt Distribution App...');
        this.initializeBackend();
        this.setupScanner();
        this.setupManualInput();
        this.setupTshirtButton();
        this.addDebugTools();
    },

    setupScanner: function () {
        this.scanner = new Scanner('reader', CONFIG.scannerConfig);
        this.scanner.onScan = (code) => this.processCode(code);
        this.scanner.init();
    },

    setupManualInput: function () {
        const submitBtn = document.getElementById('submitManual');
        const manualInput = document.getElementById('manualInput');

        submitBtn.addEventListener('click', () => {
            const code = manualInput.value.trim();
            if (code) {
                this.processCode(code);
                manualInput.value = '';
            }
        });

        manualInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') submitBtn.click();
        });
    },

    setupTshirtButton: function () {
        document.getElementById('markTshirtBtn').addEventListener('click', () => {
            this.markTshirt();
        });
    },

    processCode: function (code) {
        console.log(`Processing code: ${code}`);

        this.showLoading(true);
        this.hideResults();
        this.clearErrors();

        this.fetchParticipantData(code)
            .then(data => {
                console.log('Participant data received:', data);

                if (data.success) {
                    this.currentParticipant = data;
                    this.displayParticipantData(data);
                    this.updateTshirtButton(data.hasTshirt);
                    this.playSuccessSound();
                } else {
                    this.handleParticipantNotFound(data);
                }
            })
            .catch(error => {
                console.error('Error fetching participant data:', error);
                this.showError('Connection error. Please try again.');
                this.playErrorSound();
                this.clearParticipantData();
            })
            .finally(() => {
                this.showLoading(false);
            });
    },

    fetchParticipantData: function (code) {
        const url = `${CONFIG.apiEndpoint}?action=checkCode&code=${encodeURIComponent(code)}&day=1`;

        return fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            });
    },

    displayParticipantData: function (data) {
        console.log('Displaying participant data:', data);

        // Update participant info
        document.getElementById('name').textContent = data.name || '-';
        document.getElementById('id').textContent = data.id || '-';
        document.getElementById('zone').textContent = data.zone || '-';
        document.getElementById('homeclub').textContent = data.homeclub || '-';

        // Update T-shirt status
        const tshirtStatus = document.getElementById('tshirtStatus');
        const hasTshirt = data.hasTshirt === true;
        tshirtStatus.textContent = hasTshirt ? 'Received' : 'Not Received';
        tshirtStatus.className = `detail-value ${hasTshirt ? 'status-received' : 'status-pending'}`;

        // Update status badge
        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = data.status || 'OK';
        statusBadge.className = data.status === 'Error' ? 'badge error' : 'badge success';

        this.showResults();
    },

    updateTshirtButton: function (hasTshirt) {
        const button = document.getElementById('markTshirtBtn');
        const isReceived = hasTshirt === true;

        button.disabled = isReceived;
        button.textContent = isReceived ? 'T-Shirt Already Received' : 'Mark T-Shirt Received';
        button.className = isReceived ? 'btn secondary btn-large' : 'btn primary btn-large';

        console.log(`T-shirt button updated: disabled=${isReceived}, hasTshirt=${hasTshirt}`);
    },

    markTshirt: function () {
        if (!this.currentParticipant) {
            this.showError('No participant selected. Please scan a code first.');
            return;
        }

        if (this.currentParticipant.hasTshirt === true) {
            this.showNotification('T-shirt already marked as received', 'warning');
            return;
        }

        console.log('Marking T-shirt for participant:', this.currentParticipant.id);

        this.showLoading(true);
        const url = `${CONFIG.apiEndpoint}?action=markTshirt&code=${encodeURIComponent(this.currentParticipant.id)}`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('T-shirt marking response:', data);

                if (data.success) {
                    // Update current participant data
                    this.currentParticipant = data;
                    this.displayParticipantData(data);
                    this.updateTshirtButton(true);

                    this.showNotification('T-shirt marked as received successfully!', 'success');
                    this.playSuccessSound();
                } else {
                    this.showError(data.message || 'Failed to mark T-shirt');
                    this.playErrorSound();
                }
            })
            .catch(error => {
                console.error('Error marking T-shirt:', error);
                this.showError(`Error: ${error.message}`);
                this.playErrorSound();
            })
            .finally(() => {
                this.showLoading(false);
            });
    },

    handleParticipantNotFound: function (data) {
        this.currentParticipant = null;
        this.clearParticipantData();

        if (data.message !== 'Participant ID not found') {
            this.showError(data.message || 'Invalid code');
            this.playErrorSound();
        }
    },

    // UI Helper Methods
    showLoading: function (show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    },

    showResults: function () {
        document.getElementById('resultContent').classList.remove('hidden');
    },

    hideResults: function () {
        document.getElementById('resultContent').classList.add('hidden');
    },

    clearErrors: function () {
        document.getElementById('errorMessage').classList.add('hidden');
    },

    showError: function (message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        this.showResults();
    },

    clearParticipantData: function () {
        document.getElementById('name').textContent = '-';
        document.getElementById('id').textContent = '-';
        document.getElementById('zone').textContent = '-';
        document.getElementById('homeclub').textContent = '-';
        document.getElementById('tshirtStatus').textContent = '-';

        const button = document.getElementById('markTshirtBtn');
        button.disabled = true;
        button.textContent = 'Mark T-Shirt Received';
        button.className = 'btn primary btn-large';

        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = 'Not Found';
        statusBadge.className = 'badge error';
    },

    showNotification: function (message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `system-notification ${type}`;
        notification.textContent = message;

        const container = document.querySelector('.container');
        container.prepend(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    },

    playSuccessSound: function () {
        try {
            document.getElementById('successSound').play();
        } catch (error) {
            console.log('Could not play success sound:', error);
        }
    },

    playErrorSound: function () {
        try {
            document.getElementById('errorSound').play();
        } catch (error) {
            console.log('Could not play error sound:', error);
        }
    },

    initializeBackend: function () {
        const notification = document.createElement('div');
        notification.className = 'system-notification';
        notification.textContent = 'Initializing system...';
        document.querySelector('.container').prepend(notification);

        const url = `${CONFIG.apiEndpoint}?action=initialize&code=init`;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    notification.textContent = 'System initialized successfully!';
                    notification.className = 'system-notification success';
                } else {
                    notification.textContent = 'Warning: System initialization failed.';
                    notification.className = 'system-notification warning';
                    console.error('Initialization error:', data.message);
                }
            })
            .catch(error => {
                notification.textContent = 'Error connecting to the backend system.';
                notification.className = 'system-notification error';
                console.error('Initialization error:', error);
            })
            .finally(() => {
                setTimeout(() => {
                    notification.style.animation = 'fadeOut 0.5s forwards';
                    setTimeout(() => notification.remove(), 500);
                }, 3000);
            });
    },

    // Debug Tools (for development/testing)
    addDebugTools: function () {
        if (window.location.hostname !== 'localhost' && !window.location.search.includes('debug=true')) {
            return; // Only show in development or when debug=true
        }

        const debugContainer = document.createElement('div');
        debugContainer.style.marginTop = '30px';
        debugContainer.style.padding = '20px';
        debugContainer.style.backgroundColor = '#f5f5f5';
        debugContainer.style.border = '1px solid #ddd';
        debugContainer.style.borderRadius = '8px';

        debugContainer.innerHTML = `
            <h3>Debug Tools</h3>
            <div style="margin-bottom: 15px;">
                <button id="debugBtn" class="btn secondary" style="margin-right: 10px;">Debug T-Shirt Column</button>
                <button id="testTshirtBtn" class="btn secondary" style="margin-right: 10px;">Test T-Shirt API</button>
                <button id="debugHeadersBtn" class="btn secondary">Show Sheet Headers</button>
            </div>
            <div>
                <input type="text" id="debugInput" placeholder="Enter code for testing" style="margin-right: 10px; padding: 8px;">
                <button id="directTestBtn" class="btn secondary">Direct Mark Test</button>
            </div>
        `;

        // Add event listeners
        debugContainer.querySelector('#debugBtn').onclick = () => this.runDebug();
        debugContainer.querySelector('#testTshirtBtn').onclick = () => this.testTshirtAPI();
        debugContainer.querySelector('#directTestBtn').onclick = () => this.directTest();
        debugContainer.querySelector('#debugHeadersBtn').onclick = () => this.debugSheetHeaders();

        document.querySelector('.tshirt-container').appendChild(debugContainer);
    },

    debugSheetHeaders: function () {
        console.log('Checking sheet headers...');
        this.showNotification('Checking sheet headers...', 'info');

        const url = `${CONFIG.apiEndpoint}?action=debugSheetHeaders`;

        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Sheet headers response:', data);

                if (data.success) {
                    console.log('Available columns:');
                    data.headerInfo.forEach(info => {
                        console.log(`  ${info.column}: "${info.name}"`);
                    });

                    // Show in a more user-friendly way
                    const columnList = data.headerInfo.map(info => `${info.column}: "${info.name}"`).join('\n');
                    this.showNotification(`Sheet has ${data.totalColumns} columns:\n${columnList}`, 'info');
                    // Look for T-shirt columns (now we auto-create if missing)
                    const tshirtColumns = data.headerInfo.filter(info =>
                        info.name.toLowerCase().includes('shirt') ||
                        info.name.toLowerCase().includes('tshirt') ||
                        info.name.toLowerCase().includes('t-shirt') ||
                        info.name.toLowerCase().includes('t_shirt')
                    );

                    if (tshirtColumns.length > 0) {
                        console.log('T-shirt columns found:', tshirtColumns);
                        this.showNotification(`Found T-shirt columns: ${tshirtColumns.map(c => c.name).join(', ')}`, 'success');
                    } else {
                        this.showNotification('No T-shirt columns found, but system will auto-create "T_Shirt" in column H when needed.', 'info');
                    }
                } else {
                    this.showNotification(`Error: ${data.message}`, 'error');
                }
            })
            .catch(error => {
                console.error('Sheet headers debug error:', error);
                this.showNotification(`Error checking headers: ${error}`, 'error');
            });
    },

    // ...existing code...
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    tshirtApp.init();
});