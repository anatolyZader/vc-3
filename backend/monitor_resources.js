#!/usr/bin/env node
'use strict';

const os = require('os');
const fs = require('fs');

function formatBytes(bytes) {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
}

function monitorResources() {
    console.log('\n=== System Resource Monitor ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    
    // Memory information
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    console.log('\n--- Memory Usage ---');
    console.log(`Total Memory: ${formatBytes(totalMem)}`);
    console.log(`Used Memory: ${formatBytes(usedMem)} (${Math.round((usedMem / totalMem) * 100)}%)`);
    console.log(`Free Memory: ${formatBytes(freeMem)}`);
    
    // Process memory
    const processMemory = process.memoryUsage();
    console.log('\n--- Process Memory ---');
    console.log(`RSS: ${formatBytes(processMemory.rss)}`);
    console.log(`Heap Used: ${formatBytes(processMemory.heapUsed)}`);
    console.log(`Heap Total: ${formatBytes(processMemory.heapTotal)}`);
    console.log(`External: ${formatBytes(processMemory.external)}`);
    
    // CPU information
    const cpus = os.cpus();
    console.log('\n--- CPU Information ---');
    console.log(`CPU Count: ${cpus.length}`);
    console.log(`CPU Model: ${cpus[0].model}`);
    
    // Load average (Unix/Linux only)
    if (process.platform !== 'win32') {
        const loadAvg = os.loadavg();
        console.log(`Load Average: 1min=${loadAvg[0].toFixed(2)}, 5min=${loadAvg[1].toFixed(2)}, 15min=${loadAvg[2].toFixed(2)}`);
    }
    
    // Check available file descriptors (Linux)
    if (process.platform === 'linux') {
        try {
            const procStatus = fs.readFileSync('/proc/self/status', 'utf8');
            const fdLine = procStatus.split('\n').find(line => line.startsWith('FDSize:'));
            if (fdLine) {
                console.log(`File Descriptors: ${fdLine.split('\t')[1]}`);
            }
        } catch (error) {
            console.log('Could not read file descriptor info');
        }
    }
    
    console.log('================================\n');
}

// Monitor resources every 5 seconds
setInterval(monitorResources, 5000);

// Initial monitoring
monitorResources();

// Handle process termination
process.on('SIGINT', () => {
    console.log('\nResource monitoring stopped.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nResource monitoring terminated.');
    process.exit(0);
});
