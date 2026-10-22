// Stand-in for resources/bundler.mjs in watcher tests: reads the source file
// as soon as it starts, waits `delay=<ms>` if the source contains it, then
// prints what it read.
import * as fs from 'fs';

const source = fs.readFileSync(process.argv[2], 'utf-8');
const delay = Number(source.match(/delay=(\d+)/)?.[1] ?? 0);
setTimeout(() => process.stdout.write(source), delay);
