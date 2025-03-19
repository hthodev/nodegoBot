const fs = require('fs');
const axios = require('axios');
const colors = require('colors');
const { HttpsProxyAgent } = require('https-proxy-agent');
const readline = require('readline');

let currentDate = (new Date()).getDate()
class NodeGo {
    constructor() {
        this.apiBaseUrl = 'https://nodego.ai/api';
        this.isRunning = true;
        this.accounts = this.loadAccounts();
        this.tasksList = [
            { code: 'T001', name: 'Verify Email' },
            { code: 'T002', name: 'Join Telegram Channel' },
            { code: 'T003', name: 'Join Telegram Group' },
            { code: 'T004', name: 'Boost Telegram Channel' },
            { code: 'T005', name: 'Follow us on X' },
            { code: 'T006', name: 'Rate Chrome Extension' },
            { code: 'T007', name: 'Join Telegram MiniApp' },
            { code: 'T009', name: 'Join Discord Channel' },
            { code: 'T010', name: 'Add NodeGo.Ai to your name' },
            { code: 'T011', name: 'Share Your Referral Link on X' },
            { code: 'T012', name: 'Retweet & Like US' },
            { code: 'T014', name: 'Comment on our post & Tag 3 friends' },
            { code: 'T100', name: 'Invite 1 friends' },
            { code: 'T101', name: 'Invite 3 friends' },
            { code: 'T102', name: 'Invite 5 friends' },
            { code: 'T103', name: 'Invite 10 friends' }
        ];
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }

    log(msg, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        switch(type) {
            case 'success':
                console.log(`[${timestamp}] [✓] ${msg}`.green);
                break;
            case 'custom':
                console.log(`[${timestamp}] [*] ${msg}`.magenta);
                break;        
            case 'error':
                console.log(`[${timestamp}] [✗] ${msg}`.red);
                break;
            case 'warning':
                console.log(`[${timestamp}] [!] ${msg}`.yellow);
                break;
            default:
                console.log(`[${timestamp}] [ℹ] ${msg}`.blue);
        }
    }

    askQuestion(question) {
        return new Promise((resolve) => {
            this.rl.question(question, (answer) => {
                resolve(answer.trim().toLowerCase());
            });
        });
    }

    loadAccounts() {
        try {
            const accountData = fs.readFileSync('tokens.txt', 'utf8')
                .split('\n')
                .filter(line => line.trim());
            
            const proxyData = fs.existsSync('proxies.txt') 
                ? fs.readFileSync('proxies.txt', 'utf8')
                    .split('\n')
                    .filter(line => line.trim())
                : [];
            
            return accountData.map((token, index) => ({
                token: token.trim(),
                proxy: proxyData[index] || null,
                lastPingTimestamp: 0
            }));
        } catch (error) {
            this.log(`Lỗi đọc tài khoản: ${error}`, 'error');
            process.exit(1);
        }
    }

    async checkProxyIP(proxy) {
        try {
            const proxyAgent = new HttpsProxyAgent(proxy);
            const response = await axios.get('https://icanhazip.com', { 
                httpsAgent: proxyAgent,
                timeout: 30000
            });
            
            if (response.status === 200) {
                return response.data;
            } else {
                throw new Error(`Không thể kiểm tra IP của proxy. Status code: ${response.status}`);
            }
        } catch (error) {
            throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
        }
    }

