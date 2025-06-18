// Scanner handling
class Scanner {
    constructor(elementId, config) {
        this.elementId = elementId;
        this.config = config;
        this.scanner = null;
        this.isScanning = false;
        this.lastScanned = null;
        this.scanCooldown = 3000;
        this.onScan = null;

    }

    init() {
        this.scanner = new Html5Qrcode(this.elementId);
        // Start scanning automatically
        this.startScanner();
    }

    startScanner() {
        if (this.isScanning) return;

        Html5Qrcode.getCameras()
            .then(devices => {
                if (devices && devices.length) {
                    this.scanner.start({ facingMode: "environment" },
                            this.config,
                            this.handleScanSuccess.bind(this),
                            this.handleScanError.bind(this)
                        )
                        .then(() => {
                            this.isScanning = true;
                        })
                        .catch(err => {
                            console.error('Error starting scanner:', err);
                            alert('Could not start scanner: ' + err);
                        });
                } else {
                    alert('No cameras found on this device!');
                }
            })
            .catch(err => {
                console.error('Error getting cameras:', err);
                alert('Error accessing camera: ' + err);
            });
    }

    stopScanner() {
        if (!this.isScanning) return;

        this.scanner.stop()
            .then(() => {
                this.isScanning = false;
            })
            .catch(err => {
                console.error('Error stopping scanner:', err);
            });
    }

    handleScanSuccess(decodedText) {
        const now = new Date().getTime();
        if (this.lastScanned && decodedText === this.lastScanned.text &&
            (now - this.lastScanned.time) < this.scanCooldown) {
            return;
        }

        this.lastScanned = {
            text: decodedText,
            time: now
        };

        // Use the callback if provided, otherwise try to use the app's processCode
        if (typeof this.onScan === 'function') {
            this.onScan(decodedText);
        } else if (typeof app !== 'undefined' && typeof app.processCode === 'function') {
            app.processCode(decodedText);
        } else {
            console.error('No handler for scan result');
        }
    }

    handleScanError(error) {
        if (error !== "No barcode or QR code detected.") {
            console.error('Scan error:', error);
        }
    }
}