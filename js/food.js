const foodApp = {
    currentParticipant: null,
    scanner: null,
    eventDay: 1,

    init: function () {
        this.loadEventDay();
        this.initializeBackend();

        // Initialize scanner
        this.scanner = new Scanner('reader', CONFIG.scannerConfig);
        this.scanner.onScan = (code) => this.processCode(code);
        this.scanner.init();

        // Setup manual input
        document.getElementById('submitManual').addEventListener('click', () => {
            const code = document.getElementById('manualInput').value.trim();
            if (code) {
                this.processCode(code);
                document.getElementById('manualInput').value = '';
            }
        });

        document.getElementById('manualInput').addEventListener('keyup', (e) => {
            if (e.key === 'Enter') document.getElementById('submitManual').click();
        });

        // Setup meal buttons
        document.getElementById('markBreakfastBtn').addEventListener('click', () => this.markMeal('Breakfast'));
        document.getElementById('markLunchBtn').addEventListener('click', () => this.markMeal('Lunch'));
        document.getElementById('markDinnerBtn').addEventListener('click', () => this.markMeal('Dinner'));
    },

    loadEventDay: function () {
        // Get the event day from localStorage
        const savedDay = localStorage.getItem('eventDay');
        if (savedDay) {
            this.eventDay = parseInt(savedDay, 10);
        } else {
            // Try to determine the event day based on the current date
            const eventStartDate = new Date('2025-06-13'); // Update with your event's start date
            const today = new Date();
            const diffTime = Math.abs(today - eventStartDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 3 && today >= eventStartDate) {
                this.eventDay = diffDays;
            }
            localStorage.setItem('eventDay', this.eventDay);
        }

        // Update day display
        document.getElementById('dayDisplay').textContent = `Day: ${this.eventDay}`;
    },

    processCode: function (code) {
        this.showLoading(true);
        document.getElementById('resultContent').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');

        this.fetchParticipantData(code)
            .then(data => {
                if (data.success) {
                    this.currentParticipant = data;
                    this.displayParticipantData(data);
                    document.getElementById('successSound').play();

                    // Update meal badges and buttons
                    const meals = data.meals || {};
                    document.getElementById('markBreakfastBtn').disabled = meals.Breakfast === true;
                    document.getElementById('markLunchBtn').disabled = meals.Lunch === true;
                    document.getElementById('markDinnerBtn').disabled = meals.Dinner === true;

                    document.getElementById('breakfastBadge').classList.toggle('active', meals.Breakfast === true);
                    document.getElementById('lunchBadge').classList.toggle('active', meals.Lunch === true);
                    document.getElementById('dinnerBadge').classList.toggle('active', meals.Dinner === true);
                } else {
                    this.currentParticipant = null;
                    this.clearParticipantData();

                    if (data.message !== 'Participant ID not found') {
                        this.showError(data.message || 'Invalid code');
                        document.getElementById('errorSound').play();
                    } else {
                        document.getElementById('errorMessage').classList.add('hidden');
                    }
                }
            })
            .catch(error => {
                console.error('Error:', error);
                this.showError('Connection error. Try again.');
                document.getElementById('errorSound').play();
                this.clearParticipantData();
            })
            .finally(() => this.showLoading(false));
    },

    fetchParticipantData: function (code) {
        const url = `${CONFIG.apiEndpoint}?action=checkCode&code=${encodeURIComponent(code)}&day=${this.eventDay}`;
        return fetch(url)
            .then(response => response.ok ? response.json() : Promise.reject('Network error'));
    },

    displayParticipantData: function (data) {
        document.getElementById('name').textContent = data.name || '-';
        document.getElementById('id').textContent = data.id || '-';
        document.getElementById('entryStatus').textContent = data.hasEntry ? 'Entered' : 'Not Entered';
        document.getElementById('eventDay').textContent = `Day ${this.eventDay}`;

        if (document.getElementById('zone')) {
            document.getElementById('zone').textContent = data.zone || '-';
        }
        if (document.getElementById('homeclub')) {
            document.getElementById('homeclub').textContent = data.homeclub || '-';
        }

        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = data.status || 'OK';
        statusBadge.className = 'badge';

        if (data.status === 'Error') {
            statusBadge.classList.add('error');
        } else {
            statusBadge.classList.add('success');
        }

        document.getElementById('resultContent').classList.remove('hidden');
    },

    markMeal: function (mealType) {
        if (!this.currentParticipant) return;
        this.showLoading(true);

        const url = `${CONFIG.apiEndpoint}?action=markMeal&code=${encodeURIComponent(this.currentParticipant.id)}&day=${this.eventDay}&meal=${mealType}`;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    this.currentParticipant = data;

                    // Update meal badges and buttons
                    if (data.meals) {
                        document.getElementById(`${mealType.toLowerCase()}Badge`).classList.add('active');
                        document.getElementById(`mark${mealType}Btn`).disabled = true;
                    }

                    document.getElementById('successSound').play();
                    this.showNotification(`${mealType} marked successfully!`, 'success');
                } else {
                    this.showError(data.message || `Failed to mark ${mealType}`);
                    document.getElementById('errorSound').play();
                }
            })
            .catch(error => {
                console.error(`Error marking ${mealType}:`, error);
                this.showError('Error connecting to the server. Please try again.');
                document.getElementById('errorSound').play();
            })
            .finally(() => this.showLoading(false));
    },

    showNotification: function (message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `system-notification ${type}`;
        notification.textContent = message;
        document.querySelector('.container').prepend(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s forwards';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    },

    showLoading: function (show) {
        document.getElementById('loading').style.display = show ? 'flex' : 'none';
    },

    showError: function (message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
        document.getElementById('resultContent').classList.remove('hidden');
    },

    clearParticipantData: function () {
        document.getElementById('name').textContent = '-';
        document.getElementById('id').textContent = '-';
        document.getElementById('entryStatus').textContent = '-';

        if (document.getElementById('zone')) {
            document.getElementById('zone').textContent = '-';
        }
        if (document.getElementById('homeclub')) {
            document.getElementById('homeclub').textContent = '-';
        }

        // Disable action buttons
        document.getElementById('markBreakfastBtn').disabled = true;
        document.getElementById('markLunchBtn').disabled = true;
        document.getElementById('markDinnerBtn').disabled = true;

        // Reset meal badges
        document.getElementById('breakfastBadge').classList.remove('active');
        document.getElementById('lunchBadge').classList.remove('active');
        document.getElementById('dinnerBadge').classList.remove('active');

        const statusBadge = document.getElementById('statusBadge');
        statusBadge.textContent = 'Not Found';
        statusBadge.className = 'badge error';
    },

    initializeBackend: function () {
        const notification = document.createElement('div');
        notification.className = 'system-notification';
        notification.textContent = 'Initializing system...';
        document.querySelector('.container').prepend(notification);

        const url = `${CONFIG.apiEndpoint}?action=initialize&code=init&day=1`;

        fetch(url)
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    notification.textContent = 'System initialized successfully!';
                    notification.className = 'system-notification success';
                    if (data.sheetInfo) console.log('Daily tracking sheet:', data.sheetInfo);
                } else {
                    notification.textContent = 'Warning: System initialization failed.';
                    notification.className = 'system-notification warning';
                    console.error('Initialization error:', data.message);
                }
                setTimeout(() => {
                    notification.style.animation = 'fadeOut 0.5s forwards';
                    setTimeout(() => notification.remove(), 500);
                }, 3000);
            })
            .catch(error => {
                notification.textContent = 'Error connecting to the backend system.';
                notification.className = 'system-notification error';
                console.error('Initialization error:', error);
                setTimeout(() => {
                    notification.style.animation = 'fadeOut 0.5s forwards';
                    setTimeout(() => notification.remove(), 500);
                }, 5000);
            });
    }
};

document.addEventListener('DOMContentLoaded', () => foodApp.init());