    async makeRequest(token, endpoint, method, data = null, proxyUrl = null) {
        const config = {
            method,
            url: `${this.apiBaseUrl}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': '*/*'
            },
            ...(data && { data }),
            timeout: 5000
        };

        if (proxyUrl) {
            config.httpsAgent = new HttpsProxyAgent(proxyUrl);
        }

        try {
            return await axios(config);
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                throw new Error(`Kết nối không thành công: ${error.message}`);
            }
            throw error;
        }
    }

    async getUserInfo(token, proxy) {
        try {
            const response = await this.makeRequest(token, '/user/me', 'GET', null, proxy);
            const metadata = response.data.metadata;
            return {
                username: metadata.username,
                email: metadata.email,
                totalPoint: metadata.rewardPoint,
                socialTasks: metadata.socialTask || [],
                nodes: metadata.nodes.map(node => ({
                    id: node.id,
                    totalPoint: node.totalPoint,
                    todayPoint: node.todayPoint,
                    isActive: node.isActive
                }))
            };
        } catch (error) {
            this.log(`Không lấy được thông tin người dùng: ${error.message}`, 'error');
            throw error;
        }
    }

    async ping(account, retryAttempt = 0) {
        try {
            const config = {
                method: 'POST',
                url: `${this.apiBaseUrl}/user/nodes/ping`,
                headers: {
                    'Authorization': `Bearer ${account.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                    'Origin': 'chrome-extension://jbmdcnidiaknboflpljihfnbonjgegah',
                    'Sec-Fetch-Dest': 'empty',
                    'Sec-Fetch-Mode': 'cors',
                    'Sec-Fetch-Site': 'none',
                    'Sec-Fetch-Storage-Access': 'active',
                    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${Math.floor(Math.random() * 15) + 100}.0.0.0 Safari/537.36`
                },
                data: { type: 'extension' },
                timeout: 5000
            };
    
            if (account.proxy) {
                config.httpsAgent = new HttpsProxyAgent(account.proxy);
            }
    
            const response = await axios(config);
            
            account.lastPingTimestamp = Date.now();
            
            return {
                statusCode: response.data.statusCode,
                message: response.data.message,
                metadataId: response.data.metadata.id
            };
        } catch (error) {
            this.log(`Ping không thành công: ${error.message}`, 'error');
            throw error;
        }
    }

    async dailyCheckin(token, proxy) {
        try {
            const response = await this.makeRequest(token, '/user/checkin', 'POST', null, proxy);
            return {
                statusCode: response.data.statusCode,
                message: response.data.message,
                userData: response.data.metadata.user
            };
        } catch (error) {
            const statusCode = error.response?.data?.statusCode || error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            throw {
                statusCode,
                message,
                error: true
            };
        }
    }

    async claimTask(token, proxy, taskId) {
        try {
            const response = await this.makeRequest(token, '/user/task', 'POST', { taskId }, proxy);
            return {
                statusCode: response.data.statusCode,
                message: response.data.message,
                userData: response.data.metadata?.user
            };
        } catch (error) {
            const statusCode = error.response?.data?.statusCode || error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            throw {
                statusCode,
                message,
                error: true
            };
        }
    }

    async processTasks(token, proxy, completedTasks) {
        const results = [];
        
        for (const task of this.tasksList) {
            if (!completedTasks.includes(task.code)) {
                try {
                    const result = await this.claimTask(token, proxy, task.code);
                    results.push({
                        code: task.code,
                        name: task.name,
                        status: 'Thành công',
                        statusCode: result.statusCode,
                        message: result.message
                    });
                    this.log(`Nhiệm vụ ${task.code} (${task.name}):`, 'success');
                    this.log(`Trạng thái: ${result.statusCode}`, 'success');
                    this.log(`Thông tin: ${result.message}`, 'success');
                } catch (error) {
                    results.push({
                        code: task.code,
                        name: task.name,
                        status: 'Thất bại',
                        statusCode: error.statusCode,
                        message: error.message
                    });
                    const logType = error.statusCode >= 500 ? 'error' : 'warning';
                    this.log(`Nhiệm vụ ${task.code} (${task.name}):`, logType);
                    this.log(`Trạng thái: ${error.statusCode}`, logType);
                    this.log(`Thông tin: ${error.message}`, logType);
                }
            } else {
                results.push({
                    code: task.code,
                    name: task.name,
                    status: 'Bỏ qua',
                    statusCode: 200,
                    message: 'Nhiệm vụ đã hoàn thành'
                });
                this.log(`Nhiệm vụ ${task.code} (${task.name}): Hoàn thành`);
            }
        }
        
        return results;
    }

    async checkAndDisplayProxyStatus(account) {
        if (account.proxy) {
            try {
                const proxyIP = await this.checkProxyIP(account.proxy);
                this.log(`Proxy IP: ${proxyIP}`, 'custom');
                return true;
            } catch (error) {
                this.log(`Lỗi khi kiểm tra proxy: ${error.message}`, 'error');
                this.log(`Tiếp tục mà không sử dụng proxy`, 'warning');
                return false;
            }
        } else {
            this.log(`Không sử dụng proxy (No Proxy)`, 'warning');
            return false;
        }
    }

    async processPingForAccount(account, index, totalAccounts) {
        try {
            const userInfo = await this.getUserInfo(account.token, account.proxy);
            const now = (new Date()).getDate();
            if (now !== currentDate) {
                await this.dailyCheckin(account.token, account.proxy);
                this.log(`Điểm danh hàng ngày:`, 'success');
                currentDate = now
            }
            this.log(`\nPing: Tài khoản ${userInfo.username}`, 'custom');
            
            await this.checkAndDisplayProxyStatus(account);
            
            const pingResponse = await this.ping(account);
            this.log(`Ping Status:`, 'success');
            this.log(`Trạng thái: ${pingResponse.statusCode}`, 'success');
            this.log(`Thông tin: ${pingResponse.message}`, 'success');
                        
            const updatedUserInfo = await this.getUserInfo(account.token, account.proxy);
            if (updatedUserInfo.nodes.length > 0) {
                this.log('Node status:', 'custom');
                updatedUserInfo.nodes.forEach((node, index) => {
                    this.log(`Node ${index + 1}: Hôm nay nhận được: ${node.todayPoint}`, 'custom');
                });
            }
        } catch (error) {
            this.log(`Lỗi khi Ping tài khoản: ${error.message}`, 'error');
        }
    }

    async start() {
        process.on('SIGINT', () => {
            this.log('\nDừng code...', 'warning');
            this.isRunning = false;
            this.rl.close();
            setTimeout(() => process.exit(0), 1000);
        });
            
        this.log('\n⚡ Bắt đầu Ping...', 'warning');
        while (true) {
            this.log(`\n⏰ Ping bắt đầu từ ${new Date().toLocaleString()}`);
            
            for (let i = 0; i < this.accounts.length; i++) {
                const account = this.accounts[i];
                await this.processPingForAccount(account, i, this.accounts.length);
                
            }
            this.log('\nHoàn thành vòng Ping, chờ 5 phút trước khi bắt đầu vòng lặp tiếp theo...', 'info');
            await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
        }
        
    }
}

const pinger = new NodeGo();
pinger.start();
