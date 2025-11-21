#!/usr/bin/env node
'use strict';

console.log('=== Node.js Process Limits ===');

// Check heap size limits
const v8 = require('v8');
const heapStats = v8.getHeapStatistics();

console.log('\n--- V8 Heap Statistics ---');
console.log(`Total heap size: ${Math.round(heapStats.total_heap_size / 1024 / 1024)}MB`);
console.log(`Total heap size executable: ${Math.round(heapStats.total_heap_size_executable / 1024 / 1024)}MB`);
console.log(`Total physical size: ${Math.round(heapStats.total_physical_size / 1024 / 1024)}MB`);
console.log(`Total available size: ${Math.round(heapStats.total_available_size / 1024 / 1024)}MB`);
console.log(`Used heap size: ${Math.round(heapStats.used_heap_size / 1024 / 1024)}MB`);
console.log(`Heap size limit: ${Math.round(heapStats.heap_size_limit / 1024 / 1024)}MB`);
console.log(`Malloced memory: ${Math.round(heapStats.malloced_memory / 1024 / 1024)}MB`);
console.log(`Peak malloced memory: ${Math.round(heapStats.peak_malloced_memory / 1024 / 1024)}MB`);

// Check process resource usage
console.log('\n--- Process Resource Usage ---');
try {
    const usage = process.resourceUsage();
    console.log(`User CPU time: ${usage.userCPUTime}μs`);
    console.log(`System CPU time: ${usage.systemCPUTime}μs`);
    console.log(`Max RSS: ${Math.round(usage.maxRSS / 1024)}MB`);
    console.log(`Shared memory size: ${Math.round(usage.sharedMemorySize / 1024)}KB`);
    console.log(`Unshared data size: ${Math.round(usage.unsharedDataSize / 1024)}KB`);
    console.log(`Unshared stack size: ${Math.round(usage.unsharedStackSize / 1024)}KB`);
    console.log(`Minor page faults: ${usage.minorPageFault}`);
    console.log(`Major page faults: ${usage.majorPageFault}`);
    console.log(`Swapped out: ${usage.swappedOut}`);
    console.log(`Block input operations: ${usage.fsRead}`);
    console.log(`Block output operations: ${usage.fsWrite}`);
    console.log(`IPC messages sent: ${usage.ipcSent}`);
    console.log(`IPC messages received: ${usage.ipcReceived}`);
    console.log(`Signals received: ${usage.signalsCount}`);
    console.log(`Voluntary context switches: ${usage.voluntaryContextSwitches}`);
    console.log(`Involuntary context switches: ${usage.involuntaryContextSwitches}`);
} catch (error) {
    console.log('Resource usage not available on this platform');
}

// Environment variables that affect memory
console.log('\n--- Node.js Memory Environment ---');
console.log(`NODE_OPTIONS: ${process.env.NODE_OPTIONS || 'not set'}`);
console.log(`--max-old-space-size: ${process.env.NODE_OPTIONS?.includes('--max-old-space-size') ? 'set' : 'not set'}`);

// Check if running with --expose-gc
console.log(`Garbage collection exposed: ${typeof global.gc === 'function'}`);

console.log('\n=== Recommendations ===');
if (heapStats.heap_size_limit < 2000 * 1024 * 1024) {
    console.log('⚠️  Heap size limit is low. Consider running with --max-old-space-size=4096');
}
if (typeof global.gc !== 'function') {
    console.log('💡 Consider running with --expose-gc to enable manual garbage collection');
}

console.log('\n=== Run Commands ===');
console.log('To increase heap size: node --max-old-space-size=4096 your-script.js');
console.log('To enable GC: node --expose-gc your-script.js');
console.log('Combined: node --max-old-space-size=4096 --expose-gc your-script.js');
