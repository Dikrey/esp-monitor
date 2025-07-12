 //SELURUH FUNGSI DIBUAT OLEH RAIHAN_OFFICIAL0307 X VISUALCODEPO
 //CREATED BY: RAIHAN_OFFICIAL0307 X VISUALCODEPO
 // t.me/raihan_official0307
 //OPEN SOURCE DAN WAJIB CANTUMKAN NAMA PEMBUAT ASLI
        class ESPToolMonitor {
            constructor() {
                this.port = null;
                this.reader = null;
                this.isConnected = false;
                this.startTime = null;
                this.bytesReceived = 0;
                this.linesReceived = 0;
                this.lastDataTime = Date.now();
                this.dataBuffer = [];
                this.filterKeyword = '';
                
                this.initializeElements();
                this.bindEvents();
                this.startStatsUpdate();
            }

            initializeElements() {
                this.connectButton = document.getElementById('connectButton');
                this.disconnectButton = document.getElementById('disconnectButton');
                this.output = document.getElementById('output');
                this.statusIndicator = document.getElementById('statusIndicator');
                this.statusText = document.getElementById('statusText');
                this.connectButtonText = document.getElementById('connectButtonText');
                this.clearBtn = document.getElementById('clearBtn');
                this.saveBtn = document.getElementById('saveBtn');
                this.filterInput = document.getElementById('filterInput');
                this.baudRateSelect = document.getElementById('baudRate');
                
                this.bytesReceivedEl = document.getElementById('bytesReceived');
                this.linesReceivedEl = document.getElementById('linesReceived');
                this.uptimeEl = document.getElementById('uptime');
                this.dataRateEl = document.getElementById('dataRate');
            }

            bindEvents() {
                this.connectButton.addEventListener('click', () => this.connectToDevice());
                this.disconnectButton.addEventListener('click', () => this.disconnect());
                this.clearBtn.addEventListener('click', () => this.clearOutput());
                this.saveBtn.addEventListener('click', () => this.saveLog());
                this.filterInput.addEventListener('input', (e) => {
                    this.filterKeyword = e.target.value.toLowerCase();
                });
            }

            async connectToDevice() {
                try {
                    this.updateStatus('connecting', 'Menghubungkan...');
                    this.connectButton.disabled = true;
                    
                    
                    if (!('serial' in navigator)) {
                        throw new Error('Web Serial API tidak didukung di browser ini. Gunakan Chrome/Edge versi terbaru.');
                    }

               
                    this.port = await navigator.serial.requestPort();
                    
                    const baudRate = parseInt(this.baudRateSelect.value);
                    await this.port.open({ 
                        baudRate: baudRate,
                        dataBits: 8,
                        stopBits: 1,
                        parity: 'none'
                    });

                    this.isConnected = true;
                    this.startTime = Date.now();
                    this.updateStatus('connected', `Terhubung (${baudRate} baud)`);
                    this.connectButton.style.display = 'none';
                    this.disconnectButton.style.display = 'block';
                    
                    this.output.innerHTML = `<span style="color: #00d4aa;">[${this.getTimestamp()}] Berhasil terhubung ke perangkat (${baudRate} baud)</span>\n`;
                    
                    this.startReading();
                    
                } catch (error) {
                    console.error('Error connecting:', error);
                    this.updateStatus('disconnected', 'Gagal terhubung');
                    this.output.innerHTML += `<span style="color: #ef4444;">[${this.getTimestamp()}] Error: ${error.message}</span>\n`;
                    this.connectButton.disabled = false;
                }
            }

            async startReading() {
                try {
                    this.reader = this.port.readable.getReader();
                    const decoder = new TextDecoder();
                    
                    while (this.isConnected) {
                        const { value, done } = await this.reader.read();
                        if (done) break;
                        
                        const text = decoder.decode(value);
                        this.processReceivedData(text);
                    }
                } catch (error) {
                    if (this.isConnected) {
                        console.error('Reading error:', error);
                        this.output.innerHTML += `<span style="color: #ef4444;">[${this.getTimestamp()}] Error membaca data: ${error.message}</span>\n`;
                    }
                } finally {
                    if (this.reader) {
                        this.reader.releaseLock();
                    }
                }
            }

            processReceivedData(text) {
                this.bytesReceived += text.length;
                this.lastDataTime = Date.now();
                
                const lines = text.split('\n');
                lines.forEach((line, index) => {
                    if (line.trim() || index < lines.length - 1) {
                        this.linesReceived++;
                        
                     
                        if (!this.filterKeyword || line.toLowerCase().includes(this.filterKeyword)) {
                            const timestamp = this.getTimestamp();
                            const formattedLine = this.formatLine(line);
                            this.output.innerHTML += `<span style="color: #64748b;">[${timestamp}]</span> ${formattedLine}\n`;
                        }
                    }
                });
                
                this.output.scrollTop = this.output.scrollHeight;
                this.updateStats();
            }

            formatLine(line) {
              
                if (line.includes('ERROR') || line.includes('error')) {
                    return `<span style="color: #ef4444;">${this.escapeHtml(line)}</span>`;
                } else if (line.includes('WARN') || line.includes('warning')) {
                    return `<span style="color: #f59e0b;">${this.escapeHtml(line)}</span>`;
                } else if (line.includes('INFO') || line.includes('info')) {
                    return `<span style="color: #06b6d4;">${this.escapeHtml(line)}</span>`;
                } else if (line.includes('DEBUG') || line.includes('debug')) {
                    return `<span style="color: #8b5cf6;">${this.escapeHtml(line)}</span>`;
                } else {
                    return `<span style="color: #e2e8f0;">${this.escapeHtml(line)}</span>`;
                }
            }

            escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            async disconnect() {
                try {
                    this.isConnected = false;
                    
                    if (this.reader) {
                        await this.reader.cancel();
                        this.reader = null;
                    }
                    
                    if (this.port) {
                        await this.port.close();
                        this.port = null;
                    }
                    
                    this.updateStatus('disconnected', 'Terputus');
                    this.connectButton.style.display = 'block';
                    this.disconnectButton.style.display = 'none';
                    this.connectButton.disabled = false;
                    
                    this.output.innerHTML += `<span style="color: #f59e0b;">[${this.getTimestamp()}] Koneksi terputus</span>\n`;
                    this.output.scrollTop = this.output.scrollHeight;
                    
                } catch (error) {
                    console.error('Error disconnecting:', error);
                }
            }

            updateStatus(status, text) {
                this.statusText.textContent = text;
                this.statusIndicator.className = `status-indicator status-${status}`;
                
                if (status === 'connecting') {
                    this.statusIndicator.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span id="statusText">' + text + '</span>';
                } else if (status === 'connected') {
                    this.statusIndicator.innerHTML = '<i class="fas fa-circle" style="color: #22c55e;"></i><span id="statusText">' + text + '</span>';
                } else {
                    this.statusIndicator.innerHTML = '<i class="fas fa-circle pulse"></i><span id="statusText">' + text + '</span>';
                }
            }

            clearOutput() {
                this.output.innerHTML = 'Output dibersihkan ya cuy...\n';
                this.bytesReceived = 0;
                this.linesReceived = 0;
                this.updateStats();
            }

            saveLog() {
                const logContent = this.output.textContent;
                const blob = new Blob([logContent], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `esptool-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            getTimestamp() {
                return new Date().toLocaleTimeString('id-ID');
            }

            updateStats() {
                this.bytesReceivedEl.textContent = this.formatBytes(this.bytesReceived);
                this.linesReceivedEl.textContent = this.linesReceived.toLocaleString();
                
                if (this.startTime) {
                    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
                    this.uptimeEl.textContent = this.formatTime(uptime);
                }
            }

            startStatsUpdate() {
                setInterval(() => {
                    if (this.isConnected && this.startTime) {
                        const now = Date.now();
                        const timeDiff = (now - this.lastDataTime) / 1000;
                        
                        if (timeDiff < 2) {
                            const dataRate = Math.round(this.bytesReceived / ((now - this.startTime) / 1000));
                            this.dataRateEl.textContent = dataRate.toLocaleString();
                        } else {
                            this.dataRateEl.textContent = '0';
                        }
                        
                        this.updateStats();
                    }
                }, 1000);
            }

            formatBytes(bytes) {
                if (bytes === 0) return '0';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
            }

            formatTime(seconds) {
                const hours = Math.floor(seconds / 3600);
                const minutes = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                
                if (hours > 0) {
                    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                } else {
                    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
                }
            }
        }

        document.addEventListener('DOMContentLoaded', () => {
            new ESPToolMonitor();
        });

        if (!('serial' in navigator)) {
            document.body.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; padding: 20px;">
                    <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; padding: 40px; max-width: 500px;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ef4444; margin-bottom: 20px;"></i>
                        <h2 style="color: #ef4444; margin-bottom: 15px;">Browser Tidak Didukung</h2>
                        <p style="color: #e2e8f0; margin-bottom: 20px;">
                            ESPTool Monitor memerlukan Web Serial API yang hanya tersedia di (desktop / Pc):
                        </p>
                        <ul style="color: #94a3b8; text-align: left; margin-bottom: 20px;">
                            <li>Google Chrome 89+</li>
                            <li>Microsoft Edge 89+</li>
                            <li>Opera 75+</li>
                        </ul>
                        <p style="color: #64748b; font-size: 14px;">
                            Silakan gunakan salah satu browser di atas untuk mengakses fitur ini.
                        </p>
                        <p style="color: #64748b; font-size: 15px;">
                            Raihan_official0307 X Visualcodepo
                        </p>
                    </div>
                </div>
            `;
        }
