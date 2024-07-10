const WebSocket = require('ws');
const os = require('os');
const { execSync } = require('child_process');
const path = require('path');
const figlet = require('figlet');

// Simple color function
const color = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    underscore: "\x1b[4m",
    blink: "\x1b[5m",
    reverse: "\x1b[7m",
    hidden: "\x1b[8m",
    
    fg: {
        black: "\x1b[30m",
        red: "\x1b[31m",
        green: "\x1b[32m",
        yellow: "\x1b[33m",
        blue: "\x1b[34m",
        magenta: "\x1b[35m",
        cyan: "\x1b[36m",
        white: "\x1b[37m",
    },
    bg: {
        black: "\x1b[40m",
        red: "\x1b[41m",
        green: "\x1b[42m",
        yellow: "\x1b[43m",
        blue: "\x1b[44m",
        magenta: "\x1b[45m",
        cyan: "\x1b[46m",
        white: "\x1b[47m",
    }
};

const { database, updateDatabase, initDatabase } = require('./database');

function formatMetrics(data) {
    const { creditsEarned, totalUptime } = data;
    const days = Math.floor(totalUptime / 86400);
    const hours = Math.floor((totalUptime % 86400) / 3600);
    const minutes = Math.floor((totalUptime % 3600) / 60);
    
    let uptimeString = '';
    if (days > 0) uptimeString += `${days}d `;
    if (hours > 0 || days > 0) uptimeString += `${hours}h `;
    uptimeString += `${minutes}m`;
    
    return `Credits Earned: ${creditsEarned} | Provider Uptime: ${uptimeString}`;
}

function main() {
    console.clear();
    const asciiArt = figlet.textSync('Nodepay Terminal', { 
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    });

    console.log(`${color.fg.blue}${color.bright}${asciiArt}${color.reset}`);
    console.log(`${color.fg.green}${color.bright}📡 Monitoring Nodepay.ai${color.reset}`);
    console.log(`${color.fg.cyan}👨‍💻 Created by: @kullaniciadi${color.reset}`);
    console.log(`${color.fg.magenta}🔍 Starting Nodepay Terminal script...${color.reset}`);
    console.log();

    initDatabase();
    console.log(`${color.fg.yellow}Database initialized.${color.reset}`);

    let socket;
    let heartbeatInterval;
    let settingsInterval;

    const connectWebSocket = () => {
        console.log(`${color.fg.cyan}Attempting to connect websocket...${color.reset}`);

        if (database.token) {
            if (socket && socket.readyState === WebSocket.OPEN) {
                console.log(`${color.fg.green}WebSocket already connected.${color.reset}`);
                return;
            }

            socket = new WebSocket(`wss://api.nodepay.ai/websocket?token=${database.token}`);

            socket.on('open', () => {
                console.log(`${color.fg.green}${color.bright}WebSocket connection established.${color.reset}`);
                updateDatabase({ stats: { status: 'active' } });
                startHeartbeatInterval();
                startSettingsInterval();
            });

            socket.on('close', (code) => {
                console.log(`${color.fg.red}WebSocket closed with code ${code}.${color.reset}`);
                clearHeartbeatInterval();
                clearSettingsInterval();

                if (code === 1000) {
                    console.log(`${color.fg.yellow}Normal closure, updating database...${color.reset}`);
                    updateDatabase({
                        stats: { status: 'offline' },
                        token: false,
                    });
                    return;
                }

                console.log(`${color.fg.yellow}Unexpected closure, updating status and attempting reconnection...${color.reset}`);
                updateDatabase({ stats: { status: 'offline' } });
                setTimeout(connectWebSocket, 2500);
            });

            socket.on('message', (data) => {
                const message = JSON.parse(data);
                console.log(`${color.fg.blue}${color.bright}Received WebSocket message:${color.reset} ${color.fg.yellow}==>${color.reset} ${color.fg.green}Type: ${message.type}${color.reset}`);
                
                if (message.type === 'serverMetrics') {
                    const formattedMetrics = formatMetrics(message.data);
                    console.log(`${color.fg.cyan}${formattedMetrics}${color.reset}`);
                    console.log(`${color.fg.magenta}Updating database with server metrics...${color.reset}`);
                    updateDatabase({ stats: message.data });
                }
            });
        } else {
            console.log(`${color.fg.red}No token found, please update your token.${color.reset}`);
        }
    };

    const startHeartbeatInterval = () => {
        heartbeatInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                console.log(`${color.fg.yellow}Sending heartbeat...${color.reset}`);
                socket.send(JSON.stringify({ type: 'heartbeat' }));
            }
        }, 30000); // 30 seconds
    };

    const clearHeartbeatInterval = () => {
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
        }
    };

    const startSettingsInterval = () => {
        settingsInterval = setInterval(() => {
            if (socket && socket.readyState === WebSocket.OPEN) {
                const systemMetrics = {
                    type: 'systemMetrics',
                    data: {
                        platform: os.platform(),
                        arch: os.arch(),
                        uptime: os.uptime(),
                        totalmem: os.totalmem(),
                        freemem: os.freemem(),
                        loadavg: os.loadavg(),
                    }
                };
                console.log(`${color.fg.yellow}Sending system metrics...${color.reset}`);
                socket.send(JSON.stringify(systemMetrics));
            }
        }, 60000); // 60 seconds
    };

    const clearSettingsInterval = () => {
        if (settingsInterval) {
            clearInterval(settingsInterval);
        }
    };

    connectWebSocket();
}

main();
