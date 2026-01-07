/**
 * ============================================================================
 *  MODULE: Scan Manager
 *  RESPONSIBILITY: Camera/File Input & AI Service Delegation
 * ============================================================================
 */
class ScanManager {
    constructor(app) {
        this.app = app;
        this.dom = {
            cameraInput: document.getElementById('camera-input'),
            galleryInput: document.getElementById('gallery-input')
        };
        this.bindEvents();
    }

    bindEvents() {
        if (this.dom.cameraInput) {
            this.dom.cameraInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
        if (this.dom.galleryInput) {
            this.dom.galleryInput.addEventListener('change', (e) => this.handleFileUpload(e));
        }
    }

    async handleFileUpload(event) {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        this.app.showLoading(true);

        try {
            let allNewResults = [];
            for (let i = 0; i < files.length; i++) {
                const base64 = await this.readFileAsBase64(files[i]);
                const result = await window.aiService.processImage(base64);
                if (Array.isArray(result)) {
                    allNewResults = allNewResults.concat(result);
                }
            }

            // Calls back to App for Data Handling (Coordinator Pattern)
            this.app.handleScanResults(allNewResults);

            // Reset inputs
            if (this.dom.cameraInput) this.dom.cameraInput.value = '';
            if (this.dom.galleryInput) this.dom.galleryInput.value = '';

        } catch (error) {
            alert(`處理失敗: ${error.message}`);
        } finally {
            this.app.showLoading(false);
        }
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
